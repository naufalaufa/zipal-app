const db = require('../config/db');
const { assertMember } = require('../services/agreementPolicy');

// JWT supplies only an ID; current username/role come from the database.
module.exports = async (req, res, next) => {
    try {
        const [rows] = await db.promise().query('SELECT id, username, role FROM users WHERE id = ?', [req.user.id]);
        assertMember(rows[0]);
        req.agreementUser = rows[0];
        next();
    } catch (error) {
        res.status(error.status || 500).json({ message: error.status ? error.message : 'Gagal memeriksa akun.' });
    }
};
