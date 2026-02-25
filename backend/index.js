const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const transactionRoutes = require('./routes/transactions');
const goalsRoutes = require('./routes/goals');
const agreementRoutes = require('./routes/agreement');
const seedRoutes = require('./routes/seed');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(
    cors({
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    })
);
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/public/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.get('/', (req, res) => {
    res.send('Zipal Backend is Running 🚀');
});

app.use(authRoutes);
app.use(adminRoutes);
app.use(profileRoutes);
app.use(transactionRoutes);
app.use(goalsRoutes);
app.use(agreementRoutes);
app.use(seedRoutes);

// START SERVER
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;