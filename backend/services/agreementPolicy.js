const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const partyFor = username => ({ zihraangelina: 'zihra', zihra: 'zihra', naufalaufa: 'naufal', naufal: 'naufal' })[username] || null;
const isAgreementAdmin = user => user?.username === 'zipaladmin' && user?.role === 'admin';
function assertMember(user) {
    if (!user || (!partyFor(user.username) && !isAgreementAdmin(user))) throw fail('Akses Agreement ditolak.', 403);
}
function assertSign(user, agreement, signatures, claimedUserId) {
    assertMember(user);
    const party = partyFor(user.username);
    if (!party || (claimedUserId != null && String(claimedUserId) !== String(user.id))) throw fail('Hanya pemilik yang boleh Apply tanda tangan.', 403);
    if (agreement.status !== 'DRAFT') throw fail('Perjanjian sudah dikunci dan tidak dapat ditandatangani ulang.', 409);
    if (signatures.some(item => item.party === party)) throw fail('Tanda tangan sudah Apply dan tidak dapat diubah.', 409);
    return party;
}
function assertApprove(user, agreement, signatures) {
    if (!isAgreementAdmin(user)) throw fail('Hanya ZipalAdmin yang dapat mengesahkan perjanjian.', 403);
    if (agreement.status !== 'DRAFT') throw fail('Perjanjian sudah pernah disahkan.', 409);
    if (!['zihra', 'naufal'].every(party => signatures.some(item => item.party === party && Number(item.applied) === 1))) throw fail('Kedua pihak harus Apply terlebih dahulu.', 409);
}
function assertFinalize(user, agreement) {
    if (!isAgreementAdmin(user)) throw fail('Hanya ZipalAdmin yang dapat mengunggah dokumen bermeterai.', 403);
    if (agreement.status !== 'WAITING_EMETERAI') throw fail('Dokumen hanya dapat diunggah saat menunggu e-Meterai. Dokumen FINAL terkunci.', 409);
}
module.exports = { fail, partyFor, isAgreementAdmin, assertMember, assertSign, assertApprove, assertFinalize };
