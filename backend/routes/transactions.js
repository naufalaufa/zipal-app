const express = require('express');
const db = require('../config/db');

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

router.post('/transaction', (req, res) => {
    const { username, type, amount, description } = req.body;
    const date = new Date().toISOString().slice(0, 10);
    const sql =
        'INSERT INTO transactions (username, type, amount, date, description) VALUES (?, ?, ?, ?, ?)';

    db.query(sql, [username, type, amount, date, description], err => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            status: 'success',
            message: 'Transaksi berhasil disimpan!'
        });
    });
});

router.delete('/transaction/cancel-last/:username', (req, res) => {
    const { username } = req.params;

    const findLastId =
        "SELECT id FROM transactions WHERE username = ? AND type = 'deposit' ORDER BY id DESC LIMIT 1";

    db.query(findLastId, [username], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.length === 0) {
            return res.status(404).json({
                status: 'fail',
                message: 'Tidak ada deposit ditemukan!'
            });
        }

        const lastId = result[0].id;

        db.query('DELETE FROM transactions WHERE id = ?', [lastId], deleteErr => {
            if (deleteErr)
                return res.status(500).json({ error: deleteErr.message });
            res.json({
                status: 'success',
                message: 'Deposit terakhir berhasil dibatalkan!'
            });
        });
    });
});

router.get('/transaction/last/:username', (req, res) => {
    const { username } = req.params;
    const sql =
        "SELECT * FROM transactions WHERE username = ? AND type = 'deposit' ORDER BY id DESC LIMIT 1";

    db.query(sql, [username], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.length > 0) {
            res.json({ status: 'success', data: result[0] });
        } else {
            res.status(404).json({ message: 'Belum ada deposit.' });
        }
    });
});

router.put('/transaction/:id', (req, res) => {
    const { id } = req.params;
    const { amount, description } = req.body;
    const sql = 'UPDATE transactions SET amount = ?, description = ? WHERE id = ?';

    db.query(sql, [amount, description, id], err => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            status: 'success',
            message: 'Data berhasil diperbarui!'
        });
    });
});

router.get('/history', (req, res) => {
    db.query(
        'SELECT * FROM transactions ORDER BY date DESC, id DESC',
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

