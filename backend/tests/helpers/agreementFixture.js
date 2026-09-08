const { PNG } = require('pngjs');
const template = require('../../data/agreementTemplate.json');
const { createHash } = require('crypto');
const hash = createHash('sha256').update(JSON.stringify(template)).digest('hex');
function sampleSignature(blank = false) {
    const png = new PNG({ width: 800, height: 240 });
    // Synthetic test strokes, not a person's signature.
    if (!blank) for (let x = 60; x < 720; x++) {
        const y = 120 + Math.round(Math.sin(x / 30) * 45);
        for (let dy = 0; dy < 4; dy++) {
            const index = ((y + dy) * 800 + x) * 4;
            png.data[index] = 20; png.data[index + 1] = 40; png.data[index + 2] = 70; png.data[index + 3] = 255;
        }
    }
    return `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;
}
const users = [
    { id: 1, username: 'zihraangelina', role: 'user' },
    { id: 2, username: 'naufalaufa', role: 'user' },
    { id: 3, username: 'zipaladmin', role: 'admin' },
    { id: 4, username: 'anotheradmin', role: 'admin' }
];
function memoryPool() {
    const state = { agreement: { id: 1, agreement_number: template.number, content_json: template, content_hash: hash, status: 'DRAFT' }, signatures: [] };
    let queue = Promise.resolve();
    function read(sql, values) {
        if (sql.includes('FROM users')) return [[users.find(user => user.id === Number(values[0]))].filter(Boolean)];
        if (sql.includes('FROM agreement_applications')) return [state.signatures.map(signature => ({ ...signature }))];
        if (sql.includes('FROM agreements')) {
            if (sql.includes(' AS pdf')) return [[{ status: state.agreement.status, pdf: state.agreement[sql.includes('final_pdf') ? 'final_pdf' : 'draft_pdf'] }]];
            return [[{ ...state.agreement }]];
        }
        throw new Error('Unexpected read: ' + sql);
    }
    const pool = { promise: () => ({ query: async (sql, values) => read(sql, values), getConnection: async () => {
        let unlock, snapshot;
        return {
            beginTransaction: async () => {},
            async query(sql, values) {
                if (sql.startsWith('SET time_zone')) return [];
                if (sql.includes('FOR UPDATE')) {
                    const previous = queue;
                    queue = new Promise(resolve => { unlock = resolve; });
                    await previous;
                    snapshot = { agreement: { ...state.agreement }, signatures: [...state.signatures] };
                }
                return read(sql, values);
            },
            async execute(sql, values) {
                if (sql.startsWith('INSERT INTO agreement_applications')) {
                    state.signatures.push({ agreement_id: values[0], user_id: values[1], party: values[2], signature_image: values[3], content_hash: values[4], applied: 1, signed_at: new Date().toISOString() });
                } else if (sql.includes("status = 'WAITING_EMETERAI'")) Object.assign(state.agreement, { status: 'WAITING_EMETERAI', approved_by: values[0], approved_at: values[1], draft_pdf: values[2], draft_sha256: values[3] });
                else if (sql.includes("status = 'FINAL'")) Object.assign(state.agreement, { status: 'FINAL', final_pdf: values[0], final_sha256: values[1], finalized_by: values[2], finalized_at: new Date().toISOString() });
                else throw new Error('Unexpected write: ' + sql);
                return [{ affectedRows: 1 }];
            },
            async commit() { if (unlock) { unlock(); unlock = null; } },
            async rollback() { if (snapshot) Object.assign(state, snapshot); if (unlock) { unlock(); unlock = null; } },
            release() {}
        };
    } }) };
    return { pool, state };
}
module.exports = { sampleSignature, memoryPool, users, hash, template };
