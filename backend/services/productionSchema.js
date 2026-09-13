const { createHash } = require('crypto');
const template = require('../data/agreementTemplate.json');

let agreementPromise;
let transactionPromise;
let financialGoalPromise;
const LEGACY_PENALTY_AGREEMENT_HASH = '477f47f4de72bdb8d848de13acb99ce33138f7b9fadb64321b7813164b019de9';
const agreementTemplateSnapshot = () => {
    const content = JSON.stringify(template);
    return { agreementNumber:template.number, content, contentHash:createHash('sha256').update(content).digest('hex') };
};
const syncAgreementTemplate = async (pool, agreement, signatures = []) => {
    const snapshot = agreementTemplateSnapshot();
    if (agreement?.status !== 'DRAFT' || agreement.content_hash === snapshot.contentHash) return null;
    if (signatures.length && agreement.content_hash !== LEGACY_PENALTY_AGREEMENT_HASH) return null;
    if (signatures.length) {
        const db = pool.promise();
        await db.query(`CREATE TABLE IF NOT EXISTS agreement_application_revisions (
            archive_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            original_application_id BIGINT UNSIGNED NOT NULL,
            agreement_id BIGINT UNSIGNED NOT NULL,
            user_id BIGINT UNSIGNED NOT NULL,
            party ENUM('zihra','naufal') NOT NULL,
            signature_image MEDIUMTEXT NOT NULL,
            applied BOOLEAN NOT NULL,
            content_hash CHAR(64) NOT NULL,
            signed_at DATETIME(3) NOT NULL,
            created_at DATETIME(3) NOT NULL,
            revoked_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            revoke_reason VARCHAR(255) NOT NULL,
            UNIQUE KEY uq_archived_agreement_application (original_application_id, content_hash)
        ) ENGINE=InnoDB`);
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [lockedRows] = await connection.query('SELECT id,status,content_hash FROM agreements WHERE id=1 FOR UPDATE');
            const current = lockedRows[0];
            if (current?.status !== 'DRAFT' || current.content_hash !== LEGACY_PENALTY_AGREEMENT_HASH) {
                await connection.rollback();
                return null;
            }
            const [activeRows] = await connection.query('SELECT COUNT(*) count FROM agreement_applications WHERE agreement_id=1');
            const activeCount = Number(activeRows[0]?.count || 0);
            await connection.query(`INSERT IGNORE INTO agreement_application_revisions
                (original_application_id,agreement_id,user_id,party,signature_image,applied,content_hash,signed_at,created_at,revoke_reason)
                SELECT id,agreement_id,user_id,party,signature_image,applied,content_hash,signed_at,created_at,?
                FROM agreement_applications WHERE agreement_id=1`,
            ['Naskah direvisi: pembagian dana diubah agar mengikuti total kontribusi masing-masing pihak.']);
            const [archivedRows] = await connection.query('SELECT COUNT(*) count FROM agreement_application_revisions WHERE agreement_id=1 AND content_hash=?', [LEGACY_PENALTY_AGREEMENT_HASH]);
            if (Number(archivedRows[0]?.count || 0) < activeCount) throw new Error('Arsip tanda tangan lama belum lengkap; revisi Agreement dibatalkan.');
            await connection.query('DELETE FROM agreement_applications WHERE agreement_id=1');
            await connection.query(`UPDATE agreements SET agreement_number=?,content_json=?,content_hash=?
                WHERE id=1 AND status='DRAFT' AND content_hash=?`,
            [snapshot.agreementNumber, snapshot.content, snapshot.contentHash, LEGACY_PENALTY_AGREEMENT_HASH]);
            await connection.commit();
            return { ...snapshot, revokedSignatureCount:activeCount };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally { connection.release(); }
    }
    const [result] = await pool.promise().execute(`UPDATE agreements agreement
        SET agreement_number = ?, content_json = ?, content_hash = ?
        WHERE agreement.id = 1 AND agreement.status = 'DRAFT' AND agreement.content_hash <> ?
          AND NOT EXISTS (SELECT 1 FROM agreement_applications application WHERE application.agreement_id = agreement.id)`,
    [snapshot.agreementNumber, snapshot.content, snapshot.contentHash, snapshot.contentHash]);
    return result.affectedRows ? { ...snapshot, revokedSignatureCount:0 } : null;
};
const ensureAgreementSchema = pool => {
    if (agreementPromise) return agreementPromise;
    agreementPromise = (async () => {
        const db = pool.promise();
        await db.query(`CREATE TABLE IF NOT EXISTS agreements (
            id BIGINT UNSIGNED NOT NULL PRIMARY KEY, agreement_number VARCHAR(100) NOT NULL UNIQUE,
            content_json JSON NOT NULL, content_hash CHAR(64) NOT NULL,
            status ENUM('DRAFT','WAITING_EMETERAI','FINAL') NOT NULL DEFAULT 'DRAFT',
            approved_by BIGINT UNSIGNED NULL, approved_at DATETIME(3) NULL,
            draft_pdf MEDIUMBLOB NULL, draft_sha256 CHAR(64) NULL,
            final_pdf MEDIUMBLOB NULL, final_sha256 CHAR(64) NULL,
            finalized_by BIGINT UNSIGNED NULL, finalized_at DATETIME(3) NULL,
            created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
        ) ENGINE=InnoDB`);
        await db.query(`CREATE TABLE IF NOT EXISTS agreement_applications (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            agreement_id BIGINT UNSIGNED NOT NULL, user_id BIGINT UNSIGNED NOT NULL,
            party ENUM('zihra','naufal') NOT NULL, signature_image MEDIUMTEXT NOT NULL,
            applied BOOLEAN NOT NULL DEFAULT TRUE, content_hash CHAR(64) NOT NULL,
            signed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            UNIQUE KEY uq_agreement_party (agreement_id, party),
            UNIQUE KEY uq_agreement_user (agreement_id, user_id),
            CONSTRAINT fk_application_agreement FOREIGN KEY (agreement_id) REFERENCES agreements(id) ON DELETE RESTRICT
        ) ENGINE=InnoDB`);
        const snapshot = agreementTemplateSnapshot();
        const [insert] = await db.execute('INSERT IGNORE INTO agreements (id, agreement_number, content_json, content_hash) VALUES (1, ?, ?, ?)', [snapshot.agreementNumber, snapshot.content, snapshot.contentHash]);
        if (!insert.affectedRows) {
            const [rows] = await db.query('SELECT status,content_hash FROM agreements WHERE id=1');
            const [signatures] = await db.query('SELECT id FROM agreement_applications WHERE agreement_id=1 LIMIT 1');
            await syncAgreementTemplate(pool, rows[0], signatures);
        }
    })().catch(error => { agreementPromise = undefined; throw error; });
    return agreementPromise;
};

const ensureTransactionGoalSchema = pool => {
    if (transactionPromise) return transactionPromise;
    transactionPromise = (async () => {
        const db = pool.promise();
        const [columns] = await db.query("SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'transactions' AND column_name = 'goal_id'");
        if (!columns.length) await db.query('ALTER TABLE transactions ADD COLUMN goal_id INT NULL');
        const [indexes] = await db.query("SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'transactions' AND index_name = 'idx_transactions_goal_id'");
        if (!indexes.length) await db.query('ALTER TABLE transactions ADD INDEX idx_transactions_goal_id (goal_id)');
        const [constraints] = await db.query("SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND table_name = 'transactions' AND constraint_name = 'fk_transactions_goal'");
        if (!constraints.length) await db.query('ALTER TABLE transactions ADD CONSTRAINT fk_transactions_goal FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE RESTRICT');
    })().catch(error => { transactionPromise = undefined; throw error; });
    return transactionPromise;
};

const ensureFinancialGoalSchema = pool => {
    if (financialGoalPromise) return financialGoalPromise;
    financialGoalPromise = (async () => {
        const db = pool.promise();
        const definitions = {
            category: "ENUM('PROTECTION','PLANNED','RECURRING','ASSET','SOCIAL') NULL",
            lifecycle_status: "ENUM('ACTIVE','PAUSED','COMPLETED') NOT NULL DEFAULT 'ACTIVE'",
            configured_priority: 'TINYINT UNSIGNED NULL', display_order: 'INT UNSIGNED NULL', target_date: 'DATE NULL',
            refill_enabled: 'BOOLEAN NOT NULL DEFAULT FALSE', healthy_threshold: 'DECIMAL(4,3) NOT NULL DEFAULT 0.800',
            critical_threshold: 'DECIMAL(4,3) NOT NULL DEFAULT 0.500', target_reached_at: 'DATETIME NULL',
            cycle_type: "ENUM('MONTHLY','YEARLY','CUSTOM') NULL", cycle_interval: 'SMALLINT UNSIGNED NULL', next_due_date: 'DATE NULL',
            is_recurring: 'BOOLEAN NOT NULL DEFAULT FALSE', milestone_behavior: "ENUM('STOP','CONTINUE') NOT NULL DEFAULT 'STOP'",
            updated_at: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        };
        const [columns] = await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='financial_goals'");
        const existing = new Set(columns.map(row => row.COLUMN_NAME));
        const missing = Object.entries(definitions).filter(([name]) => !existing.has(name));
        if (missing.length) await db.query(`ALTER TABLE financial_goals ${missing.map(([name, definition]) => `ADD COLUMN ${name} ${definition}`).join(', ')}`);

        const { LEGACY_CATEGORY_MAPPINGS } = require('../domain/financialGoals');
        for (const [category, titles] of Object.entries(LEGACY_CATEGORY_MAPPINGS)) {
            if (!titles.length) continue;
            const placeholders = titles.map(() => '?').join(',');
            await db.query(`UPDATE financial_goals SET category=?,
                refill_enabled=CASE WHEN ?='PROTECTION' THEN TRUE ELSE refill_enabled END,
                is_recurring=CASE WHEN ?='RECURRING' THEN TRUE ELSE is_recurring END,
                milestone_behavior=CASE WHEN ?='ASSET' THEN 'CONTINUE' ELSE milestone_behavior END
                WHERE category IS NULL AND title IN (${placeholders})`, [category, category, category, category, ...titles]);
        }

        // Isi hanya goal lama yang belum punya posisi, sehingga urutan manual yang sudah ada tetap aman.
        const [maximumRows] = await db.query('SELECT COALESCE(MAX(display_order),0) maximum_order FROM financial_goals');
        let nextOrder = Number(maximumRows[0]?.maximum_order || 0);
        const [unorderedGoals] = await db.query(`SELECT id FROM financial_goals WHERE display_order IS NULL
            ORDER BY configured_priority IS NULL,configured_priority,id`);
        for (const goal of unorderedGoals) {
            nextOrder += 1;
            await db.query('UPDATE financial_goals SET display_order=?,updated_at=updated_at WHERE id=? AND display_order IS NULL', [nextOrder, goal.id]);
        }

        const [indexes] = await db.query("SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='financial_goals' AND index_name='idx_financial_goals_display_order'");
        if (!indexes.length) await db.query('ALTER TABLE financial_goals ADD INDEX idx_financial_goals_display_order (display_order)');
        await db.query('UPDATE financial_goals SET target_reached_at=COALESCE(target_reached_at,created_at) WHERE target_amount>0 AND collected_amount>=target_amount');
        return { hasUpdatedAt:true };
    })().catch(error => { financialGoalPromise = undefined; throw error; });
    return financialGoalPromise;
};

module.exports = { ensureAgreementSchema, ensureTransactionGoalSchema, ensureFinancialGoalSchema, syncAgreementTemplate, LEGACY_PENALTY_AGREEMENT_HASH };
