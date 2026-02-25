const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/sync-excel-data', (req, res) => {
    db.query('TRUNCATE TABLE transactions', err => {
        if (err) return res.status(500).json({ error: err.message });

        const values = [];

        for (let i = 3; i <= 12; i++) {
            values.push([
                'zihraangelina',
                'deposit',
                150000,
                `2024-${i}-01`,
                'Tabungan 2024'
            ]);
            const naufalAmt = i === 9 ? 250000 : 150000;
            values.push([
                'naufalaufa',
                'deposit',
                naufalAmt,
                `2024-${i}-01`,
                'Tabungan 2024'
            ]);
        }

        for (let i = 1; i <= 12; i++) {
            values.push([
                'zihraangelina',
                'deposit',
                150000,
                `2025-${i}-01`,
                'Tabungan 2025'
            ]);
            const naufalAmt = i === 12 ? 1250000 : 350000;
            values.push([
                'naufalaufa',
                'deposit',
                naufalAmt,
                `2025-${i}-01`,
                'Tabungan 2025'
            ]);
        }

        for (let i = 1; i <= 10; i++) {
            values.push([
                'naufalaufa',
                'deposit',
                1000000,
                `2026-${i}-01`,
                'Tabungan 2026'
            ]);
        }

        const sql =
            'INSERT INTO transactions (username, type, amount, date, description) VALUES ?';

        db.query(sql, [values], err2 => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({
                message: 'Data Reset Sukses! Total saldo kembali seperti semula.'
            });
        });
    });
});

module.exports = router;

