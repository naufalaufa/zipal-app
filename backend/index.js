const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken'); 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use('/public/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ==================================================================
// KONFIGURASI DATABASE (VERSI SIMPLE - TEMBAK SSL LANGSUNG)
// ==================================================================

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Langsung pasang SSL di sini tanpa logic aneh-aneh
    ssl: {
        rejectUnauthorized: false
    }
};

// Tetap pakai createPool ya biar ga error "closed state" di Vercel
const db = mysql.createPool(dbConfig);

// Cek koneksi
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Error koneksi database:', err.message);
    } else {
        console.log('✅ Berhasil konek ke Database MySQL!');
        connection.release(); 
    }
});


// ==================================================================
// MIDDLEWARE JWT
// ==================================================================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ status: 'fail', message: 'Anda belum login (Token tidak ada)' });

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).json({ status: 'fail', message: 'Token tidak valid atau sudah expired' });
        
        req.user = user;
        next();
    });
}

// ==================================================================
// KONFIGURASI UPLOAD (MULTER)
// ==================================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'public/uploads/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, 'avatar-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// ==================================================================
// ENDPOINTS
// ==================================================================

app.get('/', (req, res) => {
    res.send('Halo Naufal & Zihra! Backend kalian sudah jalan. 🚀');
});

// --- LOGIN ---
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const sql = "SELECT * FROM users WHERE username = ? AND password = ?";
    db.query(sql, [username, password], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        if (result.length > 0) {
            const user = result[0];

            const userPayload = {
                id: user.id,
                username: user.username,
                role: user.role
            };

            const accessToken = jwt.sign(userPayload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
            const refreshToken = jwt.sign(userPayload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

            res.json({
                status: 'success',
                message: 'Login Berhasil!',
                accessToken: accessToken,
                refreshToken: refreshToken,
                data: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    avatar: user.avatar
                }
            });
        } else {
            res.status(401).json({ status: 'fail', message: 'Username atau Password salah!' });
        }
    });
});

// --- UPDATE PROFILE ---
app.put('/profile', authenticateToken, upload.single('avatar'), (req, res) => {
    const { id, username, password } = req.body;
    const avatar = req.file ? req.file.filename : null;

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

    db.query(sqlUpdate, params, (err, result) => {
        if (err) return res.status(500).json({ status: 'error', message: err.message });

        db.query("SELECT * FROM users WHERE id = ?", [id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ status: 'success', message: 'Profile berhasil diupdate!', user: rows[0] });
        });
    });
});

// --- SUMMARY ---
app.get('/summary', authenticateToken, (req, res) => {
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

// --- TRANSACTION ---
app.post('/transaction', authenticateToken, (req, res) => {
    const { username, type, amount, description } = req.body;
    const date = new Date().toISOString().slice(0, 10);

    const sql = "INSERT INTO transactions (username, type, amount, date, description) VALUES (?, ?, ?, ?, ?)";

    db.query(sql, [username, type, amount, date, description], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', message: 'Transaksi berhasil disimpan!' });
    });
});

// --- HISTORY ---
app.get('/history', authenticateToken, (req, res) => {
    const sql = "SELECT * FROM transactions ORDER BY date DESC, id DESC";

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', data: results });
    });
});

// --- GOALS ---
app.get('/goals', authenticateToken, (req, res) => {
    db.query("SELECT * FROM financial_goals ORDER BY id ASC", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', data: results });
    });
});

app.post('/goals', authenticateToken, (req, res) => {
    const { title, target_amount, collected_amount, description } = req.body;
    const sql = "INSERT INTO financial_goals (title, target_amount, collected_amount, description) VALUES (?, ?, ?, ?)";

    db.query(sql, [title, target_amount, collected_amount || 0, description], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', message: 'Tujuan baru berhasil dibuat!' });
    });
});

app.put('/goals/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { title, target_amount, collected_amount, description } = req.body;
    const sql = "UPDATE financial_goals SET title=?, target_amount=?, collected_amount=?, description=? WHERE id=?";

    db.query(sql, [title, target_amount, collected_amount, description, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', message: 'Tujuan berhasil diupdate!' });
    });
});

app.delete('/goals/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM financial_goals WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', message: 'Tujuan berhasil dihapus!' });
    });
});

// --- INVESTMENTS ---
app.get('/investments', authenticateToken, (req, res) => {
    const sql = "SELECT * FROM transactions WHERE username = 'zipaladmin' AND type = 'withdraw' ORDER BY date DESC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', data: results });
    });
});

// --- SYNC (Versi Simple) ---
app.get('/sync-excel-data', (req, res) => {
    res.json({message: "Fitur sync sementara dinonaktifkan di kode full version ini agar rapi."});
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;