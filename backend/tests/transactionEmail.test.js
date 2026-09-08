const { test } = require('node:test');
const assert = require('node:assert/strict');
const emailjs = require('@emailjs/nodejs').default;
const { sendTransactionEmail } = require('../services/transactionEmail');

test('routes both transaction types through each sender service with exact recipients', async t => {
    const calls = [];
    t.mock.method(emailjs, 'send', async (...args) => { calls.push(args); return { status: 200 }; });
    const env = { ...process.env };
    t.after(() => { process.env = env; });
    Object.assign(process.env, { EMAILJS_PUBLIC_KEY: 'test', EMAILJS_PRIVATE_KEY: 'test', EMAILJS_TEMPLATE_ID: 'template', EMAILJS_SERVICE_ID_NAUFAL: 'naufal', EMAILJS_SERVICE_ID_ZIHRA: 'zihra', EMAILJS_SERVICE_ID_ADMIN: 'admin' });
    const cases = [
        ['naufalaufa', 'naufal', 'muhammadnaufalaufarifqi@gmail.com', 'zihraangelina07@gmail.com'],
        ['zihraangelina', 'zihra', 'zihraangelina07@gmail.com', 'muhammadnaufalaufarifqi@gmail.com'],
        ['zipaladmin', 'admin', 'naufaldev001@gmail.com', 'muhammadnaufalaufarifqi@gmail.com,zihraangelina07@gmail.com']
    ];
    for (const [username, service, sender, recipient] of cases) {
        for (const type of ['deposit', 'withdraw']) {
            await sendTransactionEmail({ username, type, amount: 1000, date: '2026-09-08T10:00:00Z', goalName: 'Rumah' });
            const [serviceId, , params] = calls.at(-1);
            assert.equal(serviceId, service);
            assert.equal(params.from_email, sender);
            assert.equal(params.reply_to, sender);
            assert.equal(params.to_email, recipient);
            assert.equal(params.goal_name, 'Rumah');
        }
    }
    delete process.env.EMAILJS_SERVICE_ID_NAUFAL;
    await assert.rejects(sendTransactionEmail({ username: 'naufalaufa', type: 'deposit' }), /Konfigurasi/);
    assert.equal(calls.length, 6);
});

test('provider rejection is reported to the caller', async t => {
    t.mock.method(emailjs, 'send', async () => { throw { text: 'Provider failure' }; });
    const env = { ...process.env };
    t.after(() => { process.env = env; });
    Object.assign(process.env, { EMAILJS_PUBLIC_KEY: 'test', EMAILJS_PRIVATE_KEY: 'test', EMAILJS_TEMPLATE_ID: 'template', EMAILJS_SERVICE_ID_ADMIN: 'admin' });
    await assert.rejects(sendTransactionEmail({ username: 'zipaladmin', type: 'withdraw', date: '2026-09-08' }), /Provider failure/);
});
