require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

const columns = {
    category: "ENUM('PROTECTION','PLANNED','RECURRING','ASSET','SOCIAL') NULL AFTER description",
    lifecycle_status: "ENUM('ACTIVE','PAUSED','COMPLETED') NOT NULL DEFAULT 'ACTIVE' AFTER category",
    configured_priority: 'TINYINT UNSIGNED NULL AFTER lifecycle_status', target_date: 'DATE NULL AFTER configured_priority',
    refill_enabled: 'BOOLEAN NOT NULL DEFAULT FALSE AFTER target_date', healthy_threshold: 'DECIMAL(4,3) NOT NULL DEFAULT 0.800 AFTER refill_enabled',
    critical_threshold: 'DECIMAL(4,3) NOT NULL DEFAULT 0.500 AFTER healthy_threshold', target_reached_at: 'DATETIME NULL AFTER critical_threshold',
    cycle_type: "ENUM('MONTHLY','YEARLY','CUSTOM') NULL AFTER target_reached_at", cycle_interval: 'SMALLINT UNSIGNED NULL AFTER cycle_type',
    next_due_date: 'DATE NULL AFTER cycle_interval', is_recurring: 'BOOLEAN NOT NULL DEFAULT FALSE AFTER next_due_date',
    milestone_behavior: "ENUM('STOP','CONTINUE') NOT NULL DEFAULT 'STOP' AFTER is_recurring",
    updated_at: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at'
};

async function main() {
    const connection = await mysql.createConnection({ host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,
        database:process.env.DB_NAME,port:process.env.DB_PORT||3306,ssl:process.env.DB_SSL==='true'?{rejectUnauthorized:false}:undefined });
    try {
        const [existing] = await connection.query("SELECT column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='financial_goals'");
        const names = new Set(existing.map(row => row.COLUMN_NAME));
        for (const [name, definition] of Object.entries(columns)) if (!names.has(name)) await connection.query(`ALTER TABLE financial_goals ADD COLUMN ${name} ${definition}`);
        for (const [name, column] of [['idx_financial_goals_category','category'],['idx_financial_goals_status','lifecycle_status']]) {
            const [indexes] = await connection.query("SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='financial_goals' AND index_name=?", [name]);
            if (!indexes.length) await connection.query(`ALTER TABLE financial_goals ADD INDEX ${name} (${column})`);
        }
        await connection.beginTransaction();
        await connection.query("UPDATE financial_goals SET category='ASSET',milestone_behavior='CONTINUE' WHERE title='Investasi & Tabungan Masa Depan 🪙' AND category IS NULL");
        await connection.query("UPDATE financial_goals SET category='PROTECTION',refill_enabled=TRUE WHERE title='Dana Darurat' AND category IS NULL");
        await connection.query('UPDATE financial_goals SET target_reached_at=COALESCE(target_reached_at,created_at) WHERE target_amount>0 AND collected_amount>=target_amount');
        const [unknown] = await connection.query('SELECT id,title FROM financial_goals WHERE category IS NULL');
        await connection.commit();
        console.log(JSON.stringify({ status:'success', requires_manual_mapping:unknown }, null, 2));
    } catch (error) { try { await connection.rollback(); } catch (_rollbackError) { /* no transaction yet */ } throw error; }
    finally { await connection.end(); }
}
main().catch(error => { console.error(error.code, error.message); process.exitCode=1; });
