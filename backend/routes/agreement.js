const express = require('express');
const db = require('../config/db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.get('/agreement/status', authenticateToken, (req, res) => {
    const sql = `
        SELECT users.username, agreement_signatures.signed_at, agreement_signatures.signature_image
        FROM agreement_signatures 
        JOIN users ON agreement_signatures.user_id = users.id
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        const signatures = {
            naufalaufa: false,
            naufal_img: null,
            zihraangelina: false,
            zihra_img: null,
            details: results
        };

        results.forEach(row => {
            if (row.username === 'naufalaufa') {
                signatures.naufalaufa = true;
                signatures.naufal_img = row.signature_image;
            }
            if (row.username === 'zihraangelina') {
                signatures.zihraangelina = true;
                signatures.zihra_img = row.signature_image;
            }
        });

        res.json({ status: 'success', data: signatures });
    });
});

router.post('/agreement/sign', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { signatureImage } = req.body;

    if (!signatureImage) {
        return res.status(400).json({
            status: 'fail',
            message: 'Gambar tanda tangan tidak dikirim!'
        });
    }

    db.query(
        'SELECT * FROM agreement_signatures WHERE user_id = ?',
        [userId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            if (results.length > 0) {
                db.query(
                    'UPDATE agreement_signatures SET signature_image = ?, signed_at = NOW() WHERE user_id = ?',
                    [signatureImage, userId],
                    err2 => {
                        if (err2)
                            return res.status(500).json({ error: err2.message });
                        return res.json({
                            status: 'success',
                            message: 'Tanda tangan diperbarui!'
                        });
                    }
                );
            } else {
                db.query(
                    'INSERT INTO agreement_signatures (user_id, signature_image) VALUES (?, ?)',
                    [userId, signatureImage],
                    err2 => {
                        if (err2)
                            return res.status(500).json({ error: err2.message });
                        res.json({
                            status: 'success',
                            message: 'Tanda tangan disimpan!'
                        });
                    }
                );
            }
        }
    );
});

module.exports = router;

