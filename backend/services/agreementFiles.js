const { PNG } = require('pngjs');
const { PDFDocument, PDFDict, PDFArray } = require('pdf-lib');
const { fail } = require('./agreementPolicy');
// Fits the current Vercel request limit, including multipart overhead.
const MAX_FINAL_PDF_BYTES = 4 * 1024 * 1024;

function validateSignature(image) {
    if (typeof image !== 'string' || image.length > 90000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) throw fail('Tanda tangan harus berupa gambar PNG yang valid.');
    const bytes = Buffer.from(image.split(',')[1], 'base64');
    if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw fail('Format tanda tangan tidak valid.');
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    if (width < 20 || height < 20 || width > 1000 || height > 400) throw fail('Ukuran tanda tangan tidak valid.');
    let png;
    try { png = PNG.sync.read(bytes, { checkCRC: true }); }
    catch { throw fail('Gambar tanda tangan rusak.'); }
    let ink = 0;
    for (let i = 0; i < png.data.length; i += 4) {
        if (png.data[i + 3] > 100 && Math.min(png.data[i], png.data[i + 1], png.data[i + 2]) < 180) ink++;
    }
    if (ink < 20) throw fail('Canvas tanda tangan masih kosong.');
    return `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;
}

async function validateFinalPdf(file) {
    if (!file || file.mimetype !== 'application/pdf' || !/\.pdf$/i.test(file.originalname || '')) throw fail('Pilih dokumen PDF bermeterai.');
    const bytes = file.buffer;
    if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_FINAL_PDF_BYTES) throw fail('Ukuran PDF maksimum 4 MB.', 413);
    if (bytes.subarray(0, 5).toString() !== '%PDF-' || !bytes.subarray(-2048).includes(Buffer.from('%%EOF'))) throw fail('Isi file bukan PDF yang valid.');
    try {
        const doc = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: true });
        if (!doc.getPageCount() || doc.getPageCount() > 30) throw new Error('pages');
        const forbidden = new Set(['JavaScript', 'JS', 'AA', 'Launch', 'EmbeddedFiles', 'RichMedia']);
        const seen = new Set();
        function inspect(object) {
            const value = object instanceof PDFDict || object instanceof PDFArray ? object : object.dict || object;
            if (seen.has(value)) return;
            seen.add(value);
            if (value instanceof PDFDict) {
                for (const [key, entry] of value.entries()) {
                    if (forbidden.has(key.decodeText()) || (key.decodeText() === 'S' && ['/JavaScript', '/Launch'].includes(entry.toString()))) throw new Error('active content');
                    inspect(entry);
                }
            } else if (value instanceof PDFArray) value.asArray().forEach(inspect);
        }
        for (const [, object] of doc.context.enumerateIndirectObjects()) inspect(object);
    } catch { throw fail('PDF rusak, terkunci, terlalu banyak halaman, atau berisi konten aktif. Gunakan PDF standar.'); }
    // Never re-save a stamped PDF: that could invalidate its cryptographic signature.
    return bytes;
}
module.exports = { validateSignature, validateFinalPdf, MAX_FINAL_PDF_BYTES };
