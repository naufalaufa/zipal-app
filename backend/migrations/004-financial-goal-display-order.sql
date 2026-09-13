-- Additive migration for persistent drag-and-drop ordering.
-- Existing goal order is preserved by the production schema initializer.
ALTER TABLE financial_goals
    ADD COLUMN display_order INT UNSIGNED NULL AFTER configured_priority,
    ADD INDEX idx_financial_goals_display_order (display_order);
