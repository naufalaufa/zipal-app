-- Daily is an independent shared wallet. This migration is additive and never
-- touches the existing transactions table or Cash Available calculation.
CREATE TABLE IF NOT EXISTS daily_categories (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(40) NOT NULL,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    display_order TINYINT UNSIGNED NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_daily_categories_code (code),
    UNIQUE KEY uq_daily_categories_name (name),
    INDEX idx_daily_categories_active_order (is_active, display_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS daily_ledger_lock (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    lock_name VARCHAR(40) NOT NULL UNIQUE
) ENGINE=InnoDB;

INSERT IGNORE INTO daily_ledger_lock (id, lock_name) VALUES (1, 'shared-daily-wallet');

CREATE TABLE IF NOT EXISTS daily_transactions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    type ENUM('CREDIT','EXPENSE') NOT NULL,
    category_id INT UNSIGNED NULL,
    amount DECIMAL(15,2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    notes TEXT NULL,
    transaction_date DATE NOT NULL,
    created_by INT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT chk_daily_transaction_amount CHECK (amount > 0),
    CONSTRAINT chk_daily_transaction_category CHECK (
        type = 'CREDIT' OR
        (type = 'EXPENSE' AND category_id IS NOT NULL)
    ),
    CONSTRAINT fk_daily_transaction_category FOREIGN KEY (category_id) REFERENCES daily_categories(id) ON DELETE RESTRICT,
    CONSTRAINT fk_daily_transaction_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_daily_transactions_date (transaction_date, id),
    INDEX idx_daily_transactions_type_date (type, transaction_date),
    INDEX idx_daily_transactions_category_date (category_id, transaction_date),
    INDEX idx_daily_transactions_created_by (created_by)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS daily_budgets (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    category_id INT UNSIGNED NOT NULL,
    budget_year SMALLINT UNSIGNED NOT NULL,
    budget_month TINYINT UNSIGNED NOT NULL,
    budget_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    updated_by INT NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT chk_daily_budget_month CHECK (budget_month BETWEEN 1 AND 12),
    CONSTRAINT chk_daily_budget_amount CHECK (budget_amount >= 0),
    CONSTRAINT fk_daily_budget_category FOREIGN KEY (category_id) REFERENCES daily_categories(id) ON DELETE RESTRICT,
    CONSTRAINT fk_daily_budget_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_daily_budget_period (category_id, budget_year, budget_month),
    INDEX idx_daily_budgets_period (budget_year, budget_month)
) ENGINE=InnoDB;

INSERT IGNORE INTO daily_categories (code, name, icon, display_order) VALUES
('FOOD', 'Makan', 'ShopOutlined', 1),
('BATH', 'Kebutuhan Mandi', 'SkinOutlined', 2),
('INTERNET', 'Internet', 'WifiOutlined', 3),
('WATER', 'Air', 'CloudOutlined', 4),
('ELECTRICITY', 'Listrik', 'ThunderboltOutlined', 5),
('SKINCARE', 'Skincare', 'StarOutlined', 6),
('TRANSPORT', 'Transportasi', 'CarOutlined', 7),
('LAUNDRY', 'Laundry', 'InboxOutlined', 8),
('TOILETRIES', 'Toiletries', 'AppstoreOutlined', 9),
('SNACKS', 'Jajan', 'CoffeeOutlined', 10),
('OTHER', 'Lainnya', 'MoreOutlined', 11);

-- A stable code lets Daily reference the Purpose even if its title is renamed.
ALTER TABLE financial_goals ADD COLUMN purpose_code VARCHAR(80) NULL AFTER title;
CREATE UNIQUE INDEX uq_financial_goals_purpose_code ON financial_goals (purpose_code);
UPDATE financial_goals
SET purpose_code = 'EMERGENCY_HOME_OPERATIONS_1Y'
WHERE purpose_code IS NULL
  AND LOWER(TRIM(title)) = LOWER('Dana Operasional Darurat Rumah 1 Tahun')
LIMIT 1;
