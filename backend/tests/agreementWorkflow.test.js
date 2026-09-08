const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PDFDocument, PDFName, PDFString } = require('pdf-lib');
const { validateSignature, validateFinalPdf, MAX_FINAL_PDF_BYTES } = require('../services/agreementFiles');
const { createAgreementStore } = require('../services/agreementStore');
const { generateAgreementPdf } = require('../services/agreementPdf');
const { sampleSignature, memoryPool, users, hash } = require('./helpers/agreementFixture');
const payload = () => ({ signatureImage: sampleSignature(), agreement_id: 1, content_hash: hash, consent: true });
const file = buffer => ({ buffer, mimetype: 'application/pdf', originalname: 'perjanjian.pdf' });

test('PNG signature validation rejects empty, spoofed and oversized input', () => {
    assert.throws(() => validateSignature(sampleSignature(true)), /kosong/);
    assert.throws(() => validateSignature('data:image/svg+xml;base64,PHN2Zz4='));
    assert.throws(() => validateSignature('data:image/png;base64,' + 'A'.repeat(100000)));
    assert.ok(validateSignature(sampleSignature()).startsWith('data:image/png;base64,'));
});
test('workflow persists signatures, serializes approval, and locks FINAL', async () => {
    const { pool, state } = memoryPool();
    const store = createAgreementStore(pool);
    await assert.rejects(store.approve(users[2]), { status: 409 });
    await assert.rejects(store.sign(users[0], { ...payload(), user_id: 2 }), { status: 403 });
    await assert.rejects(store.sign(users[0], { ...payload(), party: 'naufal' }), { status: 403 });
    await assert.rejects(store.sign(users[0], { ...payload(), content_hash: 'stale' }), { status: 409 });
    await assert.rejects(store.sign(users[0], { ...payload(), consent: false }), { status: 409 });
    await store.sign(users[0], payload());
    await assert.rejects(store.sign(users[0], payload()), { status: 409 });
    assert.equal((await createAgreementStore(pool).status(users[1])).signatures.length, 1);
    await store.sign(users[1], payload());
    await assert.rejects(store.approve(users[0]), { status: 403 });
    const approvals = await Promise.allSettled([store.approve(users[2]), store.approve(users[2])]);
    assert.equal(approvals.filter(item => item.status === 'fulfilled').length, 1);
    assert.equal(state.agreement.status, 'WAITING_EMETERAI');
    const original = await store.download(users[0], 'draft');
    assert.ok((await PDFDocument.load(original)).getPageCount() >= 2);
    await assert.rejects(store.finalize(users[2], file(original), 'true'), /sama/);
    // Simulate a provider-returned PDF without claiming an actual e-Meterai.
    const stamped = await PDFDocument.load(original); stamped.setSubject('TEST returned document');
    const returned = Buffer.from(await stamped.save());
    await assert.rejects(store.finalize(users[0], file(returned), 'true'), { status: 403 });
    await store.finalize(users[2], file(returned), 'true');
    assert.equal(state.agreement.status, 'FINAL');
    assert.deepEqual(await store.download(users[1], 'final'), returned);
    await assert.rejects(store.finalize(users[2], file(returned), 'true'), { status: 409 });
    await assert.rejects(store.sign(users[1], payload()), { status: 409 });
    await assert.rejects(store.approve(users[2]), { status: 409 });
});
test('PDF generation failure rolls back approval and preserves both signatures', async () => {
    const { pool, state } = memoryPool();
    const store = createAgreementStore(pool, async () => { throw new Error('PDF failed'); });
    await store.sign(users[0], payload()); await store.sign(users[1], payload());
    await assert.rejects(store.approve(users[2]), /PDF failed/);
    assert.equal(state.agreement.status, 'DRAFT');
    assert.equal(state.signatures.length, 2);
});
test('PDF upload checks actual bytes, size, encryption/active content, and preserves valid bytes', async () => {
    await assert.rejects(validateFinalPdf(file(Buffer.from('%PDF-fake %%EOF'))));
    await assert.rejects(validateFinalPdf(file(Buffer.alloc(MAX_FINAL_PDF_BYTES + 1))), { status: 413 });
    const pdf = await PDFDocument.create(); pdf.addPage();
    const bytes = Buffer.from(await pdf.save());
    await assert.rejects(validateFinalPdf({ ...file(bytes), mimetype: 'image/png' }));
    assert.deepEqual(await validateFinalPdf(file(bytes)), bytes);
    pdf.catalog.set(PDFName.of('OpenAction'), pdf.context.obj([pdf.getPages()[0].ref, 'Fit']));
    await assert.doesNotReject(validateFinalPdf(file(Buffer.from(await pdf.save()))));
    pdf.catalog.set(PDFName.of('OpenAction'), pdf.context.obj({ S: 'JavaScript', JS: PDFString.of('alert(1)') }));
    await assert.rejects(validateFinalPdf(file(Buffer.from(await pdf.save()))));
});
test('exported PDF has multiple pages and both signature image resources', async () => {
    const { template } = require('./helpers/agreementFixture');
    const signature = sampleSignature();
    const bytes = await generateAgreementPdf({ content: template, number: template.number, approvedAt: '2026-09-08T13:15:00Z', signatures: ['zihra', 'naufal'].map(party => ({ party, signature_image: signature, signed_at: '2026-09-08T12:00:00Z' })) });
    const pdf = await PDFDocument.load(bytes);
    assert.ok(pdf.getPageCount() >= 2);
    assert.equal(pdf.getTitle(), template.title);
    const last = pdf.getPages().at(-1);
    assert.ok(last.node.Resources().lookup(PDFName.of('XObject')).keys().length >= 2);
});
