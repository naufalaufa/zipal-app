-- Run once on a backed-up database before deploying the updated API.
-- Existing transactions remain unallocated; existing Purpose balances are preserved.
-- Requires InnoDB tables. Match goal_id's type to financial_goals.id if it is not INT.
ALTER TABLE transactions
    ADD COLUMN goal_id INT NULL,
    ADD INDEX idx_transactions_goal_id (goal_id),
    ADD CONSTRAINT fk_transactions_goal
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE RESTRICT;
