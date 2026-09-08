const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { PDFDocument } = require('pdf-lib');
const { memoryPool, sampleSignature, hash } = require('./helpers/agreementFixture');

test('authenticated HTTP workflow enforces ownership, DB role, state and file validation', async t => {
    const { pool } = memoryPool();
    const dbModule = require.resolve('../config/db');
    require.cache[dbModule] = { id: dbModule, filename: dbModule, loaded: true, exports: pool };
    const oldSecret = process.env.ACCESS_TOKEN_SECRET;
    process.env.ACCESS_TOKEN_SECRET = 'test-only-secret';
    t.after(() => { if (oldSecret === undefined) delete process.env.ACCESS_TOKEN_SECRET; else process.env.ACCESS_TOKEN_SECRET = oldSecret; });
    const app = express(); app.use(express.json()); app.use(require('../routes/agreement'));
    const server = await new Promise(resolve => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
    t.after(() => { server.closeAllConnections(); server.close(); });
    const url = `http://127.0.0.1:${server.address().port}`;
    const request = (path, id, body, method = 'POST') => fetch(url + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(id ? { Authorization: `Bearer ${jwt.sign({ id, username: 'zipaladmin', role: 'admin' }, process.env.ACCESS_TOKEN_SECRET)}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    for (const [path, method] of [['/agreement/status', 'GET'], ['/agreement/sign', 'POST'], ['/agreement/approve', 'POST'], ['/agreement/final', 'POST'], ['/agreement/pdf/final', 'GET']]) {
        assert.equal((await request(path, null, undefined, method)).status, 401);
    }
    assert.equal((await request('/agreement/approve', 1)).status, 403, 'JWT claimed admin cannot override DB role');
    assert.equal((await request('/agreement/approve', 4)).status, 403, 'another admin is not zipaladmin');
    assert.equal((await request('/agreement/approve', 3)).status, 409);
    const input = { signatureImage: sampleSignature(), agreement_id: 1, content_hash: hash, consent: true };
    assert.equal((await request('/agreement/sign', 1, { ...input, user_id: 2 })).status, 403);
    assert.equal((await request('/agreement/sign', 2, { ...input, user_id: 1 })).status, 403);
    assert.equal((await request('/agreement/sign', 1, input)).status, 200);
    assert.equal((await request('/agreement/approve', 3)).status, 409);
    assert.equal((await request('/agreement/sign', 2, input)).status, 200);
    assert.equal((await request('/agreement/approve', 3)).status, 200);
    assert.equal((await request('/agreement/approve', 3)).status, 409);
    const status = await (await request('/agreement/status', 1, undefined, 'GET')).json();
    assert.equal(status.data.status, 'WAITING_EMETERAI');
    assert.equal(status.data.signatures.length, 2);
    const pdf = await request('/agreement/pdf/draft', 3, undefined, 'GET');
    assert.equal(pdf.status, 200); assert.match(pdf.headers.get('content-type'), /application\/pdf/);
    const providerCopy = await PDFDocument.load(await pdf.arrayBuffer());
    providerCopy.setSubject('Test only: simulated externally processed PDF');
    const finalBytes = await providerCopy.save();
    const upload = async (bytes, type, id) => {
        const body = new FormData(); body.append('confirmed', 'true'); body.append('document', new Blob([bytes], { type }), 'final.pdf');
        return fetch(url + '/agreement/final', { method: 'POST', headers: { Authorization: `Bearer ${jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET)}` }, body });
    };
    assert.equal((await upload(finalBytes, 'application/pdf', 1)).status, 403);
    assert.equal((await upload('not a pdf', 'application/pdf', 3)).status, 400);
    assert.equal((await upload(finalBytes, 'image/png', 3)).status, 400);
    const uploaded = await upload(finalBytes, 'application/pdf', 3);
    assert.equal(uploaded.status, 200, await uploaded.text());
    assert.equal((await upload(finalBytes, 'application/pdf', 3)).status, 409);
    assert.equal((await request('/agreement/sign', 1, input)).status, 409);
    const final = await request('/agreement/pdf/final', 2, undefined, 'GET');
    assert.deepEqual(Buffer.from(await final.arrayBuffer()), Buffer.from(finalBytes));
});
