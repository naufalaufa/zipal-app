require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');
const { applyAuthorizedAgreementRevision } = require('./services/productionSchema');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const transactionRoutes = require('./routes/transactions');
const goalsRoutes = require('./routes/goals');
const agreementRoutes = require('./routes/agreement');
const seedRoutes = require('./routes/seed');

const app = express();
const PORT = process.env.PORT || 5000;
const agreementRevision = applyAuthorizedAgreementRevision(db).catch(error => {
    console.error('Authorized Agreement revision failed:', error.code || error.message);
    return { state:'error' };
});

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
app.get('/', async (req, res) => {
    const revision = await agreementRevision;
    res.set('X-Zipal-Agreement-Revision', 'contribution-v2');
    res.set('X-Zipal-Agreement-State', revision.state);
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
