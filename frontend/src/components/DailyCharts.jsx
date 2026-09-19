import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import { Empty } from 'antd';
import { chartColors, rupiah, safeNumber } from '../features/daily';

ChartJS.register(ArcElement,BarElement,CategoryScale,Filler,Legend,LinearScale,LineElement,PointElement,Tooltip);
const tooltip = { callbacks:{ label:context => `${context.dataset.label ? `${context.dataset.label}: ` : ''}${rupiah(context.raw)}` } };
const base = { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ usePointStyle:true, boxWidth:8 } },tooltip }, scales:{ y:{ beginAtZero:true,ticks:{ callback:value => value >= 1_000_000 ? `${value/1_000_000} jt` : value >= 1_000 ? `${value/1_000} rb` : value } } } };

export function CategoryExpenseChart({ categories }) {
  const rows=categories.filter(item=>safeNumber(item.spent_amount)>0); const total=rows.reduce((sum,item)=>sum+safeNumber(item.spent_amount),0);
  if (!rows.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Belum ada pengeluaran pada periode ini." />;
  const data={labels:rows.map(item=>item.name),datasets:[{data:rows.map(item=>safeNumber(item.spent_amount)),backgroundColor:rows.map((_,i)=>chartColors[i%chartColors.length]),borderWidth:2,borderColor:'#fff'}]};
  return <Doughnut data={data} options={{...base,cutout:'68%',scales:undefined,plugins:{...base.plugins,tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${rupiah(ctx.raw)} (${total?((ctx.raw/total)*100).toFixed(1):0}%)`}}}}} />;
}

export function BudgetActualChart({ categories }) {
  const rows=categories.filter(item=>safeNumber(item.budget_amount)>0||safeNumber(item.spent_amount)>0);
  if (!rows.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Atur budget kategori untuk melihat perbandingan." />;
  return <Bar data={{labels:rows.map(item=>item.name),datasets:[{label:'Budget',data:rows.map(item=>safeNumber(item.budget_amount)),backgroundColor:'#a5b4fc',borderRadius:6},{label:'Pengeluaran',data:rows.map(item=>safeNumber(item.spent_amount)),backgroundColor:'#5b6ee1',borderRadius:6}]}} options={{...base,scales:{...base.scales,x:{ticks:{maxRotation:45,minRotation:0}}}}} />;
}

const monthLabel=value=>new Intl.DateTimeFormat('id-ID',{month:'short'}).format(new Date(`${value}-01T00:00:00`));
export function SpendingTrendChart({ trend, selectedMonth }) {
  const [year,month]=selectedMonth.split('-').map(Number); const points=[]; const lookup=new Map(trend.map(item=>[item.period,safeNumber(item.amount)]));
  for(let offset=5;offset>=0;offset--){const date=new Date(Date.UTC(year,month-1-offset,1));const key=`${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}`;points.push({key,label:monthLabel(key),amount:lookup.get(key)||0});}
  return <Line data={{labels:points.map(item=>item.label),datasets:[{label:'Pengeluaran',data:points.map(item=>item.amount),borderColor:'#5b6ee1',backgroundColor:'rgba(91,110,225,.16)',fill:true,tension:.35,pointRadius:4}]}} options={base} />;
}
