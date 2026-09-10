-- Additive migration. Back up first. It never deletes or recreates existing goals/transactions.
ALTER TABLE financial_goals
    ADD COLUMN category ENUM('PROTECTION','PLANNED','RECURRING','ASSET','SOCIAL') NULL AFTER description,
    ADD COLUMN lifecycle_status ENUM('ACTIVE','PAUSED','COMPLETED') NOT NULL DEFAULT 'ACTIVE' AFTER category,
    ADD COLUMN configured_priority TINYINT UNSIGNED NULL AFTER lifecycle_status,
    ADD COLUMN target_date DATE NULL AFTER configured_priority,
    ADD COLUMN refill_enabled BOOLEAN NOT NULL DEFAULT FALSE AFTER target_date,
    ADD COLUMN healthy_threshold DECIMAL(4,3) NOT NULL DEFAULT 0.800 AFTER refill_enabled,
    ADD COLUMN critical_threshold DECIMAL(4,3) NOT NULL DEFAULT 0.500 AFTER healthy_threshold,
    ADD COLUMN target_reached_at DATETIME NULL AFTER critical_threshold,
    ADD COLUMN cycle_type ENUM('MONTHLY','YEARLY','CUSTOM') NULL AFTER target_reached_at,
    ADD COLUMN cycle_interval SMALLINT UNSIGNED NULL AFTER cycle_type,
    ADD COLUMN next_due_date DATE NULL AFTER cycle_interval,
    ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT FALSE AFTER next_due_date,
    ADD COLUMN milestone_behavior ENUM('STOP','CONTINUE') NOT NULL DEFAULT 'STOP' AFTER is_recurring,
    ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
    ADD INDEX idx_financial_goals_category (category),
    ADD INDEX idx_financial_goals_status (lifecycle_status);

-- Backfill only legacy/uncategorized rows. Existing user-selected categories are never overwritten.
UPDATE financial_goals SET category='PROTECTION', refill_enabled=TRUE
WHERE category IS NULL AND title IN ('Dana Darurat','Dana Darurat Keluarga','Dana Darurat Sakit Keluarga',
 'Dana Darurat Tertimpa Musibah Keluarga','Dana Darurat 6 Bulan','Dana Darurat Perbaikan Kendaraan','Dana Kepergian Keluarga');
UPDATE financial_goals SET category='PLANNED'
WHERE category IS NULL AND title IN ('Dana Isi Rumah','Dana Persalinan Anak','Dana Mobilitas Keluarga');
UPDATE financial_goals SET category='RECURRING', is_recurring=TRUE
WHERE category IS NULL AND title IN ('Dana Susu Anak 2 Tahun','Dana Jajan Anak','Dana Perkembangan Teknologi/Zaman','Dana Perkembangan Teknologi / Zaman',
 'Uang Kebutuhan Lebaran Sampai Akhir Hayat','Dana Liburan Keluarga Pertahun');
UPDATE financial_goals SET category='ASSET', milestone_behavior='CONTINUE'
WHERE category IS NULL AND title IN ('Dana Pendidikan Anak','Investasi & Tabungan Masa Depan','Investasi & Tabungan Masa Depan 🪙');
UPDATE financial_goals SET target_reached_at=COALESCE(target_reached_at, created_at)
WHERE target_amount > 0 AND collected_amount >= target_amount;

-- Unknown rows remain NULL intentionally and must be reviewed before enforcing NOT NULL.
