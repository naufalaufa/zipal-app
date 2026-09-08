const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertSign, assertApprove, assertFinalize } = require('../services/agreementPolicy');
const zihra = { id: 1, username: 'zihraangelina', role: 'user' };
const naufal = { id: 2, username: 'naufalaufa', role: 'user' };
const admin = { id: 3, username: 'zipaladmin', role: 'admin' };
const both = [{ party: 'zihra', applied: 1 }, { party: 'naufal', applied: 1 }];

test('only the corresponding party may Apply; admin cannot sign for either party', () => {
    assert.equal(assertSign(zihra, { status: 'DRAFT' }, []), 'zihra');
    assert.equal(assertSign(naufal, { status: 'DRAFT' }, []), 'naufal');
    assert.throws(() => assertSign(zihra, { status: 'DRAFT' }, [], naufal.id), { status: 403 });
    assert.throws(() => assertSign(naufal, { status: 'DRAFT' }, [], zihra.id), { status: 403 });
    assert.throws(() => assertSign(admin, { status: 'DRAFT' }, []), { status: 403 });
});
test('Apply is immutable, including after approval and FINAL', () => {
    assert.throws(() => assertSign(zihra, { status: 'DRAFT' }, both), { status: 409 });
    for (const status of ['WAITING_EMETERAI', 'FINAL']) {
        assert.throws(() => assertSign(zihra, { status }, []), { status: 409 });
    }
});
test('approval requires actual ZipalAdmin role, both applications, and DRAFT', () => {
    for (const user of [zihra, naufal, { ...admin, role: 'user' }, { ...admin, username: 'otheradmin' }]) {
        assert.throws(() => assertApprove(user, { status: 'DRAFT' }, both), { status: 403 });
    }
    for (const signatures of [[], both.slice(0, 1), both.slice(1), [{ party: 'zihra', applied: 0 }, both[1]]]) {
        assert.throws(() => assertApprove(admin, { status: 'DRAFT' }, signatures), { status: 409 });
    }
    assert.doesNotThrow(() => assertApprove(admin, { status: 'DRAFT' }, both));
    for (const status of ['WAITING_EMETERAI', 'FINAL']) assert.throws(() => assertApprove(admin, { status }, both), { status: 409 });
});
test('only admin can finalize once, only from WAITING_EMETERAI', () => {
    for (const user of [zihra, naufal]) assert.throws(() => assertFinalize(user, { status: 'WAITING_EMETERAI' }), { status: 403 });
    for (const status of ['DRAFT', 'FINAL']) assert.throws(() => assertFinalize(admin, { status }), { status: 409 });
    assert.doesNotThrow(() => assertFinalize(admin, { status: 'WAITING_EMETERAI' }));
});
