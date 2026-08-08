const emailjs = require('@emailjs/nodejs');

const RECIPIENT_MAP = {
    naufalaufa: { name: 'Zihra', email: 'zihraangelina32@gmail.com' },
    zihraangelina: { name: 'Naufal', email: 'muhammadnaufalaufarifqi@gmail.com' }
};

const DISPLAY_NAMES = {
    naufalaufa: 'Naufal',
    zihraangelina: 'Zihra'
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
    new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(dateStr));

const sendTransactionEmail = async ({ username, type, amount, description, date, saldoSebelum, saldoSesudah }) => {
    if (!['deposit', 'withdraw'].includes(type)) return;

    const recipient = RECIPIENT_MAP[username];
    if (!recipient) return;

    const serviceId = process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY;

    if (!serviceId || !templateId || !publicKey || !privateKey) {
        console.warn('⚠️ Email transaksi dilewati: kredensial EMAILJS_* belum lengkap di .env');
        return;
    }

    const actorName = DISPLAY_NAMES[username] || username;
    const typeLabel = TYPE_LABELS[type] || type;

    const templateParams = {
        to_name: recipient.name,
        to_email: recipient.email,
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
        console.log(`✅ Email transaksi terkirim ke ${recipient.email} (status: ${response.status})`);
    } catch (error) {
        throw new Error(error?.text || error?.message || 'Gagal mengirim email via EmailJS');
    }
};

module.exports = { sendTransactionEmail };
