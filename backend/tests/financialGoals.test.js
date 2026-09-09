const test = require('node:test');
const assert = require('node:assert/strict');
const { deriveGoal, buildRecommendation } = require('../domain/financialGoals');

test('protection that reached target and was withdrawn needs refill', () => {
    const goal = deriveGoal({ id: 1, category: 'PROTECTION', target_amount: 10000000, collected_amount: 6000000,
        refill_enabled: 1, target_reached_at: '2026-01-01', healthy_threshold: .8, critical_threshold: .5 });
    assert.equal(goal.refill_deficit, 4000000);
    assert.equal(goal.remaining_amount, 4000000);
    assert.equal(goal.effective_status, 'NEEDS_REFILL');
    assert.equal(goal.effective_priority, 2);
});

test('asset exposes surplus and remains target reached', () => {
    const goal = deriveGoal({ category: 'ASSET', target_amount: 10, collected_amount: 15, refill_enabled: 0 });
    assert.equal(goal.surplus_amount, 5);
    assert.equal(goal.effective_status, 'TARGET_REACHED');
});

test('recommendation never exceeds capacity and explains allocation', () => {
    const items = buildRecommendation([
        { id: 1, title: 'Proteksi', category: 'PROTECTION', target_amount: 10, collected_amount: 2, refill_enabled: 1, target_reached_at: '2026-01-01' },
        { id: 2, title: 'Tujuan', category: 'PLANNED', target_amount: 10, collected_amount: 0 }
    ], 7);
    assert.equal(items.reduce((sum, item) => sum + item.allocation, 0), 7);
    assert.equal(items[0].goal_id, 1);
    assert.ok(items[0].reasons.length);
});
