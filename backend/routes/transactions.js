const express = require('express');
const db = require('../config/db');
const { sendTransactionEmail } = require('../services/transactionEmail');

const authenticateToken = require('../middleware/auth');
const { mutateTransaction } = require('../services/transactionStore');
const router = express.Router();

router.get('/summary', (req, res) => {
    const sql = `
        SELECT 
            username, 
            SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as total_deposit,
            SUM(CASE WHEN type = 'withdraw' THEN amount ELSE 0 END) as total_withdraw
        FROM transactions 
        GROUP BY username
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        const stats = {
            naufal: { deposit: 0, balance: 0, withdraw: 0 },
            zihra: { deposit: 0, balance: 0, withdraw: 0 },
            zipaladmin: { withdraw: 0 }
        };

        results.forEach(row => {
            const deposit = parseFloat(row.total_deposit || 0);
            const withdraw = parseFloat(row.total_withdraw || 0);
            const balance = deposit - withdraw;

            if (row.username === 'naufalaufa') {
                stats.naufal = { deposit, balance, withdraw };
            } else if (row.username === 'zihraangelina') {
                stats.zihra = { deposit, balance, withdraw };
            } else if (row.username === 'zipaladmin') {
                stats.zipaladmin = { withdraw };
            }
        });

        const totalDepositAll = stats.naufal.deposit + stats.zihra.deposit;
        const totalUangReal = stats.naufal.balance + stats.zihra.balance;
        const sisaSaldoSetelahInvest = totalUangReal - stats.zipaladmin.withdraw;

        res.json({
            status: 'success',
            data: {
                total_naufal: stats.naufal.balance,
                total_zihra: stats.zihra.balance,
                total_deposit_naufal: stats.naufal.deposit,
                total_deposit_zihra: stats.zihra.deposit,
                total_deposit_overall: totalDepositAll,
                grand_total: sisaSaldoSetelahInvest,
                withdraw_naufal: stats.naufal.withdraw,
                withdraw_zihra: stats.zihra.withdraw,
                total_investment: stats.zipaladmin.withdraw
            }
        });
    });
});

const mutationError = (res, error) => {
    console.error('Transaction failed:', error.message);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Gagal menyimpan transaksi.' });
};
router.post('/transaction', authenticateToken, async (req, res) => {
    if (req.body.username !== req.user.username) return res.status(403).json({ message: 'Akun transaksi tidak sesuai pengguna login.' });
    let transaction;
    try { transaction = await mutateTransaction(db, req.user.username, req.body); }
    catch (error) { return mutationError(res, error); }
    // Await the email before serverless runtimes end the request.
    let emailStatus = 'sent';
    try { await sendTransactionEmail(transaction); }
    catch (error) { emailStatus = 'failed'; console.error('Email transaksi gagal:', error.message); }
    res.json({ status: 'success', message: 'Transaksi berhasil disimpan!', email_status: emailStatus, transaction_id: transaction.id });
});
router.delete('/transaction/cancel-last/:username', authenticateToken, async (req, res) => {
    if (req.params.username !== req.user.username) return res.status(403).json({ message: 'Transaksi bukan milik akun ini.' });
    const type = req.query.type || 'deposit';
    if (!['deposit', 'withdraw'].includes(type)) return res.status(400).json({ message: 'Tipe transaksi tidak valid.' });
    try {
        await mutateTransaction(db, req.user.username, { type }, 'delete');
        res.json({ status: 'success', message: 'Transaksi terakhir berhasil dibatalkan!' });
    } catch (error) { mutationError(res, error); }
});
router.get('/transaction/last/:username', authenticateToken, (req, res) => {
    const type = req.query.type || 'deposit';
    if (!['deposit', 'withdraw'].includes(type)) return res.status(400).json({ message: 'Tipe transaksi tidak valid.' });
    db.query('SELECT * FROM transactions WHERE username = ? AND type = ? ORDER BY id DESC LIMIT 1', [req.params.username, type], (err, result) => {
        if (err) return res.status(500).json({ message: 'Gagal mengambil transaksi.' });
        if (!result.length) return res.status(404).json({ message: 'Belum ada transaksi.' });
        res.json({ status: 'success', data: result[0] });
    });
});
router.put('/transaction/:id', authenticateToken, async (req, res) => {
    try {
        await mutateTransaction(db, req.user.username, { ...req.body, id: req.params.id }, 'update');
        res.json({ status: 'success', message: 'Data berhasil diperbarui!' });
    } catch (error) { mutationError(res, error); }
});

router.get('/history', (req, res) => {
    db.query(
        'SELECT t.*, g.title AS goal_name FROM transactions t LEFT JOIN financial_goals g ON g.id = t.goal_id ORDER BY t.date DESC, t.id DESC',
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ status: 'success', data: results });
        }
    );
});

router.get('/investments', (req, res) => {
    db.query(
        "SELECT * FROM transactions WHERE username = 'zipaladmin' AND type = 'withdraw' ORDER BY date DESC",
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ status: 'success', data: results });
        }
    );
});

module.exports = router;

