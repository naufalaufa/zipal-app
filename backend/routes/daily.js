const express = require('express');
const db = require('../config/db');
const authenticateToken = require('../middleware/auth');
const createAdminOnly = require('../middleware/adminOnly');
const { ensureDailySchema } = require('../services/dailySchema');
const { mutateDailyTransaction, replaceDailyAllocations, validatePeriod, fail } = require('../services/dailyStore');

const router = express.Router();
const adminOnly = createAdminOnly(db);
const query = (sql, params = []) => db.promise().query(sql, params).then(([rows]) => rows);
const number = value => Number(value || 0);
const errorResponse = (req, res, error, fallback = 'Gagal memproses data Daily.') => {
    console.error('Daily request failed', { method:req.method, path:req.originalUrl, user_id:req.user?.id, code:error.code, message:error.message });
    res.status(error.status || 500).json({ message:error.status ? error.message : fallback });
};
const asyncRoute = handler => async (req, res) => {
    try { await ensureDailySchema(db); await handler(req, res); }
    catch (error) { errorResponse(req, res, error); }
};
const periodFrom = req => validatePeriod(req.query.year, req.query.month);
const periodBounds = ({ year, month }) => {
    const start = `${year}-${String(month).padStart(2,'0')}-01`;
    const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2,'0')}-01`;
    return { start, next };
};
const balance = async () => number((await query("SELECT COALESCE(SUM(CASE WHEN type='CREDIT' THEN amount ELSE -amount END),0) balance FROM daily_transactions"))[0].balance);
const categoriesFor = async period => {
    const { start, next } = periodBounds(period);
    const rows = await query(`SELECT c.id,c.code,c.name,c.icon,c.display_order,
        COALESCE(b.budget_amount,0) budget_amount,
        COALESCE(SUM(CASE WHEN t.type='EXPENSE' THEN t.amount ELSE 0 END),0) spent_amount,
        DATE_FORMAT(MAX(CASE WHEN t.type='EXPENSE' THEN t.transaction_date END),'%Y-%m-%d') last_expense_date,
        COUNT(CASE WHEN t.type='EXPENSE' THEN 1 END) expense_count
        FROM daily_categories c
        LEFT JOIN daily_budgets b ON b.category_id=c.id AND b.budget_year=? AND b.budget_month=?
        LEFT JOIN daily_transactions t ON t.category_id=c.id AND t.transaction_date>=? AND t.transaction_date<?
        WHERE c.is_active=1 GROUP BY c.id,c.code,c.name,c.icon,c.display_order,b.budget_amount
        ORDER BY c.display_order,c.id`, [period.year,period.month,start,next]);
    return rows.map(row => ({ ...row, id:number(row.id), budget_amount:number(row.budget_amount), spent_amount:number(row.spent_amount), expense_count:number(row.expense_count),
        remaining_amount:number(row.budget_amount)-number(row.spent_amount), percentage:number(row.budget_amount) > 0 ? number(row.spent_amount)/number(row.budget_amount)*100 : (number(row.spent_amount)>0 ? 100 : 0) }));
};
const emergencyFund = async () => {
    let rows = await query(`SELECT id,title,target_amount,collected_amount,description
        FROM financial_goals WHERE purpose_code='EMERGENCY_HOME_OPERATIONS_1Y' LIMIT 1`);
    if (!rows[0]) {
        const candidates = await query(`SELECT id,title,target_amount,collected_amount,description
            FROM financial_goals WHERE LOWER(TRIM(title))=LOWER(?) ORDER BY id LIMIT 1`, ['Dana Operasional Darurat Rumah 1 Tahun']);
        if (candidates[0]) {
            await query("UPDATE financial_goals SET purpose_code='EMERGENCY_HOME_OPERATIONS_1Y' WHERE id=? AND purpose_code IS NULL", [candidates[0].id]);
            rows = candidates;
        }
    }
    if (!rows[0]) return null;
    const target = number(rows[0].target_amount); const collected = number(rows[0].collected_amount);
    return { ...rows[0], id:number(rows[0].id), target_amount:target, collected_amount:collected,
        remaining_amount:Math.max(target-collected,0), progress:target > 0 ? collected/target*100 : 0 };
};

router.use('/daily', authenticateToken);

router.get('/daily/categories', asyncRoute(async (_req, res) => {
    const rows = await query('SELECT id,code,name,icon,display_order FROM daily_categories WHERE is_active=1 ORDER BY display_order,id');
    res.json({ status:'success', data:rows });
}));

router.delete('/daily/categories/:categoryId', adminOnly, asyncRoute(async (req, res) => {
    const categoryId=Number(req.params.categoryId);
    if (!Number.isSafeInteger(categoryId)||categoryId<=0) throw fail('Kategori Daily tidak valid.');
    const result=await query('UPDATE daily_categories SET is_active=0 WHERE id=? AND is_active=1',[categoryId]);
    if (!result.affectedRows) throw fail('Kategori Daily tidak ditemukan atau sudah dihapus.',404);
    res.json({ status:'success',message:'Kategori Daily berhasil dihapus. Riwayat transaksi tetap tersimpan.' });
}));

router.get('/daily/balance', asyncRoute(async (_req, res) => res.json({ status:'success', data:{ balance:await balance() } })));

router.get('/daily/summary', asyncRoute(async (req, res) => {
    const period = periodFrom(req); const { start, next } = periodBounds(period);
    const [walletBalance, categoryRows, expenseRows] = await Promise.all([
        balance(), categoriesFor(period), query("SELECT COALESCE(SUM(amount),0) total FROM daily_transactions WHERE type='EXPENSE' AND transaction_date>=? AND transaction_date<?", [start,next])
    ]);
    const expenses = number(expenseRows[0].total); const budget = categoryRows.reduce((sum,row) => sum + row.budget_amount,0);
    const days = new Date(Date.UTC(period.year,period.month,0)).getUTCDate();
    const remainingBudget=categoryRows.reduce((sum,row)=>sum+row.remaining_amount,0); const availableBalance=Math.max(walletBalance-remainingBudget,0);
    res.json({ status:'success', data:{ balance:walletBalance,available_balance:availableBalance,budget,expenses,remaining_budget:remainingBudget,average_daily_spending:days ? expenses/days : 0 } });
}));

router.get('/daily/budgets', asyncRoute(async (req, res) => res.json({ status:'success', data:await categoriesFor(periodFrom(req)) })));

router.put('/daily/budgets/:categoryId', adminOnly, asyncRoute(async (req, res) => {
    const period = validatePeriod(req.body.year,req.body.month); const categoryId = Number(req.params.categoryId); const amount = req.body.budget_amount;
    if (!Number.isSafeInteger(categoryId) || categoryId <= 0 || typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount < 0)
        throw fail('Budget harus berupa bilangan bulat nol atau positif.');
    const category = await query('SELECT id FROM daily_categories WHERE id=? AND is_active=1', [categoryId]);
    if (!category.length) throw fail('Kategori Daily tidak valid.', 422);
    const { start,next }=periodBounds(period);
    const [walletRows,expenseRows,otherRows]=await Promise.all([
        query("SELECT COALESCE(SUM(CASE WHEN type='CREDIT' THEN amount ELSE -amount END),0) balance FROM daily_transactions"),
        query("SELECT COALESCE(SUM(amount),0) spent FROM daily_transactions WHERE type='EXPENSE' AND transaction_date>=? AND transaction_date<?",[start,next]),
        query('SELECT COALESCE(SUM(budget_amount),0) total FROM daily_budgets WHERE budget_year=? AND budget_month=? AND category_id<>?',[period.year,period.month,categoryId]),
    ]);
    const capacity=number(walletRows[0].balance)+number(expenseRows[0].spent);
    if (number(otherRows[0].total)+amount>capacity) throw fail('Total pembagian melebihi saldo Daily yang tersedia untuk bulan ini.',422);
    await query(`INSERT INTO daily_budgets (category_id,budget_year,budget_month,budget_amount,updated_by)
        VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE budget_amount=VALUES(budget_amount),updated_by=VALUES(updated_by)`,
        [categoryId,period.year,period.month,amount,req.user.id]);
    res.json({ status:'success', message:'Budget kategori berhasil disimpan.' });
}));

router.delete('/daily/budgets/:categoryId', adminOnly, asyncRoute(async (req, res) => {
    const period = periodFrom(req); const categoryId = Number(req.params.categoryId);
    if (!Number.isSafeInteger(categoryId) || categoryId <= 0) throw fail('Kategori Daily tidak valid.');
    const result = await query('DELETE FROM daily_budgets WHERE category_id=? AND budget_year=? AND budget_month=?', [categoryId,period.year,period.month]);
    if (!result.affectedRows) throw fail('Budget kategori pada periode ini belum diatur.', 404);
    res.json({ status:'success', message:'Budget kategori berhasil dihapus.' });
}));

router.put('/daily/allocations', adminOnly, asyncRoute(async (req, res) => {
    const result=await replaceDailyAllocations(db,req.user.id,req.body);
    res.json({ status:'success',data:result,message:'Pembagian saldo Daily berhasil disimpan.' });
}));

router.post('/daily/topups', adminOnly, asyncRoute(async (req, res) => {
    const result = await mutateDailyTransaction(db,req.user.id,req.body,'topup');
    res.status(201).json({ status:'success',data:result,message:'Saldo Daily berhasil ditambahkan.' });
}));
router.post('/daily/expenses', adminOnly, asyncRoute(async (req, res) => {
    const result = await mutateDailyTransaction(db,req.user.id,req.body,'expense-create');
    res.status(201).json({ status:'success',data:result,message:'Pengeluaran berhasil dicatat.' });
}));
router.put('/daily/expenses/:id', adminOnly, asyncRoute(async (req, res) => {
    const id = Number(req.params.id); if (!Number.isSafeInteger(id) || id <= 0) throw fail('ID pengeluaran tidak valid.');
    const result = await mutateDailyTransaction(db,req.user.id,{...req.body,id},'expense-update');
    res.json({ status:'success',data:result,message:'Pengeluaran berhasil diperbarui.' });
}));
router.delete('/daily/expenses/:id', adminOnly, asyncRoute(async (req, res) => {
    const id = Number(req.params.id); if (!Number.isSafeInteger(id) || id <= 0) throw fail('ID pengeluaran tidak valid.');
    const result = await mutateDailyTransaction(db,req.user.id,{id},'delete');
    res.json({ status:'success',data:result,message:'Pengeluaran berhasil dihapus.' });
}));

router.get('/daily/transactions', asyncRoute(async (req, res) => {
    const period = periodFrom(req); const { start, next } = periodBounds(period);
    const page = Math.max(Number.parseInt(req.query.page,10) || 1,1); const pageSize = Math.min(Math.max(Number.parseInt(req.query.page_size,10) || 10,1),100);
    const params = [start,next]; let where = 't.transaction_date>=? AND t.transaction_date<?';
    if (req.query.category_id) { const categoryId=Number(req.query.category_id); if (!Number.isSafeInteger(categoryId)||categoryId<=0) throw fail('Filter kategori tidak valid.'); where += ' AND t.category_id=?'; params.push(categoryId); }
    if (req.query.date_from) { if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.date_from)) throw fail('Tanggal awal tidak valid.'); where += ' AND t.transaction_date>=?'; params.push(req.query.date_from); }
    if (req.query.date_to) { if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.date_to)) throw fail('Tanggal akhir tidak valid.'); where += ' AND t.transaction_date<=?'; params.push(req.query.date_to); }
    if (req.query.search?.trim()) { where += ' AND (t.description LIKE ? OR t.notes LIKE ? OR c.name LIKE ?)'; const value=`%${req.query.search.trim().slice(0,100)}%`; params.push(value,value,value); }
    const order = req.query.sort === 'oldest' ? 'ASC' : 'DESC';
    const [countRows,rows] = await Promise.all([
        query(`SELECT COUNT(*) total FROM daily_transactions t LEFT JOIN daily_categories c ON c.id=t.category_id WHERE ${where}`,params),
        query(`SELECT t.id,t.type,t.category_id,c.name category_name,c.icon category_icon,t.amount,t.description,t.notes,
            DATE_FORMAT(t.transaction_date,'%Y-%m-%d') transaction_date,t.created_by,u.username created_by_name,t.created_at,t.updated_at
            FROM daily_transactions t LEFT JOIN daily_categories c ON c.id=t.category_id JOIN users u ON u.id=t.created_by
            WHERE ${where} ORDER BY t.transaction_date ${order},t.id ${order} LIMIT ? OFFSET ?`,[...params,pageSize,(page-1)*pageSize])
    ]);
    res.json({ status:'success',data:rows.map(row=>({...row,id:number(row.id),amount:number(row.amount)})),pagination:{ page,page_size:pageSize,total:number(countRows[0].total) } });
}));

router.get('/daily/analytics', asyncRoute(async (req, res) => {
    const period=periodFrom(req); const { start,next }=periodBounds(period); const trendStart=new Date(Date.UTC(period.year,period.month-6,1));
    const trendDate=`${trendStart.getUTCFullYear()}-${String(trendStart.getUTCMonth()+1).padStart(2,'0')}-01`;
    const [byCategory,trend] = await Promise.all([
        query(`SELECT c.id,c.name,c.code,COALESCE(SUM(t.amount),0) amount FROM daily_categories c
            LEFT JOIN daily_transactions t ON t.category_id=c.id AND t.type='EXPENSE' AND t.transaction_date>=? AND t.transaction_date<?
            WHERE c.is_active=1 GROUP BY c.id,c.name,c.code,c.display_order ORDER BY c.display_order`,[start,next]),
        query(`SELECT DATE_FORMAT(transaction_date,'%Y-%m') period,SUM(amount) amount FROM daily_transactions
            WHERE type='EXPENSE' AND transaction_date>=? AND transaction_date<? GROUP BY DATE_FORMAT(transaction_date,'%Y-%m') ORDER BY period`,[trendDate,next])
    ]);
    res.json({ status:'success',data:{ by_category:byCategory.map(row=>({...row,amount:number(row.amount)})),trend:trend.map(row=>({...row,amount:number(row.amount)})) } });
}));

router.get('/daily/emergency-fund', asyncRoute(async (_req, res) => res.json({ status:'success',data:await emergencyFund() })));

router.get('/daily/overview', asyncRoute(async (req, res) => {
    const period=periodFrom(req); const { start,next }=periodBounds(period);
    const trendStart=new Date(Date.UTC(period.year,period.month-6,1)); const trendDate=`${trendStart.getUTCFullYear()}-${String(trendStart.getUTCMonth()+1).padStart(2,'0')}-01`;
    const [walletBalance,categoryRows,expenseRows,trend,emergency] = await Promise.all([
        balance(),categoriesFor(period),query("SELECT COALESCE(SUM(amount),0) total FROM daily_transactions WHERE type='EXPENSE' AND transaction_date>=? AND transaction_date<?",[start,next]),
        query(`SELECT DATE_FORMAT(transaction_date,'%Y-%m') period,SUM(amount) amount FROM daily_transactions WHERE type='EXPENSE' AND transaction_date>=? AND transaction_date<? GROUP BY DATE_FORMAT(transaction_date,'%Y-%m') ORDER BY period`,[trendDate,next]),
        emergencyFund()
    ]);
    const expenses=number(expenseRows[0].total); const budget=categoryRows.reduce((sum,row)=>sum+row.budget_amount,0); const remainingBudget=categoryRows.reduce((sum,row)=>sum+row.remaining_amount,0);
    const availableBalance=Math.max(walletBalance-remainingBudget,0); const days=new Date(Date.UTC(period.year,period.month,0)).getUTCDate();
    res.json({ status:'success',data:{ summary:{balance:walletBalance,available_balance:availableBalance,budget,expenses,remaining_budget:remainingBudget,average_daily_spending:days?expenses/days:0},categories:categoryRows,trend:trend.map(row=>({...row,amount:number(row.amount)})),emergency_fund:emergency } });
}));

module.exports = router;
