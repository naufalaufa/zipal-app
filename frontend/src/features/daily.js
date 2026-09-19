export const rupiah = value => new Intl.NumberFormat('id-ID', {
  style:'currency', currency:'IDR', minimumFractionDigits:0, maximumFractionDigits:0,
}).format(Number.isFinite(Number(value)) ? Number(value) : 0);

export const safeNumber = value => Number.isFinite(Number(value)) ? Number(value) : 0;

export const budgetStatus = (spent, budget) => {
  const actual = Math.max(safeNumber(spent),0); const limit = Math.max(safeNumber(budget),0);
  const percentage = limit > 0 ? actual / limit * 100 : (actual > 0 ? 100 : 0);
  if (limit === 0 && actual === 0) return { label:'Belum diatur', color:'default', percentage:0 };
  if (actual > limit) return { label:'Melebihi budget', color:'error', percentage };
  if (actual === limit) return { label:'Budget habis', color:'error', percentage:100 };
  if (percentage >= 80) return { label:'Hampir mencapai budget', color:'warning', percentage };
  return { label:'Aman', color:'success', percentage };
};

export const apiMessage = error => {
  if (!error.response) return 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.';
  if (error.response.data?.message) return error.response.data.message;
  return ({ 400:'Data yang dikirim belum valid.',401:'Sesi login berakhir.',403:'Anda tidak memiliki akses.',404:'Data tidak ditemukan.',422:'Data tidak dapat diproses.',500:'Terjadi gangguan pada server.' })[error.response.status] || 'Permintaan gagal. Silakan coba lagi.';
};

export const chartColors = ['#5b6ee1','#13a8a8','#f59e0b','#3b82f6','#ef4444','#d946ef','#22c55e','#8b5cf6','#64748b','#f97316','#94a3b8'];
