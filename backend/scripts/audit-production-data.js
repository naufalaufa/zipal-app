require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const { createAgreementStore } = require('../services/agreementStore');

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME, port: process.env.DB_PORT || 3306,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });
    try {
        const [tables] = await connection.query("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('transactions','financial_goals','agreements','agreement_applications')");
        const [columns] = await connection.query("SELECT table_name, column_name, column_type FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name IN ('transactions','financial_goals','agreements','agreement_applications') ORDER BY table_name, ordinal_position");
        const [transactionCount] = await connection.query('SELECT COUNT(*) AS count, MIN(id) AS first_id, MAX(id) AS last_id FROM transactions');
        const [goalCount] = await connection.query('SELECT COUNT(*) AS count FROM financial_goals');
        const [agreementRows] = await connection.query('SELECT id, agreement_number, status, JSON_VALID(content_json) AS content_valid, OCTET_LENGTH(content_json) AS content_bytes FROM agreements');
        let agreementQuery = { ok: true };
        try {
            const [statusRows] = await connection.query('SELECT id, agreement_number, content_json, content_hash, status, DATE_FORMAT(approved_at, "%Y-%m-%dT%H:%i:%s.%fZ") AS approved_at, DATE_FORMAT(finalized_at, "%Y-%m-%dT%H:%i:%s.%fZ") AS finalized_at FROM agreements WHERE id = 1');
            agreementQuery.rows = statusRows.length;
        } catch (error) { agreementQuery = { ok: false, code: error.code, message: error.message }; }
        const [members] = await connection.query("SELECT id, username, role FROM users WHERE username IN ('zihraangelina','naufalaufa','zipaladmin')");
        const callbackPool = require('../config/db');
        const store = createAgreementStore(callbackPool);
        const agreementStatuses = [];
        for (const member of members) {
            try { const status = await store.status(member); agreementStatuses.push({ username: member.username, ok: true, status: status.status }); }
            catch (error) { agreementStatuses.push({ username: member.username, ok: false, code: error.code, message: error.message }); }
        }
        callbackPool.end();
        console.log(JSON.stringify({ tables, columns, transactions: transactionCount[0], goals: goalCount[0], agreements: agreementRows, agreementQuery, agreementStatuses }, null, 2));
    } finally { await connection.end(); }
}
main().catch(error => { console.error(error.code, error.message); process.exitCode = 1; });
