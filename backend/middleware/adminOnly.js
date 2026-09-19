const createAdminOnly = db => async (req, res, next) => {
    try {
        const [rows] = await db.promise().query('SELECT role FROM users WHERE id=? LIMIT 1', [req.user.id]);
        if (rows[0]?.role !== 'admin') {
            return res.status(403).json({ message:'Hanya admin yang dapat mengubah data Daily.' });
        }
        next();
    } catch (error) {
        console.error('Admin role check failed', { user_id:req.user?.id, message:error.message });
        res.status(500).json({ message:'Gagal memverifikasi hak akses pengguna.' });
    }
};

module.exports = createAdminOnly;
