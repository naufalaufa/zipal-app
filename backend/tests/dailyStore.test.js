const test = require('node:test');
const assert = require('node:assert/strict');
const { mutateDailyTransaction, replaceDailyAllocations, validDate, validateExpense, validatePeriod } = require('../services/dailyStore');

const fakePool = initial => {
    const state = { transactions:(initial || []).map(item=>({...item})), budgets:{}, nextId:(initial?.length || 0)+1, cashAvailable:10_000_000 };
    return { state, promise:()=>({ getConnection:async()=>{
        let work;
        const connection={
            beginTransaction:async()=>{work={transactions:state.transactions.map(item=>({...item})),budgets:{...state.budgets},nextId:state.nextId};},
            commit:async()=>{state.transactions=work.transactions;state.budgets=work.budgets;state.nextId=work.nextId;}, rollback:async()=>{}, release:()=>{},
            query:async(sql,params=[])=>{
                if(sql.includes('daily_ledger_lock'))return [[{id:1}]];
                if(sql.startsWith('SELECT * FROM daily_transactions'))return [[work.transactions.find(item=>item.id===params[0]&&item.type==='EXPENSE')].filter(Boolean)];
                if(sql.startsWith('SELECT id FROM daily_categories WHERE is_active=1 FOR UPDATE'))return [[{id:1},{id:2}]];
                if(sql.startsWith('SELECT id FROM daily_categories'))return [[1,2].includes(params[0])?[{id:params[0]}]:[]];
                if(sql.includes("COALESCE(SUM(CASE WHEN type='CREDIT'")){const balance=work.transactions.reduce((sum,item)=>sum+(item.type==='CREDIT'?item.amount:-item.amount),0);return [[{balance}]];}
                if(sql.startsWith("SELECT COALESCE(SUM(amount),0) spent")){const [start,next]=params;const spent=work.transactions.filter(item=>item.type==='EXPENSE'&&item.transaction_date>=start&&item.transaction_date<next).reduce((sum,item)=>sum+item.amount,0);return [[{spent}]];}
                if(sql.startsWith('INSERT INTO daily_transactions')){const type=sql.includes("'CREDIT'")?'CREDIT':'EXPENSE';const id=work.nextId++;work.transactions.push(type==='CREDIT'?{id,type,category_id:null,amount:params[0],transaction_date:params[2]}:{id,type,category_id:params[0],amount:params[1],description:params[2],transaction_date:params[4]});return [{insertId:id}];}
                if(sql.startsWith('DELETE FROM daily_budgets WHERE budget_year=')){for(const key of Object.keys(work.budgets)){if(key.endsWith(`-${params[0]}-${params[1]}`))delete work.budgets[key];}return [{affectedRows:1}];}
                if(sql.startsWith('INSERT INTO daily_budgets')){const key=`${params[0]}-${params[1]}-${params[2]}`;work.budgets[key]=params[3];return [{affectedRows:1}];}
                if(sql.startsWith('UPDATE daily_transactions')){const item=work.transactions.find(row=>row.id===params[5]);Object.assign(item,{category_id:params[0],amount:params[1],description:params[2]});return [{affectedRows:1}];}
                if(sql.startsWith('DELETE FROM daily_transactions')){work.transactions=work.transactions.filter(row=>row.id!==params[0]);return [{affectedRows:1}];}
                throw new Error(`Unexpected SQL: ${sql}`);
            },
        }; return connection;
    }}) };
};

test('Daily ledger top up, expense, edit and delete always recalculate balance', async()=>{
    const pool=fakePool();
    let result=await mutateDailyTransaction(pool,1,{amount:3_000_000,transaction_date:'2026-09-01',notes:'September'},'topup');
    assert.equal(result.balance,3_000_000);
    assert.equal(pool.state.transactions[0].category_id,null);
    assert.equal(pool.state.budgets['1-2026-9'],undefined);
    const allocation=await replaceDailyAllocations(pool,1,{year:2026,month:9,allocations:[{category_id:1,amount:2_000_000},{category_id:2,amount:1_000_000}]});
    assert.equal(allocation.total_allocated,3_000_000);
    assert.equal(pool.state.budgets['1-2026-9'],2_000_000);
    assert.equal(pool.state.budgets['2-2026-9'],1_000_000);
    assert.equal(pool.state.budgets['1-2026-10'],undefined);
    result=await mutateDailyTransaction(pool,2,{category_id:1,amount:50_000,transaction_date:'2026-09-19',description:'Makan siang'},'expense-create');
    assert.equal(result.balance,2_950_000); const foodId=result.id;
    result=await mutateDailyTransaction(pool,1,{category_id:2,amount:30_000,transaction_date:'2026-09-19',description:'Bensin motor'},'expense-create');
    assert.equal(result.balance,2_920_000); const transportId=result.id;
    result=await mutateDailyTransaction(pool,1,{id:foodId,category_id:1,amount:35_000,transaction_date:'2026-09-19',description:'Makan siang'},'expense-update');
    assert.equal(result.balance,2_935_000);
    result=await mutateDailyTransaction(pool,1,{id:transportId},'delete');
    assert.equal(result.balance,2_965_000);
    assert.equal(pool.state.cashAvailable,10_000_000);
});

test('Daily allocation cannot exceed wallet capacity and remains monthly', async()=>{
    const pool=fakePool([{id:1,type:'CREDIT',category_id:null,amount:500_000,transaction_date:'2026-09-01'}]);
    await replaceDailyAllocations(pool,1,{year:2026,month:9,allocations:[{category_id:1,amount:300_000},{category_id:2,amount:200_000}]});
    await assert.rejects(()=>replaceDailyAllocations(pool,1,{year:2026,month:10,allocations:[{category_id:1,amount:500_001}]}),error=>error.status===422);
    assert.equal(pool.state.budgets['1-2026-9'],300_000);
    assert.equal(pool.state.budgets['1-2026-10'],undefined);
});

test('Daily expense above shared balance is rejected and rolled back', async()=>{
    const pool=fakePool([{id:1,type:'CREDIT',category_id:null,amount:50_000}]);
    await assert.rejects(()=>mutateDailyTransaction(pool,1,{category_id:1,amount:100_000,transaction_date:'2026-09-19',description:'Terlalu besar'},'expense-create'),error=>error.status===422&&error.message==='Saldo Daily tidak mencukupi.');
    assert.equal(pool.state.transactions.length,1);
});

test('Daily validation rejects invalid dates, periods, categories and amounts',()=>{
    assert.equal(validDate('2026-09-19'),true); assert.equal(validDate('2026-02-30'),false);
    assert.throws(()=>validatePeriod(2026,13));
    assert.throws(()=>validateExpense({category_id:0,amount:25_000,transaction_date:'2026-09-19',description:'x'}));
    assert.throws(()=>validateExpense({category_id:1,amount:-1,transaction_date:'2026-09-19',description:'x'}));
});
