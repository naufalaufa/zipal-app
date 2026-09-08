require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME, port: process.env.DB_PORT || 3306,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });
    try {
        const [columns] = await connection.query("SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'transactions' AND column_name = 'goal_id'");
        if (!columns.length) await connection.query('ALTER TABLE transactions ADD COLUMN goal_id INT NULL');
        const [indexes] = await connection.query("SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'transactions' AND index_name = 'idx_transactions_goal_id'");
        if (!indexes.length) await connection.query('ALTER TABLE transactions ADD INDEX idx_transactions_goal_id (goal_id)');
        const [constraints] = await connection.query("SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND table_name = 'transactions' AND constraint_name = 'fk_transactions_goal'");
        if (!constraints.length) await connection.query('ALTER TABLE transactions ADD CONSTRAINT fk_transactions_goal FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE RESTRICT');
        console.log('Migration transaksi-goal selesai; seluruh transaksi lama dipertahankan.');
    } finally { await connection.end(); }
}
main().catch(error => { console.error('Migration gagal:', error.message); process.exitCode = 1; });
