require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME, port: process.env.DB_PORT || 3306,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });
    try {
        const [transactions] = await connection.query('SELECT * FROM transactions ORDER BY id');
        const [goals] = await connection.query('SELECT * FROM financial_goals ORDER BY id');
        const [agreements] = await connection.query('SELECT * FROM agreements ORDER BY id');
        const [applications] = await connection.query('SELECT * FROM agreement_applications ORDER BY id');
        const backupDir = path.join(__dirname, '../../tmp/database-backups');
        fs.mkdirSync(backupDir, { recursive: true });
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const output = path.join(backupDir, `critical-data-${stamp}.json`);
        fs.writeFileSync(output, JSON.stringify({ created_at: new Date().toISOString(), transactions, goals, agreements, applications }, (_key, value) => Buffer.isBuffer(value) ? { type: 'Buffer', data: [...value] } : value, 2));
        console.log(`${output}\n${transactions.length} transaksi dicadangkan.`);
    } finally { await connection.end(); }
}
main().catch(error => { console.error('Backup gagal:', error.message); process.exitCode = 1; });
