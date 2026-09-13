const { createHash } = require('crypto');
const template = require('../data/agreementTemplate.json');

let agreementPromise;
let transactionPromise;
let goalDisplayOrderPromise;
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
        const contentHash = createHash('sha256').update(content).digest('hex');
        await db.execute('INSERT IGNORE INTO agreements (id, agreement_number, content_json, content_hash) VALUES (1, ?, ?, ?)', [template.number, content, contentHash]);
        await db.execute(`UPDATE agreements agreement
            SET agreement_number = ?, content_json = ?, content_hash = ?
            WHERE agreement.id = 1 AND agreement.status = 'DRAFT' AND agreement.content_hash <> ?
              AND NOT EXISTS (SELECT 1 FROM agreement_applications application WHERE application.agreement_id = agreement.id)`,
        [template.number, content, contentHash, contentHash]);
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

const ensureGoalDisplayOrderSchema = pool => {
    if (goalDisplayOrderPromise) return goalDisplayOrderPromise;
    goalDisplayOrderPromise = (async () => {
        const db = pool.promise();
        const [columns] = await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'financial_goals' AND column_name IN ('configured_priority','display_order','updated_at')");
        const columnNames = new Set(columns.map(column => column.COLUMN_NAME));
        if (!columnNames.has('display_order')) await db.query(`ALTER TABLE financial_goals ADD COLUMN display_order INT UNSIGNED NULL${columnNames.has('configured_priority') ? ' AFTER configured_priority' : ''}`);

        // Preserve the order users saw before drag-and-drop existed.
        const [maximumRows] = await db.query('SELECT COALESCE(MAX(display_order), 0) AS maximum_order FROM financial_goals');
        let nextOrder = Number(maximumRows[0]?.maximum_order || 0);
        const legacyOrder = columnNames.has('configured_priority') ? 'configured_priority IS NULL, configured_priority, id' : 'id';
        const [unorderedGoals] = await db.query(`SELECT id FROM financial_goals WHERE display_order IS NULL ORDER BY ${legacyOrder}`);
        for (const goal of unorderedGoals) {
            nextOrder += 1;
            await db.query(`UPDATE financial_goals SET display_order = ?${columnNames.has('updated_at') ? ', updated_at = updated_at' : ''} WHERE id = ? AND display_order IS NULL`, [nextOrder, goal.id]);
        }

        const [indexes] = await db.query("SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'financial_goals' AND index_name = 'idx_financial_goals_display_order'");
        if (!indexes.length) await db.query('ALTER TABLE financial_goals ADD INDEX idx_financial_goals_display_order (display_order)');
        return { hasUpdatedAt:columnNames.has('updated_at') };
    })().catch(error => { goalDisplayOrderPromise = undefined; throw error; });
    return goalDisplayOrderPromise;
};

module.exports = { ensureAgreementSchema, ensureTransactionGoalSchema, ensureGoalDisplayOrderSchema };
