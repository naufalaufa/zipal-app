const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2'); 
const multer = require('multer'); 
const path = require('path');     
const fs = require('fs');         

dotenv.config();

const app = express();
const PORT = 5000; 

app.use(express.json()); 
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use('/public/uploads', express.static(path.join(__dirname, 'public/uploads')));

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

db.connect((err) => {
    if (err) {
        console.error('Error koneksi database:', err);
    } else {
        console.log('Berhasil konek ke Database MySQL! 🐬');
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'public/uploads/';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, 'avatar-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// --- UPDATE PROFILE ENDPOINT (SUDAH DIPERBAIKI) ---
app.put('/profile', upload.single('avatar'), (req, res) => {
    console.log("📥 Request Update Profile Masuk...");
    
    const { id, username, password } = req.body;
    const avatar = req.file ? req.file.filename : null;

    if (!id) {
        return res.status(400).json({ status: 'fail', message: 'ID User tidak ditemukan!' });
    }

    // 1. Mulai query dasar (Username selalu diupdate)
    let sqlUpdate = "UPDATE users SET username = ?";
    let params = [username];

    // 2. CEK: Apakah user mengirim password baru?
    // Hanya update password jika string tidak kosong
    if (password && password.trim() !== "") {
        sqlUpdate += ", password = ?";
        params.push(password);
    }

    // 3. CEK: Apakah user upload avatar baru?
    if (avatar) {
        sqlUpdate += ", avatar = ?";
        params.push(avatar);
    }

    // 4. Tambahkan WHERE id di akhir
    sqlUpdate += " WHERE id = ?";
    params.push(id);

    // Eksekusi Query
    db.query(sqlUpdate, params, (err, result) => {
        if (err) {
            console.error("❌ MySQL Error:", err);
            return res.status(500).json({ status: 'error', message: err.message });
        }

        // Ambil data user terbaru untuk dikirim balik ke frontend
        db.query("SELECT * FROM users WHERE id = ?", [id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            
            console.log("✅ Profile Berhasil Diupdate untuk:", rows[0].username);
            
            res.json({
                status: 'success',
                message: 'Profile berhasil diupdate!',
                user: rows[0]
            });
        });
    });
});
// --------------------------------------------------

app.get('/', (req, res) => {
    res.send('Halo Naufal & Zihra! Backend kalian sudah jalan. 🚀');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const sql = "SELECT * FROM users WHERE username = ? AND password = ?";

    db.query(sql, [username, password], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (result.length > 0) {
            const user = result[0]; 

            res.json({
                status: 'success',
                message: 'Login Berhasil!',
                data: {
                    id: user.id,
                    username: user.username,
                    role: user.role, 
                    avatar: user.avatar 
                }
            });
        } else {
            res.status(401).json({
                status: 'fail',
                message: 'Username atau Password salah!'
            });
        }
    });
});

app.get('/summary', (req, res) => {
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

app.post('/transaction', (req, res) => {
    const { username, type, amount, description } = req.body;
    const date = new Date().toISOString().slice(0, 10); 

    const sql = "INSERT INTO transactions (username, type, amount, date, description) VALUES (?, ?, ?, ?, ?)";
    
    db.query(sql, [username, type, amount, date, description], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', message: 'Transaksi berhasil disimpan!' });
    });
});

app.get('/seed-excel-data', (req, res) => {
    db.query("TRUNCATE TABLE transactions", (err) => {
        if (err) return res.status(500).send(err);

        let values = [];

        for (let i = 3; i <= 12; i++) { 
            values.push(['zihraangelina', 'deposit', 150000, `2024-${i}-01`, 'Tabungan 2024']);
            let naufalAmount = (i === 9) ? 250000 : 150000; 
            values.push(['naufalaufa', 'deposit', naufalAmount, `2024-${i}-01`, 'Tabungan 2024']);
        }

        for (let i = 1; i <= 12; i++) {
            values.push(['zihraangelina', 'deposit', 150000, `2025-${i}-01`, 'Tabungan 2025']);
            let naufalAmount = (i === 12) ? 1250000 : 350000; 
            values.push(['naufalaufa', 'deposit', naufalAmount, `2025-${i}-01`, 'Tabungan 2025']);
        }

        for (let i = 1; i <= 10; i++) {
            values.push(['naufalaufa', 'deposit', 1000000, `2026-${i}-01`, 'Tabungan 2026']);
        }

        const sql = "INSERT INTO transactions (username, type, amount, date, description) VALUES ?";
        db.query(sql, [values], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Sukses! Data Excel sudah masuk ke Database. Total sekarang 20 Juta." });
        });
    });
});


app.get('/sync-excel-data', (req, res) => {
    db.query("TRUNCATE TABLE transactions", (err) => {
        if (err) return res.status(500).json({ error: err.message });

        let sql = "INSERT INTO transactions (username, type, amount, date, description) VALUES ?";
        let values = [];

        for (let i = 3; i <= 12; i++) {
            values.push(['zihraangelina', 'deposit', 150000, `2024-${i}-01`, 'Tabungan 2024']);
            let naufalAmt = (i === 9) ? 250000 : 150000;
            values.push(['naufalaufa', 'deposit', naufalAmt, `2024-${i}-01`, 'Tabungan 2024']);
        }

        for (let i = 1; i <= 12; i++) {
            values.push(['zihraangelina', 'deposit', 150000, `2025-${i}-01`, 'Tabungan 2025']);
            let naufalAmt = (i === 12) ? 1250000 : 350000;
            values.push(['naufalaufa', 'deposit', naufalAmt, `2025-${i}-01`, 'Tabungan 2025']);
        }

        for (let i = 1; i <= 10; i++) {
            values.push(['naufalaufa', 'deposit', 1000000, `2026-${i}-01`, 'Tabungan 2026']);
        }

        db.query(sql, [values], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Data Excel berhasil disinkronkan ke Database! Total sudah Rp 20.000.000 🚀" });
        });
    });
});

app.get('/history', (req, res) => {
    const sql = "SELECT * FROM transactions ORDER BY date DESC, id DESC";

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({
            status: 'success',
            data: results
        });
    });
});

app.get('/goals', (req, res) => {
    db.query("SELECT * FROM financial_goals ORDER BY id ASC", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', data: results });
    });
});

app.post('/goals', (req, res) => {
    const { title, target_amount, collected_amount, description } = req.body;
    const sql = "INSERT INTO financial_goals (title, target_amount, collected_amount, description) VALUES (?, ?, ?, ?)";
    
    db.query(sql, [title, target_amount, collected_amount || 0, description], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', message: 'Tujuan baru berhasil dibuat!' });
    });
});

app.put('/goals/:id', (req, res) => {
    const { id } = req.params;
    const { title, target_amount, collected_amount, description } = req.body;
    const sql = "UPDATE financial_goals SET title=?, target_amount=?, collected_amount=?, description=? WHERE id=?";

    db.query(sql, [title, target_amount, collected_amount, description, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', message: 'Tujuan berhasil diupdate!' });
    });
});

app.delete('/goals/:id', (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM financial_goals WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', message: 'Tujuan berhasil dihapus!' });
    });
});


app.get('/investments', (req, res) => {
    const sql = "SELECT * FROM transactions WHERE username = 'zipaladmin' AND type = 'withdraw' ORDER BY date DESC";

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', data: results });
    });
});

app.listen(PORT, '0.0.0.0' , () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;