import { Button, Space, Tour } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { getSessionUser } from '../authSession';

const target=selector=>()=>document.querySelector(selector) || null;
const key=()=>`zipal-daily-tour-complete:${getSessionUser()?.id||'guest'}`;

export default function DailyGuidedTour({ ready, canManage }) {
  const [open,setOpen]=useState(false);
  useEffect(()=>{if(!ready||localStorage.getItem(key())==='1')return;const timer=window.setTimeout(()=>setOpen(true),550);return()=>window.clearTimeout(timer);},[ready]);
  const finish=()=>{localStorage.setItem(key(),'1');setOpen(false);};
  const steps=useMemo(()=>[
    {title:'Selamat datang di Daily 👋',description:'Daily digunakan untuk mengatur kebutuhan hidup sehari-hari dan pengeluaran bulanan seperti makan, transportasi, internet, listrik, laundry, toiletries, skincare, dan kebutuhan lainnya.',target:target('[data-daily-guide="header"]')},
    {title:'Saldo Daily',description:'Ini adalah saldo khusus untuk kebutuhan sehari-hari. Saldo Daily berdiri sendiri dan tidak memengaruhi Cash Available maupun saldo tabungan lainnya.',target:target('[data-daily-guide="balance"]')},
    ...(canManage?[
      {title:'Isi Saldo Daily',description:'Tambahkan dana operasional ke dompet Daily. Setelah itu, gunakan tombol Bagi Saldo untuk menentukan alokasi setiap kategori.',target:target('[data-daily-guide="topup"]')},
      {title:'Bagi Saldo',description:'Bagikan saldo Daily ke beberapa kategori sekaligus. Pembagian berlaku untuk bulan terpilih dan kembali Rp0 pada bulan baru.',target:target('[data-daily-guide="allocate"]')},
      {title:'Catat Pengeluaran',description:'Setiap pengeluaran harian dapat dicatat berdasarkan kategori agar penggunaan uang lebih mudah dipantau.',target:target('[data-daily-guide="expense"]')},
    ]:[]),
    {title:'Budget Kebutuhan',description:canManage?'Atur budget untuk setiap kebutuhan seperti makan, transportasi, internet, listrik, laundry, toiletries, dan lainnya.':'Lihat alokasi dan pemakaian setiap kategori untuk bulan yang dipilih.',target:target('[data-daily-guide="budgets"]')},
    {title:'Pantau Pola Pengeluaran',description:'Chart membantu melihat kategori mana yang paling banyak menggunakan budget dan bagaimana pola pengeluaran berubah setiap bulan.',target:target('[data-daily-guide="charts"]')},
    {title:'Dana Operasional Darurat',description:'Bagian ini menampilkan perkembangan Dana Operasional Darurat Rumah 1 Tahun dari halaman Purpose. Dana ini terpisah dari saldo Daily dan dipersiapkan sebagai cadangan ketika kondisi darurat.',target:target('[data-daily-guide="emergency"]')},
    {title:'Riwayat Daily',description:canManage?'Semua pengeluaran Daily dapat dilihat, dicari, diedit, dan dihapus dari bagian ini.':'Semua saldo dan pengeluaran Daily dapat dilihat dan dicari dari bagian ini.',target:target('[data-daily-guide="transactions"]')},
    {title:'Daily siap digunakan ✨',description:canManage?'Isi saldo Daily, bagi ke kategori, lalu catat kebutuhan sehari-hari agar pengeluaran bulanan tetap terpantau.':'Pantau saldo, alokasi, dan kebutuhan sehari-hari dari halaman ini.',target:target('[data-daily-guide="header"]'),nextButtonProps:{children:canManage?'Mulai Kelola Daily':'Mulai Lihat Daily'}},
  ].map(item=>({...item,prevButtonProps:{children:'Kembali'},nextButtonProps:item.nextButtonProps||{children:'Lanjut'}})),[canManage]);
  return <><Button icon={<QuestionCircleOutlined/>} onClick={()=>setOpen(true)}>Panduan</Button><Tour open={open} steps={steps} onClose={finish} onFinish={finish} mask={{color:'rgba(20,18,47,.58)'}} scrollIntoViewOptions={{block:'center'}} indicatorsRender={(current,total)=><span>{current+1} / {total}</span>} actionsRender={origin=><Space size={4}><Button type="text" size="small" onClick={finish}>Lewati</Button>{origin}</Space>}/></>;
}
