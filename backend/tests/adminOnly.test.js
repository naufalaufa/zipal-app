const test = require('node:test');
const assert = require('node:assert/strict');
const createAdminOnly = require('../middleware/adminOnly');

const response = () => ({
    statusCode:200,
    body:null,
    status(code) { this.statusCode=code; return this; },
    json(body) { this.body=body; return this; },
});

const databaseWithRole = role => ({
    promise:()=>({ query:async()=>[[role ? { role } : undefined].filter(Boolean)] }),
});

test('adminOnly lets an admin continue', async () => {
    const middleware=createAdminOnly(databaseWithRole('admin'));
    const res=response(); let continued=false;
    await middleware({ user:{ id:1 } },res,()=>{continued=true;});
    assert.equal(continued,true);
    assert.equal(res.statusCode,200);
});

test('adminOnly rejects ordinary and missing users', async () => {
    for (const role of ['user',null]) {
        const middleware=createAdminOnly(databaseWithRole(role));
        const res=response(); let continued=false;
        await middleware({ user:{ id:2 } },res,()=>{continued=true;});
        assert.equal(continued,false);
        assert.equal(res.statusCode,403);
        assert.equal(res.body.message,'Hanya admin yang dapat mengubah data Daily.');
    }
});

test('adminOnly fails closed when the role lookup fails', async () => {
    const database={ promise:()=>({ query:async()=>{throw new Error('database unavailable');} }) };
    const res=response(); let continued=false;
    const originalError=console.error; console.error=()=>{};
    try { await createAdminOnly(database)({ user:{ id:3 } },res,()=>{continued=true;}); }
    finally { console.error=originalError; }
    assert.equal(continued,false);
    assert.equal(res.statusCode,500);
});
