const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const formatDate = value => new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value)) + ' WIB';
async function generateAgreementPdf({ content, number, signatures, approvedAt }) {
    const doc = await PDFDocument.create();
    doc.setTitle(content.title);
    doc.setSubject(`Perjanjian ${number} - dokumen untuk pembubuhan e-Meterai manual`);
    doc.setCreator('Zipal');
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const blue = rgb(0.08, 0.25, 0.42), gray = rgb(0.35, 0.38, 0.42);
    let page, y;
    const nextPage = () => {
        page = doc.addPage([595.28, 841.89]); y = 755;
        page.drawText('ZIPAL | PERJANJIAN TABUNGAN BERSAMA', { x: 48, y: 800, font: bold, size: 9, color: blue });
        page.drawText(number, { x: 48, y: 783, font: regular, size: 9, color: gray });
        page.drawLine({ start: { x: 48, y: 773 }, end: { x: 547, y: 773 }, color: rgb(0.85, 0.88, 0.91) });
    };
    function lines(text, font, size, width = 499) {
        return text.split('\n').flatMap(paragraph => {
            if (!paragraph) return [''];
            const result = []; let line = '';
            for (const word of paragraph.split(/\s+/)) {
                const candidate = line ? `${line} ${word}` : word;
                if (line && font.widthOfTextAtSize(candidate, size) > width) { result.push(line); line = word; }
                else line = candidate;
            }
            result.push(line); return result;
        });
    }
    function write(text, strong = false, size = 10.5) {
        const font = strong ? bold : regular;
        for (const line of lines(text, font, size)) {
            if (y < 65) nextPage();
            if (line) page.drawText(line, { x: 48, y, font, size, color: strong ? blue : gray });
            y -= 16;
        }
        y -= 8;
    }
    nextPage();
    write(content.title, true, 14);
    write(content.introduction);
    for (const party of content.parties) write(`${party.label}: ${party.name}`, true);
    write(content.preamble);
    for (const clause of content.clauses) {
        if (y < 120) nextPage();
        write(clause.title, true, 11);
        write(clause.content);
    }
    // A dedicated page keeps signatures and the meterai area together.
    nextPage();
    write('PERSETUJUAN DAN TANDA TANGAN', true, 14);
    write('Kedua pihak telah membaca dan menyetujui seluruh pasal perjanjian di atas.');
    write(`Disahkan oleh ZipalAdmin: ${formatDate(approvedAt)}`);
    const signatureTop = y - 20;
    for (let index = 0; index < content.parties.length; index++) {
        const party = content.parties[index];
        const signature = signatures.find(item => item.party === party.key);
        const x = index === 0 ? 48 : 317;
        page.drawText(party.label, { x, y: signatureTop, font: regular, size: 10, color: gray });
        const png = await doc.embedPng(signature.signature_image);
        const dimensions = png.scaleToFit(220, 95);
        page.drawImage(png, { x: x + (220 - dimensions.width) / 2, y: signatureTop - 110, ...dimensions });
        page.drawLine({ start: { x, y: signatureTop - 123 }, end: { x: x + 220, y: signatureTop - 123 }, color: gray });
        page.drawText(party.name, { x, y: signatureTop - 141, font: bold, size: 11, color: blue });
        page.drawText('Telah menandatangani', { x, y: signatureTop - 159, font: regular, size: 9, color: gray });
        page.drawText(formatDate(signature.signed_at), { x, y: signatureTop - 175, font: regular, size: 8, color: gray });
    }
    const stampY = signatureTop - 365;
    page.drawRectangle({ x: 230, y: stampY, width: 135, height: 135, borderWidth: 0.8, borderColor: rgb(0.65, 0.68, 0.72), borderDashArray: [4, 4] });
    page.drawText('AREA E-METERAI', { x: 250, y: stampY + 65, font: regular, size: 10, color: gray });
    page.drawText('Disediakan untuk pembubuhan e-Meterai melalui EZMeterai secara manual.', { x: 114, y: stampY - 22, font: regular, size: 8, color: gray });
    for (const [index, current] of doc.getPages().entries()) current.drawText(`${number} | Halaman ${index + 1} dari ${doc.getPageCount()}`, { x: 48, y: 32, font: regular, size: 8, color: gray });
    return Buffer.from(await doc.save());
}
module.exports = { generateAgreementPdf };
