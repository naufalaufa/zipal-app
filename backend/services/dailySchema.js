const categories = [
    ['FOOD','Makan','ShopOutlined',1], ['BATH','Kebutuhan Mandi','SkinOutlined',2],
    ['INTERNET','Internet','WifiOutlined',3], ['WATER','Air','CloudOutlined',4],
    ['ELECTRICITY','Listrik','ThunderboltOutlined',5], ['SKINCARE','Skincare','StarOutlined',6],
    ['TRANSPORT','Transportasi','CarOutlined',7], ['LAUNDRY','Laundry','InboxOutlined',8],
    ['TOILETRIES','Toiletries','AppstoreOutlined',9], ['SNACKS','Jajan','CoffeeOutlined',10],
    ['OTHER','Lainnya','MoreOutlined',11],
];

let schemaPromise;
const ensureDailySchema = pool => {
    if (schemaPromise) return schemaPromise;
    schemaPromise = (async () => {
        const db = pool.promise();
        await db.query(`CREATE TABLE IF NOT EXISTS daily_categories (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, code VARCHAR(40) NOT NULL,
            name VARCHAR(100) NOT NULL, icon VARCHAR(50) NOT NULL, display_order TINYINT UNSIGNED NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_daily_categories_code (code), UNIQUE KEY uq_daily_categories_name (name),
            INDEX idx_daily_categories_active_order (is_active,display_order)
        ) ENGINE=InnoDB`);
        await db.query(`CREATE TABLE IF NOT EXISTS daily_ledger_lock (
            id TINYINT UNSIGNED NOT NULL PRIMARY KEY, lock_name VARCHAR(40) NOT NULL UNIQUE
        ) ENGINE=InnoDB`);
        await db.query("INSERT IGNORE INTO daily_ledger_lock (id,lock_name) VALUES (1,'shared-daily-wallet')");
        await db.query(`CREATE TABLE IF NOT EXISTS daily_transactions (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, type ENUM('CREDIT','EXPENSE') NOT NULL,
            category_id INT UNSIGNED NULL, amount DECIMAL(15,2) NOT NULL, description VARCHAR(255) NOT NULL,
            notes TEXT NULL, transaction_date DATE NOT NULL, created_by INT NOT NULL,
            created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            CONSTRAINT fk_daily_transaction_category FOREIGN KEY (category_id) REFERENCES daily_categories(id) ON DELETE RESTRICT,
            CONSTRAINT fk_daily_transaction_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
            INDEX idx_daily_transactions_date (transaction_date,id), INDEX idx_daily_transactions_type_date (type,transaction_date),
            INDEX idx_daily_transactions_category_date (category_id,transaction_date), INDEX idx_daily_transactions_created_by (created_by)
        ) ENGINE=InnoDB`);
        await db.query(`CREATE TABLE IF NOT EXISTS daily_budgets (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, category_id INT UNSIGNED NOT NULL,
            budget_year SMALLINT UNSIGNED NOT NULL, budget_month TINYINT UNSIGNED NOT NULL,
            budget_amount DECIMAL(15,2) NOT NULL DEFAULT 0, updated_by INT NOT NULL,
            created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            CONSTRAINT fk_daily_budget_category FOREIGN KEY (category_id) REFERENCES daily_categories(id) ON DELETE RESTRICT,
            CONSTRAINT fk_daily_budget_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT,
            UNIQUE KEY uq_daily_budget_period (category_id,budget_year,budget_month),
            INDEX idx_daily_budgets_period (budget_year,budget_month)
        ) ENGINE=InnoDB`);
        for (const item of categories) await db.query(`INSERT INTO daily_categories (code,name,icon,display_order)
            VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),icon=VALUES(icon),display_order=VALUES(display_order)`, item);

        const [columns] = await db.query("SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='financial_goals' AND column_name='purpose_code'");
        if (!columns.length) await db.query('ALTER TABLE financial_goals ADD COLUMN purpose_code VARCHAR(80) NULL AFTER title');
        const [indexes] = await db.query("SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='financial_goals' AND index_name='uq_financial_goals_purpose_code'");
        if (!indexes.length) await db.query('ALTER TABLE financial_goals ADD UNIQUE INDEX uq_financial_goals_purpose_code (purpose_code)');
        await db.query(`UPDATE financial_goals SET purpose_code='EMERGENCY_HOME_OPERATIONS_1Y'
            WHERE purpose_code IS NULL AND LOWER(TRIM(title))=LOWER(?) LIMIT 1`, ['Dana Operasional Darurat Rumah 1 Tahun']);
    })().catch(error => { schemaPromise = undefined; throw error; });
    return schemaPromise;
};

module.exports = { ensureDailySchema };
