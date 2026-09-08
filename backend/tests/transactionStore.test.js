const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mutateTransaction } = require('../services/transactionStore');

function fixture({ balance = 100, previous, insertFails = false } = {}) {
    const state = { balance, committed: false, rolledBack: false, released: false, writes: [] };
    const connection = {
        async beginTransaction() {},
        async commit() { state.committed = true; },
        async rollback() { state.rolledBack = true; state.balance = balance; },
        release() { state.released = true; },
        async query(sql, params) {
            if (sql.startsWith('SELECT id FROM users')) return [[]];
            if (sql.startsWith('SELECT * FROM transactions')) return [previous ? [previous] : []];
            if (sql.startsWith('SELECT * FROM financial_goals')) return [[{ id: 1, title: 'Rumah', collected_amount: state.balance }]];
            if (sql.startsWith('SELECT COALESCE')) return [[{ balance: 200 }]];
            if (sql.startsWith('INSERT') && insertFails) throw new Error('database unavailable');
            state.writes.push({ sql, params });
            if (sql.startsWith('UPDATE financial_goals')) state.balance += params[0];
            return [{ insertId: 42 }];
        }
    };
    return { state, pool: { promise: () => ({ getConnection: async () => connection }) } };
}
const input = { type: 'deposit', amount: 50, goal_id: 1 };
test('deposit changes only selected goal and returns email context', async () => {
    const { state, pool } = fixture();
    const result = await mutateTransaction(pool, 'naufalaufa', input);
    assert.equal(state.balance, 150);
    assert.equal(result.goalName, 'Rumah');
    assert.equal(result.saldoSesudah, 250);
    assert.ok(state.committed && state.released);
});
test('withdraw deducts selected goal for both users and admin', async () => {
    for (const actor of ['naufalaufa', 'zihraangelina', 'zipaladmin']) {
        const { state, pool } = fixture();
        await mutateTransaction(pool, actor, { ...input, type: 'withdraw' });
        assert.equal(state.balance, 50);
    }
});
test('insufficient goal balance rejects without writes', async () => {
    const { state, pool } = fixture({ balance: 10 });
    await assert.rejects(mutateTransaction(pool, 'naufalaufa', { ...input, type: 'withdraw' }), /Saldo tabungan/);
    assert.equal(state.writes.length, 0);
    assert.ok(state.rolledBack && state.released);
});
test('invalid amounts, type, actor and missing purpose are rejected', async () => {
    for (const amount of [0, -1, 1.5, NaN, Infinity, '50']) {
        await assert.rejects(mutateTransaction(fixture().pool, 'naufalaufa', { ...input, amount }));
    }
    await assert.rejects(mutateTransaction(fixture().pool, 'other', input));
    await assert.rejects(mutateTransaction(fixture().pool, 'naufalaufa', { ...input, goal_id: undefined }));
    await assert.rejects(mutateTransaction(fixture().pool, 'naufalaufa', { ...input, type: 'other' }));
});
test('edit applies difference and cancellation reverses deposit or withdraw', async () => {
    for (const type of ['deposit', 'withdraw']) {
        const previous = { id: 2, username: 'naufalaufa', type, amount: 20, goal_id: 1 };
        const edit = fixture({ previous });
        await mutateTransaction(edit.pool, 'naufalaufa', { id: 2, amount: 30 }, 'update');
        assert.equal(edit.state.balance, type === 'deposit' ? 110 : 90);
        const cancel = fixture({ previous });
        await mutateTransaction(cancel.pool, 'naufalaufa', { type }, 'delete');
        assert.equal(cancel.state.balance, type === 'deposit' ? 80 : 120);
    }
});
test('legacy edit leaves Purpose balances unchanged', async () => {
    const { state, pool } = fixture({ previous: { id: 2, username: 'naufalaufa', type: 'deposit', amount: 20, goal_id: null } });
    await mutateTransaction(pool, 'naufalaufa', { id: 2, amount: 30 }, 'update');
    assert.equal(state.balance, 100);
});
test('cross-user edits fail and database failure rolls back', async () => {
    const other = fixture({ previous: { id: 2, username: 'zihraangelina' } });
    await assert.rejects(mutateTransaction(other.pool, 'naufalaufa', { id: 2, amount: 30 }, 'update'), /bukan milik/);
    const broken = fixture({ insertFails: true });
    await assert.rejects(mutateTransaction(broken.pool, 'naufalaufa', input), /database unavailable/);
    assert.ok(broken.state.rolledBack && broken.state.released);
    assert.equal(broken.state.balance, 100);
});
