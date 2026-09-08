const emailjs = require('@emailjs/nodejs').default;

const ACCOUNTS = {
    naufalaufa: { email: 'muhammadnaufalaufarifqi@gmail.com', service: 'EMAILJS_SERVICE_ID_NAUFAL', recipients: ['zihraangelina07@gmail.com'], toName: 'Zihra' },
    zihraangelina: { email: 'zihraangelina07@gmail.com', service: 'EMAILJS_SERVICE_ID_ZIHRA', recipients: ['muhammadnaufalaufarifqi@gmail.com'], toName: 'Naufal' },
    zipaladmin: { email: 'naufaldev001@gmail.com', service: 'EMAILJS_SERVICE_ID_ADMIN', recipients: ['muhammadnaufalaufarifqi@gmail.com', 'zihraangelina07@gmail.com'], toName: 'Naufal & Zihra' }
};

const DISPLAY_NAMES = {
    naufalaufa: 'Naufal',
    zihraangelina: 'Zihra',
    zipaladmin: 'Zipal Admin'
};

const TYPE_LABELS = {
    deposit: 'Deposit',
    withdraw: 'Withdraw'
};

const formatRupiah = amount =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount || 0);

const formatWaktu = dateStr =>
    new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(dateStr));

const sendTransactionEmail = async ({ username, type, amount, description, date, saldoSebelum, saldoSesudah, goalName }) => {
    if (!['deposit', 'withdraw'].includes(type)) return;
    if (!ACCOUNTS[username]) throw new Error('Pengirim tidak dikenal.');
    const account = ACCOUNTS[username];

    const serviceId = process.env[account.service];
    const templateId = process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY;

    if (!serviceId || !templateId || !publicKey || !privateKey) {
        throw new Error('Konfigurasi EmailJS pengirim belum lengkap.');
    }

    const actorName = DISPLAY_NAMES[username];
    const typeLabel = TYPE_LABELS[type] || type;

    const templateParams = {
        to_name: account.toName,
        to_email: account.recipients.join(','),
        from_name: actorName,
        from_email: account.email,
        reply_to: account.email,
        goal_name: goalName || '-',
        actor_name: actorName,
        transaction_type: typeLabel,
        amount: formatRupiah(amount),
        transaction_date: formatWaktu(date),
        balance_before: saldoSebelum != null ? formatRupiah(saldoSebelum) : '-',
        balance_after: saldoSesudah != null ? formatRupiah(saldoSesudah) : '-',
        description: description || '-',
        subject: `[Tabungan Zipal] ${typeLabel} Berhasil`
    };

    try {
        const response = await emailjs.send(serviceId, templateId, templateParams, { publicKey, privateKey });
        console.log(`✅ Email transaksi terkirim ke ${account.recipients.join(', ')} (status: ${response.status})`);
    } catch (error) {
        throw new Error(error?.text || error?.message || 'Gagal mengirim email via EmailJS');
    }
};

module.exports = { sendTransactionEmail };
