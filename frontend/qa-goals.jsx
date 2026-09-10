import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import Purpose from './src/pages/Purpose';
import FinancialAnalytics from './src/pages/FinancialAnalytics';
import PersonCompanion from './src/components/PersonCompanion';
import api from './src/api';
import './src/index.css';
import './src/automaticTheme.css';
const originalUser = sessionStorage.getItem('user');
sessionStorage.setItem('user', JSON.stringify({username:'QA',role:'admin'}));
window.addEventListener('pagehide', () => { if (originalUser === null) sessionStorage.removeItem('user'); else sessionStorage.setItem('user', originalUser); });
document.documentElement.dataset.theme='dark';
let goals = [
  {id:1,title:'QA Rumah',category:'PLANNED',target_date:'2027-02-28T00:00:00.000Z',target_amount:10000000,current_amount:5600000,progress:56,description:'Detail panjang untuk memeriksa drawer.',created_at:'2026-09-10',remaining_amount:4400000},
  {id:2,title:'QA Berkala',category:'RECURRING',next_due_date:'2026-12-31',cycle_type:'MONTHLY',target_amount:1000000,current_amount:200000,progress:20},
];
api.get = async path => ({data:{status:'success',data: path === '/goals' ? goals : path === '/goals/summary' ? {} : path === '/financial-analytics' ? {goals,categories:[{category:'PLANNED',amount:5600000},{category:'RECURRING',amount:200000}],trend:[{period:'Jul',balance:100,deposits:100},{period:'Aug',balance:300,deposits:200},{period:'Sep',balance:600,deposits:300}]} : goals.find(g => g.id === Number(path.split('/').pop()))}});
api.put = async (path,payload) => {goals=goals.map(g=>g.id===Number(path.split('/').pop())?{...g,...JSON.parse(JSON.stringify(payload))}:g);return {data:{status:'success'}};};
api.post = async () => ({data:{status:'success'}});
function QA(){ const [page,setPage]=React.useState('purpose');return <><button onClick={()=>setPage('purpose')}>QA Purpose</button><button onClick={()=>setPage('analytics')}>QA Analytics</button><span>Naufal <PersonCompanion name="naufalaufa"/> Zihra <PersonCompanion name="zihraangelina"/></span>{page==='purpose'?<Purpose/>:<FinancialAnalytics/>}</>; }
createRoot(document.getElementById('root')).render(<MemoryRouter><ConfigProvider theme={{algorithm:theme.darkAlgorithm}}><QA/></ConfigProvider></MemoryRouter>);
