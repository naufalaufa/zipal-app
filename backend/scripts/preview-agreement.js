// QA sample only. Synthetic strokes do not represent either person's signature.
const fs = require('fs');
const path = require('path');
const { generateAgreementPdf } = require('../services/agreementPdf');
const { sampleSignature, template } = require('../tests/helpers/agreementFixture');
async function main() {
    const output = path.join(__dirname, '../../tmp/pdfs/agreement-preview.pdf');
    const content = { ...template, title: `${template.title} (CONTOH UJI)` };
    const pdf = await generateAgreementPdf({ content, number: 'CONTOH-UJI / ' + template.number, approvedAt: '2026-09-08T13:15:00Z', signatures: ['zihra', 'naufal'].map(party => ({ party, signature_image: sampleSignature(), signed_at: '2026-09-08T12:00:00Z' })) });
    fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, pdf);
    console.log(output);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
