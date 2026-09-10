import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Card, Col, Empty, List, Progress, Row, Segmented, Skeleton, Space, Statistic, Typography } from 'antd';
import { AreaChartOutlined, BulbOutlined, SafetyCertificateOutlined, WarningOutlined } from '@ant-design/icons';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { HeadNavbar } from '../components';
import api from '../api';
import AnalyticsChart from '../components/AnalyticsChart';
import useReducedMotion from '../useReducedMotion';
import { CATEGORIES, clampPercent, GoalStatusBadge, money, normalizeFinancialGoal, safeNumber } from '../features/financialGoals';
import '../features/financialGoals.css';

ChartJS.register(ArcElement, BarElement, CategoryScale, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip);
const colors = ['#1677ff','#69b1ff','#13c2c2','#52c41a','#eb2f96'];
const chartOptions = { responsive:true, maintainAspectRatio:false, animation: { duration:1000, easing:'easeOutQuart', animateRotate:true, animateScale:true }, plugins:{ legend:{ position:'bottom' } } };

export default function FinancialAnalytics() {
  const requestSequence = useRef(0);
  const reducedMotion = useReducedMotion();
  const animatedOptions = { ...chartOptions, animation: reducedMotion ? false : chartOptions.animation };
  const [period, setPeriod] = useState('6M'); const [data, setData] = useState({ goals:[], trend:[], categories:[], coverage:{} }); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { const request = ++requestSequence.current; setLoading(true); setError(''); try { const response = await api.get('/financial-analytics', { params:{ period } }); if (request !== requestSequence.current) return; const raw=response.data.data || {}; setData({ goals:(raw.goals || []).map(normalizeFinancialGoal), trend:Array.isArray(raw.trend)?raw.trend.map(row=>({...row,deposits:safeNumber(row.deposits),withdrawals:safeNumber(row.withdrawals),net:safeNumber(row.net),balance:safeNumber(row.balance)})):[], categories:Array.isArray(raw.categories)?raw.categories.map(item=>({...item,amount:safeNumber(item.amount)})):[], coverage:raw.coverage || {} }); } catch (e) { if (request !== requestSequence.current) return; console.error('Financial Analytics load failed:', e); setError('Gagal memuat Financial Analytics. Silakan coba lagi.'); } finally { if (request === requestSequence.current) setLoading(false); } }, [period]);
  useEffect(() => { load(); return () => { requestSequence.current += 1; }; }, [load]);
  const metrics = useMemo(() => {
    const balance = data.goals.reduce((sum,g) => sum + g.current_amount,0); const target = data.goals.reduce((sum,g) => sum + g.target_amount,0);
    const deposits = data.trend.reduce((sum,row) => sum + row.deposits,0); const withdrawals = data.trend.reduce((sum,row) => sum + row.withdrawals,0);
    const protections = data.goals.filter(g => g.category === 'PROTECTION'); const protectionTarget = protections.reduce((sum,g) => sum + g.target_amount,0);
    const protectionHealth = protectionTarget ? clampPercent(protections.reduce((sum,g) => sum + Math.min(g.current_amount,g.target_amount),0) / protectionTarget * 100) : 0;
    return { balance,target,deposits,withdrawals,net:deposits-withdrawals,progress:target ? balance/target*100:0,protectionHealth,
      refill:data.goals.filter(g => g.effective_status === 'NEEDS_REFILL'),completed:data.goals.filter(g => ['COMPLETED','TARGET_REACHED'].includes(g.effective_status)) };
  }, [data]);
  const insights = useMemo(() => {
    const items=[];
    if (metrics.protectionHealth != null && metrics.protectionHealth < 80) items.push({ icon:<WarningOutlined />, title:'Dana Proteksi Rendah', text:`Dana proteksi baru mencapai ${metrics.protectionHealth.toFixed(1)}% dari target.` });
    if (metrics.refill.length) { const largest=[...metrics.refill].sort((a,b)=>b.refill_deficit-a.refill_deficit)[0]; items.push({ icon:<SafetyCertificateOutlined />, title:'Prioritas Bulan Ini', text:`${largest.title} memiliki refill deficit terbesar: ${money(largest.refill_deficit)}.` }); }
    const asset=data.goals.find(g=>g.category==='ASSET' && g.progress>=100); if(asset) items.push({ icon:<BulbOutlined />,title:'Milestone Aset Tercapai',text:`${asset.title} sudah mencapai ${asset.progress.toFixed(1)}% dan dapat terus bertumbuh.` });
    if(data.trend.length>=2){const a=data.trend.at(-2).balance,b=data.trend.at(-1).balance;if(a>0)items.push({icon:<AreaChartOutlined />,title:'Savings Growth',text:`Saldo ${b>=a?'meningkat':'menurun'} ${Math.abs((b-a)/a*100).toFixed(1)}% dibanding periode sebelumnya.`});}
    return items;
  },[data,metrics]);
  if (error) return <div><HeadNavbar title="Financial Analytics" icon={<AreaChartOutlined />} description="Kesehatan dan perkembangan tujuan keuangan" /><main className="financial-page"><Alert type="error" showIcon message={error} /></main></div>;
  const lineData={labels:data.trend.map(x=>x.period),datasets:[{label:'Total saldo teralokasi',data:data.trend.map(x=>x.balance),borderColor:'#1677ff',backgroundColor:'rgba(22,119,255,.12)',fill:true,tension:.35}]};
  const barData={labels:data.trend.map(x=>x.period),datasets:[{label:'Deposit',data:data.trend.map(x=>x.deposits),backgroundColor:'#69b1ff'},{label:'Withdrawal',data:data.trend.map(x=>x.withdrawals),backgroundColor:'#ff7875'},{label:'Net Saving',data:data.trend.map(x=>x.net),backgroundColor:'#95de64'}]};
  const donutData={labels:data.categories.map(x=>CATEGORIES[x.category]?.short||x.category),datasets:[{data:data.categories.map(x=>x.amount),backgroundColor:colors,borderWidth:2}]};
  return <div><HeadNavbar title="Financial Analytics" icon={<AreaChartOutlined />} description="Kesehatan dan perkembangan tujuan keuangan" /><main className="financial-page">
    <div className="page-toolbar"><div><Typography.Title level={2} style={{margin:0}}>Financial Analytics</Typography.Title><Typography.Text type="secondary">Trend, distribusi, kesehatan, dan tindakan berikutnya.</Typography.Text></div><Segmented value={period} onChange={setPeriod} options={['1M','3M','6M','1Y','ALL']} /></div>
    {Number(data.coverage.total||0)>Number(data.coverage.allocated||0)&&<Alert className="coverage-note" type="info" showIcon message="Cakupan histori per-goal terbatas" description={`${data.coverage.allocated||0} dari ${data.coverage.total||0} transaksi memiliki alokasi goal. Grafik tidak mengarang alokasi transaksi legacy.`}/>} 
    <Row gutter={[12,12]} className="goal-summary">{[['Total Goal Balance',money(metrics.balance)],['Net Savings Growth',money(metrics.net)],['Total Deposit',money(metrics.deposits)],['Total Withdrawal',money(metrics.withdrawals)],['Overall Progress',`${metrics.progress.toFixed(1)}%`],['Protection Health',metrics.protectionHealth==null?'—':`${metrics.protectionHealth.toFixed(1)}%`],['Needs Refill',metrics.refill.length],['Completed',metrics.completed.length]].map(([t,v])=><Col xs={12} md={6} key={t}><Card size="small"><Skeleton loading={loading} paragraph={false}><Statistic title={t} value={v}/></Skeleton></Card></Col>)}</Row>
    <Row gutter={[16,16]} className="analytics-grid"><Col xs={24} xl={14}><Card title="Savings Growth"><AnalyticsChart loading={loading}>{data.trend.length?<Line data={lineData} options={animatedOptions}/>:<Empty description="Belum ada data trend teralokasi"/>}</AnalyticsChart></Card></Col><Col xs={24} xl={10}><Card title="Asset Allocation"><AnalyticsChart loading={loading}>{metrics.balance?<Doughnut data={donutData} options={animatedOptions}/>:<Empty description="Belum ada saldo goal"/>}</AnalyticsChart></Card></Col>
      <Col xs={24} xl={14}><Card title="Deposit vs Withdrawal"><AnalyticsChart loading={loading}>{data.trend.length?<Bar data={barData} options={animatedOptions}/>:<Empty description="Belum ada transaksi teralokasi"/>}</AnalyticsChart></Card></Col>
      <Col xs={24} xl={10}><Card title="Protection Health"><Space direction="vertical" style={{width:'100%'}}>{metrics.protectionHealth!=null&&<Progress type="dashboard" percent={Number(metrics.protectionHealth.toFixed(1))}/>} {data.goals.filter(g=>g.category==='PROTECTION').map(g=><div key={g.id}><Space style={{justifyContent:'space-between',width:'100%'}}><span>{g.title}</span><span>{g.progress.toFixed(1)}%</span></Space><Progress percent={Math.min(g.progress,100)} showInfo={false}/></div>)}</Space></Card></Col>
      <Col xs={24} lg={12}><Card title="Goal Progress"><List dataSource={[...data.goals].sort((a,b)=>b.progress-a.progress)} locale={{emptyText:'Belum ada goal'}} renderItem={g=><List.Item extra={<GoalStatusBadge status={g.effective_status}/>}><List.Item.Meta title={g.title} description={<Progress percent={Math.min(g.progress,100)} format={()=>`${g.progress.toFixed(1)}%`}/>} /></List.Item>}/></Card></Col>
      <Col xs={24} lg={12}><Card title="Refill Analytics"><Statistic title="Total Refill Deficit" value={money(metrics.refill.reduce((s,g)=>s+g.refill_deficit,0))}/><List dataSource={[...metrics.refill].sort((a,b)=>b.refill_deficit-a.refill_deficit)} locale={{emptyText:'Tidak ada goal yang membutuhkan refill'}} renderItem={g=><List.Item extra={money(g.refill_deficit)}>{g.title}</List.Item>}/></Card></Col>
      <Col span={24}><Card title="Financial Insights" className="insight-list"><List dataSource={insights} locale={{emptyText:'Belum cukup data untuk menghasilkan insight.'}} renderItem={item=><List.Item><List.Item.Meta avatar={item.icon} title={item.title} description={item.text}/></List.Item>}/></Card></Col>
    </Row>
  </main></div>;
}
