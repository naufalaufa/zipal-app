import { useMemo, useState } from 'react';
import { Button, Tour } from 'antd';
import { CompassOutlined } from '@ant-design/icons';

const visibleTarget = selector => {
  const element = document.querySelector(selector);
  if (!element) return null;
  const box = element.getBoundingClientRect();
  return box.width > 0 && box.height > 0 ? element : null;
};
const visibleMenuTarget = selector => {
  const label = visibleTarget(selector);
  if (!label) return null;
  return label.closest('.ant-menu-item') || label;
};

const GuideTour = ({ role, isMobile, navigationOpen, onNavigationVisibilityChange }) => {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);

  const steps = useMemo(() => {
    const items = [
      {
        title: 'Selamat datang di Zipal 👋',
        description: 'Zipal adalah ruang bersama untuk mencatat tabungan Naufal dan Zihra, melihat ke mana uang digunakan, serta menjaga rencana keuangan tetap terarah.',
        target: () => visibleTarget('[data-guide="tour-trigger"]'),
      },
      {
        title: 'Cash Available dari Dashboard',
        description: 'Saldo ini berasal dari transaksi utama di Dashboard. Ikon mata hanya mengatur nominal Cash Available, sedangkan badge Dashboard membuka halaman sumbernya.',
        target: () => visibleTarget('[data-guide="cash-available"]'),
      },
      {
        title: 'Saldo tersedia dari Daily',
        description: 'Saldo ini belum dibagikan ke kategori Daily bulan berjalan. Ikon matanya berdiri sendiri, sedangkan badge Daily membuka halaman sumbernya.',
        target: () => visibleTarget('[data-guide="daily-available"]'),
      },
      {
        title: 'Dashboard — ruang kontrol utama',
        description: 'Gunakan halaman ini untuk melihat keadaan uang saat ini, Melihat Perkembangan dari zihra dan naufal total masuk dan total keluar, serta mencatat uang masuk atau keluar.',
        target: () => visibleMenuTarget('[data-guide="menu-dashboard"]'),
      },
      {
        title: 'History — buku catatan bersama',
        description: 'Semua uang masuk dan keluar tersusun di sini berdasarkan tanggal, pelaku, tujuan tabungan, nominal, dan keterangannya.',
        target: () => visibleMenuTarget('[data-guide="menu-history"]'),
      },
      {
        title: 'Daily — kebutuhan bulanan',
        description: 'Kelola saldo khusus kebutuhan harian, budget kategori, pengeluaran, dan pola belanja bulanan di sini.',
        target: () => visibleMenuTarget('[data-guide="menu-daily"]'),
      },
      {
        title: 'Investment — lemari aset',
        description: 'Gunakan halaman ini untuk melihat dana yang dialihkan menjadi investasi dan catatan asetnya. Pengguna biasa hanya melihat; pengelolaannya dilakukan oleh admin.',
        target: () => visibleMenuTarget('[data-guide="menu-investment"]'),
      },
      {
        title: 'Purpose — daftar tujuan masa depan',
        description: 'Di sinilah uang diberi tujuan, misalnya dana darurat, rencana terjadwal, kebutuhan berkala, aset masa depan, atau kebutuhan keluarga.',
        target: () => visibleMenuTarget('[data-guide="menu-purpose"]'),
      },
      {
        title: 'Analytics — membaca cerita di balik angka',
        description: 'Halaman ini membantu melihat perkembangan tabungan, perbandingan uang masuk dan keluar, kesehatan dana perlindungan, serta tujuan yang perlu diisi kembali.',
        target: () => visibleMenuTarget('[data-guide="menu-analytics"]'),
      },
      {
        title: 'Profile — identitas dan keamanan',
        description: 'Gunakan halaman ini untuk mengganti nama pengguna, foto profil, dan password akun.',
        target: () => visibleMenuTarget('[data-guide="menu-profile"]'),
      },
      {
        title: 'Agreement — aturan main bersama',
        description: 'Halaman ini menyimpan kesepakatan tabungan bersama. Kedua pihak membaca dan menandatangani, lalu admin mengesahkan serta menyimpan dokumen akhirnya.',
        target: () => visibleMenuTarget('[data-guide="menu-agreement"]'),
      },
      {
        title: 'Log Activities — jejak pintu masuk',
        description: role === 'admin'
          ? 'Khusus admin: halaman ini memperlihatkan siapa yang login dan kapan, sehingga aktivitas akses lebih mudah diperiksa.'
          : 'Halaman khusus admin untuk memeriksa siapa yang login dan kapan. Menu ini memang disembunyikan dari akun pengguna biasa.',
        target: () => visibleMenuTarget('[data-guide="menu-logs"]'),
      },
      {
        title: 'Panduan selalu bisa dibuka lagi',
        description: 'Kalau suatu saat lupa fungsi halaman, tekan tombol Panduan ini. Mulailah dari Dashboard untuk melihat kondisi hari ini, lalu gunakan Purpose dan Analytics untuk merencanakan langkah berikutnya.',
        target: () => visibleTarget('[data-guide="tour-trigger"]'),
      },
    ];

    return items.map((item, index) => ({
      ...item,
      prevButtonProps: { children: 'Kembali' },
      nextButtonProps: { children: index === items.length - 1 ? 'Selesai' : 'Lanjut' },
    }));
  }, [role]);

  const isNavigationStep = step => step >= 3 && step <= 11;
  const closeTour = () => {
    setOpen(false);
    setCurrent(0);
    if (isMobile) onNavigationVisibilityChange(false);
  };
  const openTour = () => {
    setCurrent(0);
    if (isMobile) onNavigationVisibilityChange(false);
    setOpen(true);
  };
  const changeStep = nextStep => {
    if (!isMobile) return setCurrent(nextStep);
    if (isNavigationStep(nextStep)) {
      if (!navigationOpen) {
        onNavigationVisibilityChange(true);
        window.setTimeout(() => setCurrent(nextStep), 320);
      } else setCurrent(nextStep);
      return;
    }
    onNavigationVisibilityChange(false);
    window.setTimeout(() => setCurrent(nextStep), navigationOpen ? 220 : 0);
  };

  return (
    <>
      <Button
        data-guide="tour-trigger"
        className="app-guide-button"
        type="primary"
        ghost
        icon={<CompassOutlined />}
        onClick={openTour}
        aria-label="Buka panduan penggunaan Zipal"
      >
        <span className="app-guide-button__label">Panduan</span>
      </Button>
      <Tour
        open={open}
        current={current}
        onChange={changeStep}
        onClose={closeTour}
        steps={steps}
        mask={{ color: 'rgba(20, 18, 47, 0.58)' }}
        indicatorsRender={(current, total) => <span>{current + 1} / {total}</span>}
        scrollIntoViewOptions={{ block: 'center' }}
      />
    </>
  );
};

export default GuideTour;
