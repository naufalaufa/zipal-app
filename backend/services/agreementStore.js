const { createHash } = require('crypto');
const { fail, assertMember, assertSign, assertApprove, assertFinalize } = require('./agreementPolicy');
const { validateSignature, validateFinalPdf } = require('./agreementFiles');
const { generateAgreementPdf } = require('./agreementPdf');
const { ensureAgreementSchema } = require('./productionSchema');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const AGREEMENT_ID = 1;
const iso = value => value ? new Date(value).toISOString() : null;

function createAgreementStore(pool, generatePdf = generateAgreementPdf) {
    async function lock(action) {
        const connection = await pool.promise().getConnection();
        try {
            await connection.query("SET time_zone = '+00:00'");
            await connection.beginTransaction();
            const [rows] = await connection.query('SELECT * FROM agreements WHERE id = ? FOR UPDATE', [AGREEMENT_ID]);
            if (!rows[0]) throw fail('Agreement belum tersedia. Jalankan migration Agreement.', 503);
            const [signatures] = await connection.query('SELECT *, DATE_FORMAT(signed_at, "%Y-%m-%dT%H:%i:%s.%fZ") AS signed_at FROM agreement_applications WHERE agreement_id = ?', [AGREEMENT_ID]);
            const result = await action(connection, rows[0], signatures);
            await connection.commit();
            return result;
        } catch (error) { await connection.rollback(); throw error; }
        finally { connection.release(); }
    }
    async function status(user) {
        assertMember(user);
        let rows;
        try {
            [rows] = await pool.promise().query('SELECT id, agreement_number, content_json, content_hash, status, DATE_FORMAT(approved_at, "%Y-%m-%dT%H:%i:%s.%fZ") AS approved_at, DATE_FORMAT(finalized_at, "%Y-%m-%dT%H:%i:%s.%fZ") AS finalized_at FROM agreements WHERE id = ?', [AGREEMENT_ID]);
        } catch (error) {
            if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
            await ensureAgreementSchema(pool);
            [rows] = await pool.promise().query('SELECT id, agreement_number, content_json, content_hash, status, DATE_FORMAT(approved_at, "%Y-%m-%dT%H:%i:%s.%fZ") AS approved_at, DATE_FORMAT(finalized_at, "%Y-%m-%dT%H:%i:%s.%fZ") AS finalized_at FROM agreements WHERE id = ?', [AGREEMENT_ID]);
        }
        if (!rows[0]) {
            await ensureAgreementSchema(pool);
            [rows] = await pool.promise().query('SELECT id, agreement_number, content_json, content_hash, status, DATE_FORMAT(approved_at, "%Y-%m-%dT%H:%i:%s.%fZ") AS approved_at, DATE_FORMAT(finalized_at, "%Y-%m-%dT%H:%i:%s.%fZ") AS finalized_at FROM agreements WHERE id = ?', [AGREEMENT_ID]);
        }
        if (!rows[0]) throw fail('Agreement belum tersedia. Jalankan migration Agreement.', 503);
        let signatures;
        try {
            [signatures] = await pool.promise().query('SELECT user_id, party, applied, signature_image, DATE_FORMAT(signed_at, "%Y-%m-%dT%H:%i:%s.%fZ") AS signed_at FROM agreement_applications WHERE agreement_id = ?', [AGREEMENT_ID]);
        } catch (error) {
            if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
            await ensureAgreementSchema(pool);
            [signatures] = await pool.promise().query('SELECT user_id, party, applied, signature_image, DATE_FORMAT(signed_at, "%Y-%m-%dT%H:%i:%s.%fZ") AS signed_at FROM agreement_applications WHERE agreement_id = ?', [AGREEMENT_ID]);
        }
        const agreement = rows[0];
        return { ...agreement, content: typeof agreement.content_json === 'string' ? JSON.parse(agreement.content_json) : agreement.content_json, content_json: undefined, signatures, viewer: user };
    }
    async function sign(user, input) {
        const image = validateSignature(input.signatureImage);
        return lock(async (connection, agreement, signatures) => {
            const party = assertSign(user, agreement, signatures, input.user_id);
            if ((input.party && input.party !== party) || (input.username && input.username !== user.username)) throw fail('Tidak dapat Apply tanda tangan pihak lain.', 403);
            if (input.agreement_id !== AGREEMENT_ID || input.content_hash !== agreement.content_hash || input.consent !== true) throw fail('Baca dan setujui versi perjanjian terbaru sebelum Apply.', 409);
            await connection.execute('INSERT INTO agreement_applications (agreement_id, user_id, party, signature_image, applied, content_hash) VALUES (?, ?, ?, ?, 1, ?)', [AGREEMENT_ID, user.id, party, image, agreement.content_hash]);
        });
    }
    async function approve(user) {
        return lock(async (connection, agreement, signatures) => {
            assertApprove(user, agreement, signatures);
            if (signatures.some(signature => signature.content_hash !== agreement.content_hash)) throw fail('Versi tanda tangan tidak sesuai isi perjanjian.', 409);
            const approvedAt = new Date();
            const content = typeof agreement.content_json === 'string' ? JSON.parse(agreement.content_json) : agreement.content_json;
            const pdf = await generatePdf({ content, number: agreement.agreement_number, signatures, approvedAt });
            await connection.execute("UPDATE agreements SET status = 'WAITING_EMETERAI', approved_by = ?, approved_at = ?, draft_pdf = ?, draft_sha256 = ? WHERE id = ?", [user.id, iso(approvedAt).replace('T', ' ').replace('Z', ''), pdf, sha256(pdf), AGREEMENT_ID]);
        });
    }
    async function finalize(user, file, confirmed) {
        if (confirmed !== 'true') throw fail('Konfirmasi bahwa dokumen sudah diperiksa dan dibubuhi e-Meterai.');
        const bytes = await validateFinalPdf(file);
        return lock(async (connection, agreement) => {
            assertFinalize(user, agreement);
            if (sha256(bytes) === agreement.draft_sha256) throw fail('File sama dengan PDF sebelum e-Meterai. Pilih hasil unduhan dari EZMeterai.');
            await connection.execute("UPDATE agreements SET status = 'FINAL', final_pdf = ?, final_sha256 = ?, finalized_by = ?, finalized_at = UTC_TIMESTAMP(3) WHERE id = ?", [bytes, sha256(bytes), user.id, AGREEMENT_ID]);
        });
    }
    async function download(user, variant) {
        assertMember(user);
        if (!['draft', 'final'].includes(variant)) throw fail('Jenis dokumen tidak valid.');
        const [rows] = await pool.promise().query(`SELECT status, ${variant}_pdf AS pdf FROM agreements WHERE id = ?`, [AGREEMENT_ID]);
        const row = rows[0];
        if (!row?.pdf || row.status === 'DRAFT' || (variant === 'final' && row.status !== 'FINAL')) throw fail('Dokumen belum tersedia.', 404);
        return row.pdf;
    }
    return { status, sign, approve, finalize, download };
}
module.exports = { createAgreementStore };
