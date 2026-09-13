const test = require('node:test');
const assert = require('node:assert/strict');
const template = require('../data/agreementTemplate.json');
const { syncAgreementTemplate, LEGACY_PENALTY_AGREEMENT_HASH } = require('../services/productionSchema');

test('agreement returns funds by recorded contribution without equal split or forfeiture', () => {
    const separation = template.clauses.find(clause => clause.title.startsWith('Pasal 4:'));
    const infidelity = template.clauses.find(clause => clause.title.startsWith('Pasal 7:'));

    assert.ok(separation?.content.includes('sesuai dengan jumlah total nominal yang telah disetorkan'));
    assert.doesNotMatch(separation.content, /setoran dianggap lebur|dibagi rata/i);
    assert.ok(infidelity?.content.includes('berdasarkan jumlah total nominal kontribusi'));
    assert.match(infidelity.content, /Tidak berlaku pembagian rata 50:50/i);
    assert.doesNotMatch(infidelity.content, /Kehilangan hak|dana denda|dialihkan sepenuhnya/i);
});

test('authorized legacy signature reset is archived atomically before the contribution wording is activated', async () => {
    const active = [{ id:7, agreement_id:1, user_id:2, party:'naufal', signature_image:'data:image/png;base64,test', applied:1,
        content_hash:LEGACY_PENALTY_AGREEMENT_HASH, signed_at:'2026-09-13 07:38:00.000', created_at:'2026-09-13 07:38:00.000' }];
    const archived = [];
    const agreement = { id:1, status:'DRAFT', content_hash:LEGACY_PENALTY_AGREEMENT_HASH };
    const connection = {
        async beginTransaction() {},
        async query(sql, values = []) {
            if (sql.startsWith('SELECT id,status,content_hash')) return [[{ ...agreement }]];
            if (sql.startsWith('SELECT COUNT(*) count FROM agreement_applications')) return [[{ count:active.length }]];
            if (sql.startsWith('INSERT IGNORE INTO agreement_application_revisions')) { archived.splice(0, archived.length, ...active.map(item => ({ ...item, revoke_reason:values[0] }))); return [{ affectedRows:active.length }]; }
            if (sql.startsWith('SELECT COUNT(*) count FROM agreement_application_revisions')) return [[{ count:archived.filter(item => item.content_hash === values[0]).length }]];
            if (sql.startsWith('DELETE FROM agreement_applications')) { active.splice(0); return [{ affectedRows:1 }]; }
            if (sql.startsWith('UPDATE agreements SET')) { Object.assign(agreement, { agreement_number:values[0], content_json:values[1], content_hash:values[2] }); return [{ affectedRows:1 }]; }
            throw new Error(`Unexpected transaction query: ${sql}`);
        },
        async commit() {}, async rollback() {}, release() {}
    };
    const pool = { promise:() => ({
        query:async sql => { assert.match(sql, /^CREATE TABLE IF NOT EXISTS agreement_application_revisions/); return [[], []]; },
        getConnection:async () => connection
    }) };

    const result = await syncAgreementTemplate(pool, agreement, active);
    assert.equal(result.revokedSignatureCount, 1);
    assert.equal(active.length, 0);
    assert.equal(archived.length, 1);
    assert.equal(archived[0].content_hash, LEGACY_PENALTY_AGREEMENT_HASH);
    assert.notEqual(agreement.content_hash, LEGACY_PENALTY_AGREEMENT_HASH);
    assert.match(JSON.parse(agreement.content_json).clauses[6].content, /Tidak berlaku pembagian rata 50:50/i);
});
