const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2'); 
const multer = require('multer'); 
const path = require('path');     
const fs = require('fs');
const jwt = require('jsonwebtoken');

// --- 1. CONFIGURATION ---
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000; 

// Cloudinary Config
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- 2. MIDDLEWARE ---
app.use(cors({
    origin: true, 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],  
    credentials: true
}));

app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/public/uploads', express.static(path.join(__dirname, 'public/uploads')));

// --- 3. DATABASE CONNECTION ---
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

db.connect((err) => {
    if (err) console.error('❌ [DB Error] Gagal konek database:', err);
    else console.log('✅ Berhasil konek ke Database MySQL! 🐬');
});

// --- 4. UPLOAD STORAGE (Cloudinary) ---
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'zipal-avatars',
        allowed_formats: ['jpg', 'png', 'jpeg'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    },
});
const upload = multer({ storage: storage });

// --- 5. AUTH MIDDLEWARE (JWT Protection) ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.status(401).json({ message: "Token tidak ditemukan" });

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Token tidak valid" });
        req.user = user; 
        next();
    });
};

// ================= ROUTES =================

app.get('/', (req, res) => {
    res.send('Zipal Backend is Running 🚀');
});

// ------------------------------------------
// A. AUTHENTICATION & LOGGING (FITUR BARU)
// ------------------------------------------

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM users WHERE username = ? AND password = ?";

    db.query(sql, [username, password], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        if (result.length > 0) {
            const user = result[0];

            // Payload token
            const userPayload = { id: user.id, username: user.username };
            
            const accessToken = jwt.sign(userPayload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            const refreshToken = jwt.sign(userPayload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

            // 🔥 LOGGING: Catat login user
            const logSql = "INSERT INTO login_activities (user_id, username, role) VALUES (?, ?, ?)";
            
            db.query(logSql, [user.id, user.username, user.role], (logErr) => {
                if (logErr) console.error("❌ [ERROR LOG]", logErr.sqlMessage);
                else console.log(`✅ [SUKSES LOG] User ${user.username} login.`);
            });

            res.json({
                status: 'success',
                message: 'Login Berhasil!',
                accessToken, refreshToken,
                data: { id: user.id, username: user.username, role: user.role, avatar: user.avatar }
            });
        } else {
            res.status(401).json({ status: 'fail', message: 'Username atau Password salah!' });
        }
    });
});

app.post('/auth/check-username', (req, res) => {
    const { username } = req.body;
    db.query("SELECT id, username FROM users WHERE username = ?", [username], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.length > 0) res.json({ status: 'success', message: 'Username ditemukan', user: result[0] });
        else res.status(404).json({ status: 'fail', message: 'Username tidak terdaftar!' });
    });
});

app.post('/auth/reset-password', (req, res) => {
    const { username, newPassword } = req.body;
    if (!newPassword || newPassword.length < 3) return res.status(400).json({ status: 'fail', message: 'Password terlalu pendek!' });
    
    db.query("UPDATE users SET password = ? WHERE username = ?", [newPassword, username], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', message: 'Password berhasil diubah!' });
    });
});

// ------------------------------------------
// B. ADMIN LOGS VIEWER (FITUR BARU + AVATAR)
// ------------------------------------------

app.get('/admin/activity-logs', authenticateToken, (req, res) => {
    const userId = req.user.id;

    // Cek Role LANGSUNG KE DATABASE (Keamanan Tingkat Tinggi)
    const checkRoleSql = "SELECT role FROM users WHERE id = ?";
    
    db.query(checkRoleSql, [userId], (err, userResult) => {
        if (err) return res.status(500).json({ error: err.message });

        // Validasi: Apakah user ditemukan & Role-nya 'admin'?
        if (userResult.length === 0 || userResult[0].role !== 'admin') {
            return res.status(403).json({ status: 'fail', message: 'Akses Ditolak! Anda bukan Admin.' });
        }

        // Ambil Data Log + Join Avatar User
        const logSql = `
            SELECT login_activities.*, users.avatar 
            FROM login_activities 
            LEFT JOIN users ON login_activities.user_id = users.id 
            ORDER BY login_activities.login_at DESC
        `;
        
        db.query(logSql, (errLogs, logResults) => {
            if (errLogs) return res.status(500).json({ error: errLogs.message });
            res.json({ status: 'success', data: logResults });
        });
    });
});

// ------------------------------------------
// C. PROFILE
// ------------------------------------------

app.put('/profile', (req, res) => {
    upload.single('avatar')(req, res, (err) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });
        
        const { id, username, password } = req.body;
        const avatar = req.file ? req.file.path : null; 

        if (!id) return res.status(400).json({ status: 'fail', message: 'ID User tidak ditemukan!' });

        let sqlUpdate = "UPDATE users SET username = ?";
        let params = [username];

        if (password && password.trim() !== "") {
            sqlUpdate += ", password = ?";
            params.push(password);
        }
        if (avatar) {
            sqlUpdate += ", avatar = ?";
            params.push(avatar);
        }

        sqlUpdate += " WHERE id = ?";
        params.push(id);

        db.query(sqlUpdate, params, (err) => {
            if (err) return res.status(500).json({ status: 'error', message: err.message });
            
            db.query("SELECT * FROM users WHERE id = ?", [id], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ status: 'success', message: 'Profile berhasil diupdate!', user: rows[0] });
            });
        });
    });
});

// ------------------------------------------
// D. FINANCE & INVESTMENTS (RESTORED KE VERSI LAMA YANG BENAR) ✅
// ------------------------------------------

app.get('/summary', (req, res) => {
    // Query ini menghitung total deposit & withdraw per user
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

        let stats = {
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

        // INI YANG KEMARIN HILANG, SEKARANG SAYA KEMBALIKAN LENGKAP
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

app.post('/transaction', (req, res) => {
    const { username, type, amount, description } = req.body;
    const date = new Date().toISOString().slice(0, 10); 
    const sql = "INSERT INTO transactions (username, type, amount, date, description) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [username, type, amount, date, description], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', message: 'Transaksi berhasil disimpan!' });
    });
});

app.get('/history', (req, res) => {
    db.query("SELECT * FROM transactions ORDER BY date DESC, id DESC", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', data: results });
    });
});

app.get('/investments', (req, res) => {
    db.query("SELECT * FROM transactions WHERE username = 'zipaladmin' AND type = 'withdraw' ORDER BY date DESC", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', data: results });
    });
});

// ------------------------------------------
// E. GOALS
// ------------------------------------------

app.get('/goals', (req, res) => {
    db.query("SELECT * FROM financial_goals ORDER BY id ASC", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', data: results });
    });
});

app.post('/goals', (req, res) => {
    const { title, target_amount, collected_amount, description } = req.body;
    db.query("INSERT INTO financial_goals (title, target_amount, collected_amount, description) VALUES (?, ?, ?, ?)", 
        [title, target_amount, collected_amount || 0, description], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', message: 'Tujuan baru berhasil dibuat!' });
    });
});

app.put('/goals/:id', (req, res) => {
    const { id } = req.params;
    const { title, target_amount, collected_amount, description } = req.body;
    db.query("UPDATE financial_goals SET title=?, target_amount=?, collected_amount=?, description=? WHERE id=?", 
        [title, target_amount, collected_amount, description, id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', message: 'Tujuan berhasil diupdate!' });
    });
});

app.delete('/goals/:id', (req, res) => {
    db.query("DELETE FROM financial_goals WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', message: 'Tujuan berhasil dihapus!' });
    });
});

// ------------------------------------------
// F. AGREEMENT
// ------------------------------------------

app.get('/agreement/status', authenticateToken, (req, res) => {
    const sql = `
        SELECT users.username, agreement_signatures.signed_at, agreement_signatures.signature_image
        FROM agreement_signatures 
        JOIN users ON agreement_signatures.user_id = users.id
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let signatures = {
            naufalaufa: false, naufal_img: null,
            zihraangelina: false, zihra_img: null,
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

app.post('/agreement/sign', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { signatureImage } = req.body; 
    if (!signatureImage) return res.status(400).json({ status: 'fail', message: 'Gambar tanda tangan tidak dikirim!' });

    db.query("SELECT * FROM agreement_signatures WHERE user_id = ?", [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length > 0) {
             db.query("UPDATE agreement_signatures SET signature_image = ?, signed_at = NOW() WHERE user_id = ?", [signatureImage, userId], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                return res.json({ status: 'success', message: 'Tanda tangan diperbarui!' });
             });
        } else {
            db.query("INSERT INTO agreement_signatures (user_id, signature_image) VALUES (?, ?)", [userId, signatureImage], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ status: 'success', message: 'Tanda tangan disimpan!' });
            });
        }
    });
});

// ------------------------------------------
// G. SEED DATA (RESTORED KE VERSI 20 JUTA) ✅
// ------------------------------------------

app.get('/sync-excel-data', (req, res) => {
    db.query("TRUNCATE TABLE transactions", (err) => {
        if (err) return res.status(500).json({ error: err.message });

        let values = [];
        // Data 2024
        for (let i = 3; i <= 12; i++) {
            values.push(['zihraangelina', 'deposit', 150000, `2024-${i}-01`, 'Tabungan 2024']);
            let naufalAmt = (i === 9) ? 250000 : 150000;
            values.push(['naufalaufa', 'deposit', naufalAmt, `2024-${i}-01`, 'Tabungan 2024']);
        }
        // Data 2025
        for (let i = 1; i <= 12; i++) {
            values.push(['zihraangelina', 'deposit', 150000, `2025-${i}-01`, 'Tabungan 2025']);
            let naufalAmt = (i === 12) ? 1250000 : 350000;
            values.push(['naufalaufa', 'deposit', naufalAmt, `2025-${i}-01`, 'Tabungan 2025']);
        }
        // Data 2026 (Ini logika yang benar buat 20 Juta)
        for (let i = 1; i <= 10; i++) {
            values.push(['naufalaufa', 'deposit', 1000000, `2026-${i}-01`, 'Tabungan 2026']);
        }

        const sql = "INSERT INTO transactions (username, type, amount, date, description) VALUES ?";
        db.query(sql, [values], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Data Reset Sukses! Total saldo kembali seperti semula." });
        });
    });
});

// START SERVER
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;