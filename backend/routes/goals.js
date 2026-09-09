const express = require('express');
const db = require('../config/db');
const authenticateToken = require('../middleware/auth');
const { CATEGORIES, validCategory, deriveGoal, buildRecommendation } = require('../domain/financialGoals');
const router = express.Router();
const query = (sql, params = []) => db.promise().query(sql, params).then(([rows]) => rows);
const goalSelect = `SELECT id,title,target_amount,collected_amount,description,category,lifecycle_status,configured_priority,target_date,
 refill_enabled,healthy_threshold,critical_threshold,target_reached_at,cycle_type,cycle_interval,next_due_date,is_recurring,
 milestone_behavior,created_at,updated_at FROM financial_goals`;
const number = value => Number(value);
const bool = value => value === true || value === 1 || value === '1';
const fail = (res, error) => { console.error(error); res.status(error.status || 500).json({ message: error.status ? error.message : 'Gagal memproses Financial Goals.' }); };
const adminOnly = async (req, res, next) => {
    try {
        const rows = await query('SELECT role FROM users WHERE id=?', [req.user.id]);
        if (rows[0]?.role !== 'admin') return res.status(403).json({ message: 'Hanya admin yang dapat mengubah Financial Goals.' });
        next();
    } catch (_error) { res.status(500).json({ message: 'Gagal memeriksa akses.' }); }
};
const validateGoal = (req, res, next) => {
    const { title, target_amount, category } = req.body;
    if (typeof title !== 'string' || !title.trim() || !Number.isFinite(number(target_amount)) || number(target_amount) <= 0 || !validCategory(category))
        return res.status(400).json({ message: 'Nama, kategori, dan target goal tidak valid.' });
    if (req.body.collected_amount != null && (!Number.isFinite(number(req.body.collected_amount)) || number(req.body.collected_amount) < 0))
        return res.status(400).json({ message: 'Saldo awal tidak valid.' });
    if (req.body.lifecycle_status === 'COMPLETED' && ['PROTECTION','RECURRING','ASSET'].includes(category))
        return res.status(400).json({ message: 'Kategori ini menggunakan target sebagai saldo ideal, siklus, atau milestone dan tidak dapat diselesaikan permanen.' });
    const healthy = number(req.body.healthy_threshold ?? .8); const critical = number(req.body.critical_threshold ?? .5);
    if (healthy <= 0 || healthy > 1 || critical <= 0 || critical > healthy)
        return res.status(400).json({ message: 'Threshold harus berada pada rentang 0–1 dan batas kritis tidak boleh melebihi batas sehat.' });
    next();
};

router.get('/goals', async (req, res) => {
    try {
        const params = []; let where = '';
        if (req.query.category && validCategory(req.query.category)) { where = ' WHERE category=?'; params.push(req.query.category); }
        const rows = await query(`${goalSelect}${where} ORDER BY configured_priority IS NULL,configured_priority,id`, params);
        res.json({ status: 'success', data: rows.map(deriveGoal) });
    } catch (error) { fail(res, error); }
});

router.get('/goals/summary', async (_req, res) => {
    try {
        const goals = (await query(goalSelect)).map(deriveGoal);
        const totalBalance = goals.reduce((sum, goal) => sum + goal.current_amount, 0);
        const totalTarget = goals.reduce((sum, goal) => sum + goal.target_amount, 0);
        const protections = goals.filter(goal => goal.category === CATEGORIES.PROTECTION);
        const protectionTarget = protections.reduce((sum, goal) => sum + goal.target_amount, 0);
        const needsRefill = goals.filter(goal => goal.effective_status === 'NEEDS_REFILL');
        const unhealthy = protections.filter(goal => goal.target_amount && goal.current_amount / goal.target_amount < Number(goal.healthy_threshold));
        res.json({ status: 'success', data: {
            total_balance: totalBalance, total_target: totalTarget, overall_progress: totalTarget ? totalBalance / totalTarget * 100 : 0,
            total_remaining: goals.reduce((sum, goal) => sum + goal.remaining_amount, 0),
            reached_count: goals.filter(goal => ['TARGET_REACHED','COMPLETED'].includes(goal.effective_status)).length,
            needs_refill_count: needsRefill.length, total_refill_deficit: needsRefill.reduce((sum, goal) => sum + goal.refill_deficit, 0),
            protection_health: protectionTarget ? protections.reduce((sum, goal) => sum + Math.min(goal.current_amount, goal.target_amount), 0) / protectionTarget * 100 : null,
            recovery_mode: unhealthy.length > 0, recovery_goal_count: unhealthy.length
        }});
    } catch (error) { fail(res, error); }
});

router.get('/goals/:id', async (req, res, next) => {
    if (!/^\d+$/.test(req.params.id)) return next();
    try {
        const rows = await query(`${goalSelect} WHERE id=?`, [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: 'Goal tidak ditemukan.' });
        const [stats] = await query(`SELECT COUNT(*) transaction_count,COALESCE(SUM(CASE WHEN type='deposit' THEN amount ELSE 0 END),0) total_deposit,
          COALESCE(SUM(CASE WHEN type='withdraw' THEN amount ELSE 0 END),0) total_withdrawal,MAX(date) last_transaction FROM transactions WHERE goal_id=?`, [req.params.id]);
        const transactions = await query('SELECT id,username,type,amount,date,description FROM transactions WHERE goal_id=? ORDER BY date DESC,id DESC LIMIT 50', [req.params.id]);
        res.json({ status: 'success', data: { ...deriveGoal(rows[0]), ...stats, transactions } });
    } catch (error) { fail(res, error); }
});

router.post('/goals', authenticateToken, adminOnly, validateGoal, async (req, res) => {
    const connection = await db.promise().getConnection();
    try {
        await connection.beginTransaction();
        const input = req.body; const initial = number(input.collected_amount || 0); const target = number(input.target_amount);
        const refill = input.category === CATEGORIES.PROTECTION ? input.refill_enabled !== false : bool(input.refill_enabled);
        const [result] = await connection.query(`INSERT INTO financial_goals
          (title,target_amount,collected_amount,description,category,lifecycle_status,configured_priority,target_date,refill_enabled,
           healthy_threshold,critical_threshold,cycle_type,cycle_interval,next_due_date,is_recurring,milestone_behavior,target_reached_at)
          VALUES (?,?,?,?,?,'ACTIVE',?,?,?,?,?,?,?,?,?,?,?)`, [input.title.trim(),target,initial,input.description || null,input.category,
          input.configured_priority || null,input.target_date || null,refill,number(input.healthy_threshold ?? .8),number(input.critical_threshold ?? .5),
          input.cycle_type || null,input.cycle_interval || null,input.next_due_date || null,input.category === CATEGORIES.RECURRING || bool(input.is_recurring),
          input.category === CATEGORIES.ASSET ? 'CONTINUE' : (input.milestone_behavior || 'STOP'),initial >= target ? new Date() : null]);
        if (initial > 0) await connection.query(`INSERT INTO transactions (username,type,amount,date,description,goal_id)
          VALUES (?,'deposit',?,CURRENT_DATE,'Saldo awal goal',?)`, [req.user.username,initial,result.insertId]);
        await connection.commit();
        res.status(201).json({ status: 'success', data: { id: result.insertId }, message: 'Financial goal berhasil dibuat.' });
    } catch (error) { await connection.rollback(); fail(res, error); } finally { connection.release(); }
});

router.put('/goals/:id', authenticateToken, adminOnly, validateGoal, async (req, res) => {
    try {
        const i = req.body;
        const result = await query(`UPDATE financial_goals SET title=?,target_amount=?,description=?,category=?,lifecycle_status=?,configured_priority=?,
          target_date=?,refill_enabled=?,healthy_threshold=?,critical_threshold=?,cycle_type=?,cycle_interval=?,next_due_date=?,is_recurring=?,milestone_behavior=? WHERE id=?`,
        [i.title.trim(),number(i.target_amount),i.description || null,i.category,i.lifecycle_status || 'ACTIVE',i.configured_priority || null,i.target_date || null,
         bool(i.refill_enabled),number(i.healthy_threshold ?? .8),number(i.critical_threshold ?? .5),i.cycle_type || null,i.cycle_interval || null,
         i.next_due_date || null,i.category === CATEGORIES.RECURRING || bool(i.is_recurring),i.category === CATEGORIES.ASSET ? 'CONTINUE' : (i.milestone_behavior || 'STOP'),req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ message: 'Goal tidak ditemukan.' });
        res.json({ status: 'success', message: 'Financial goal berhasil diperbarui.' });
    } catch (error) { fail(res, error); }
});

router.delete('/goals/:id', authenticateToken, adminOnly, async (req, res) => {
    try {
        const result = await query('DELETE FROM financial_goals WHERE id=?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ message: 'Goal tidak ditemukan.' });
        res.json({ status: 'success', message: 'Goal berhasil dihapus.' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ message: 'Goal memiliki transaksi. Gunakan status Paused atau Completed.' });
        fail(res, error);
    }
});

router.post('/goals/refill-recommendation', async (req, res) => {
    const capacity = number(req.body.monthly_saving_capacity);
    if (!Number.isFinite(capacity) || capacity <= 0) return res.status(400).json({ message: 'Kapasitas menabung harus lebih dari nol.' });
    try {
        const recommendations = buildRecommendation(await query(goalSelect), capacity);
        res.json({ status: 'success', data: { capacity, allocated: recommendations.reduce((sum, item) => sum + item.allocation, 0), recommendations } });
    } catch (error) { fail(res, error); }
});

router.get('/financial-analytics', async (req, res) => {
    try {
        const months = { '1M':1,'3M':3,'6M':6,'1Y':12,ALL:1200 }[req.query.period] || 6;
        const goals = (await query(goalSelect)).map(deriveGoal);
        const monthly = await query(`SELECT DATE_FORMAT(date,'%Y-%m') period,SUM(CASE WHEN type='deposit' THEN amount ELSE 0 END) deposits,
          SUM(CASE WHEN type='withdraw' THEN amount ELSE 0 END) withdrawals FROM transactions WHERE goal_id IS NOT NULL
          AND date>=DATE_SUB(CURRENT_DATE,INTERVAL ? MONTH) GROUP BY DATE_FORMAT(date,'%Y-%m') ORDER BY period`, [months]);
        const [coverage] = await query('SELECT COUNT(*) total,SUM(goal_id IS NOT NULL) allocated FROM transactions');
        let running = goals.reduce((sum, goal) => sum + goal.current_amount, 0) - monthly.reduce((sum, row) => sum + number(row.deposits) - number(row.withdrawals), 0);
        const trend = monthly.map(row => ({ period:row.period,deposits:number(row.deposits),withdrawals:number(row.withdrawals),net:number(row.deposits)-number(row.withdrawals),balance:running += number(row.deposits)-number(row.withdrawals) }));
        const categories = Object.values(CATEGORIES).map(category => ({ category,amount:goals.filter(goal => goal.category === category).reduce((sum, goal) => sum + goal.current_amount, 0) }));
        res.json({ status:'success', data:{ goals,trend,categories,coverage } });
    } catch (error) { fail(res, error); }
});

module.exports = router;
