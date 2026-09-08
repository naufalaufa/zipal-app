const { createHash } = require('crypto');
const template = require('../data/agreementTemplate.json');

let agreementPromise;
let transactionPromise;
const ensureAgreementSchema = pool => {
    if (agreementPromise) return agreementPromise;
    agreementPromise = (async () => {
        const db = pool.promise();
        await db.query(`CREATE TABLE IF NOT EXISTS agreements (
            id BIGINT UNSIGNED NOT NULL PRIMARY KEY, agreement_number VARCHAR(100) NOT NULL UNIQUE,
            content_json JSON NOT NULL, content_hash CHAR(64) NOT NULL,
            status ENUM('DRAFT','WAITING_EMETERAI','FINAL') NOT NULL DEFAULT 'DRAFT',
            approved_by BIGINT UNSIGNED NULL, approved_at DATETIME(3) NULL,
            draft_pdf MEDIUMBLOB NULL, draft_sha256 CHAR(64) NULL,
            final_pdf MEDIUMBLOB NULL, final_sha256 CHAR(64) NULL,
            finalized_by BIGINT UNSIGNED NULL, finalized_at DATETIME(3) NULL,
            created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
        ) ENGINE=InnoDB`);
        await db.query(`CREATE TABLE IF NOT EXISTS agreement_applications (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            agreement_id BIGINT UNSIGNED NOT NULL, user_id BIGINT UNSIGNED NOT NULL,
            party ENUM('zihra','naufal') NOT NULL, signature_image MEDIUMTEXT NOT NULL,
            applied BOOLEAN NOT NULL DEFAULT TRUE, content_hash CHAR(64) NOT NULL,
            signed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            UNIQUE KEY uq_agreement_party (agreement_id, party),
            UNIQUE KEY uq_agreement_user (agreement_id, user_id),
            CONSTRAINT fk_application_agreement FOREIGN KEY (agreement_id) REFERENCES agreements(id) ON DELETE RESTRICT
        ) ENGINE=InnoDB`);
        const content = JSON.stringify(template);
        await db.execute('INSERT IGNORE INTO agreements (id, agreement_number, content_json, content_hash) VALUES (1, ?, ?, ?)', [template.number, content, createHash('sha256').update(content).digest('hex')]);
    })().catch(error => { agreementPromise = undefined; throw error; });
    return agreementPromise;
};

const ensureTransactionGoalSchema = pool => {
    if (transactionPromise) return transactionPromise;
    transactionPromise = (async () => {
        const db = pool.promise();
        const [columns] = await db.query("SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'transactions' AND column_name = 'goal_id'");
        if (!columns.length) await db.query('ALTER TABLE transactions ADD COLUMN goal_id INT NULL');
        const [indexes] = await db.query("SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'transactions' AND index_name = 'idx_transactions_goal_id'");
        if (!indexes.length) await db.query('ALTER TABLE transactions ADD INDEX idx_transactions_goal_id (goal_id)');
        const [constraints] = await db.query("SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND table_name = 'transactions' AND constraint_name = 'fk_transactions_goal'");
        if (!constraints.length) await db.query('ALTER TABLE transactions ADD CONSTRAINT fk_transactions_goal FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE RESTRICT');
    })().catch(error => { transactionPromise = undefined; throw error; });
    return transactionPromise;
};

module.exports = { ensureAgreementSchema, ensureTransactionGoalSchema };
