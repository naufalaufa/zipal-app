const express = require('express');
const multer = require('multer');
const db = require('../config/db');
const authenticateToken = require('../middleware/auth');
const agreementUser = require('../middleware/agreementUser');
const { isAgreementAdmin } = require('../services/agreementPolicy');
const { MAX_FINAL_PDF_BYTES } = require('../services/agreementFiles');
const { createAgreementStore } = require('../services/agreementStore');
const store = createAgreementStore(db);
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FINAL_PDF_BYTES, files: 1, fields: 1, parts: 3 }, fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf' || !/\.pdf$/i.test(file.originalname)) return cb(Object.assign(new Error('Hanya file PDF yang diterima.'), { status: 400 }));
    cb(null, true);
} });

const respond = handler => async (req, res, next) => { try { await handler(req, res); } catch (error) { next(error); } };
// Temporary, data-free production diagnostic. Removed after the live query is verified.
router.get('/agreement-health-internal', respond(async (req, res) => {
    try {
        await store.status({ id: 0, username: 'zipaladmin', role: 'admin' });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, code: error.code || 'UNKNOWN', message: String(error.message || 'unknown').slice(0, 240) });
    }
}));
const adminOnly = (req, res, next) => isAgreementAdmin(req.agreementUser) ? next() : res.status(403).json({ message: 'Hanya ZipalAdmin yang dapat melakukan tindakan ini.' });
router.use('/agreement', authenticateToken, agreementUser, (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.get('/agreement/status', respond(async (req, res) => res.json({ status: 'success', data: await store.status(req.agreementUser) })));
router.post('/agreement/sign', respond(async (req, res) => {
    await store.sign(req.agreementUser, req.body);
    res.json({ status: 'success', message: 'Tanda tangan berhasil Apply dan dikunci.' });
}));
router.post('/agreement/approve', adminOnly, respond(async (req, res) => {
    await store.approve(req.agreementUser);
    res.json({ status: 'success', message: 'Perjanjian disahkan. PDF siap untuk e-Meterai.' });
}));
router.post('/agreement/final', adminOnly, upload.single('document'), respond(async (req, res) => {
    await store.finalize(req.agreementUser, req.file, req.body.confirmed);
    res.json({ status: 'success', message: 'Dokumen FINAL tersimpan dan dikunci.' });
}));
router.get('/agreement/pdf/:variant', respond(async (req, res) => {
    const pdf = await store.download(req.agreementUser, req.params.variant);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="Zipal-Agreement-' + req.params.variant + '.pdf"', 'X-Content-Type-Options': 'nosniff' });
    res.send(pdf);
}));
router.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const uploadError = error instanceof multer.MulterError;
    const status = uploadError ? (error.code === 'LIMIT_FILE_SIZE' ? 413 : 400) : error.status || 500;
    if (status === 500) console.error('Agreement error:', error.message);
    res.status(status).json({ message: uploadError ? 'Upload tidak valid. Gunakan satu PDF maksimum 4 MB.' : error.status ? error.message : 'Gagal memproses Agreement. Silakan coba lagi.' });
});
module.exports = router;
