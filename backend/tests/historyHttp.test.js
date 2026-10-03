const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

test('History requires authentication and returns all rows for an authenticated user', async (t) => {
    const databaseModule = require.resolve('../config/db');
    const transactionRoutesModule = require.resolve('../routes/transactions');
    const rows = [{ id: 1, username: 'naufalaufa', type: 'deposit', amount: 1000000, date: '2026-10-01' }];
    const database = {
        query(sql, callback) {
            assert.match(sql, /FROM transactions/);
            callback(null, rows);
        },
    };

    require.cache[databaseModule] = {
        id: databaseModule,
        filename: databaseModule,
        loaded: true,
        exports: database,
    };
    delete require.cache[transactionRoutesModule];

    const previousSecret = process.env.ACCESS_TOKEN_SECRET;
    process.env.ACCESS_TOKEN_SECRET = 'history-test-secret';
    t.after(() => {
        delete require.cache[transactionRoutesModule];
        delete require.cache[databaseModule];
        if (previousSecret === undefined) delete process.env.ACCESS_TOKEN_SECRET;
        else process.env.ACCESS_TOKEN_SECRET = previousSecret;
    });

    const app = express();
    app.use(require('../routes/transactions'));
    const server = await new Promise((resolve) => {
        const listeningServer = app.listen(0, '127.0.0.1', () => resolve(listeningServer));
    });
    t.after(() => {
        server.closeAllConnections();
        server.close();
    });

    const url = `http://127.0.0.1:${server.address().port}/history`;
    assert.equal((await fetch(url)).status, 401);

    const invalidToken = jwt.sign({ id: 1, username: 'naufalaufa' }, 'wrong-secret');
    assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${invalidToken}` } })).status, 403);

    const validToken = jwt.sign({ id: 1, username: 'naufalaufa' }, process.env.ACCESS_TOKEN_SECRET);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${validToken}` } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'success', data: rows });
});
