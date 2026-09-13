require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { createHash } = require('crypto');
const template = require('../data/agreementTemplate.json');

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME, port: process.env.DB_PORT || 3306,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });
    try {
        const sql = fs.readFileSync(path.join(__dirname, '../migrations/002-agreement-workflow.sql'), 'utf8');
        for (const statement of sql.split(';').filter(part => part.trim())) await connection.query(statement);
        const content = JSON.stringify(template);
        const contentHash = createHash('sha256').update(content).digest('hex');
        await connection.execute('INSERT IGNORE INTO agreements (id, agreement_number, content_json, content_hash) VALUES (1, ?, ?, ?)', [template.number, content, contentHash]);
        const [result] = await connection.execute(`UPDATE agreements agreement
            SET agreement_number = ?, content_json = ?, content_hash = ?
            WHERE agreement.id = 1 AND agreement.status = 'DRAFT' AND agreement.content_hash <> ?
              AND NOT EXISTS (SELECT 1 FROM agreement_applications application WHERE application.agreement_id = agreement.id)`,
        [template.number, content, contentHash, contentHash]);
        console.log(result.affectedRows ? 'Agreement DRAFT diperbarui ke naskah terbaru.' : 'Agreement migration selesai. Versi terkunci atau naskah yang sama tidak ditimpa.');
    } finally { await connection.end(); }
}
main().catch(error => { console.error('Migration gagal:', error.message); process.exitCode = 1; });
