import { Button, DatePicker, Empty, Input, Popconfirm, Select, Space, Table, Tag, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { rupiah } from '../features/daily';

export default function DailyTransactionTable({ rows, loading, pagination, categories, filters, onFilters, onPage, onEdit, onDelete, canManage }) {
  const hasActions=canManage&&rows.some(row=>row.type==='EXPENSE');
  const columns=[
    {title:'Tanggal',dataIndex:'transaction_date',width:125,render:value=>dayjs(value).format('DD MMM YYYY')},
    {title:'Kategori',dataIndex:'category_name',width:180,render:(value,row)=>row.type==='CREDIT'?<Tag color="green">Saldo Daily</Tag>:<Tag color="blue">{value}</Tag>},
    {title:'Deskripsi',dataIndex:'description',ellipsis:true,render:(value,row)=><div><strong>{value}</strong>{row.notes&&<div className="daily-table-note">{row.notes}</div>}</div>},
    {title:'Nominal',dataIndex:'amount',align:'right',width:145,render:(value,row)=><strong className={row.type==='CREDIT'?'daily-credit':'daily-expense'}>{row.type==='CREDIT'?'+':'−'} {rupiah(value)}</strong>},
    {title:'Dibuat Oleh',dataIndex:'created_by_name',width:130},
    ...(hasActions?[{title:'Action',key:'action',width:100,fixed:'right',render:(_,row)=>row.type==='EXPENSE'?<Space size={2}>
      <Tooltip title="Edit"><Button type="text" icon={<EditOutlined/>} onClick={()=>onEdit(row)} aria-label={`Edit ${row.description}`}/></Tooltip>
      <Popconfirm title="Hapus transaksi?" description={`${row.description} sebesar ${rupiah(row.amount)} akan dihapus. Tindakan ini tidak dapat dibatalkan.`} okText="Hapus" cancelText="Batal" okButtonProps={{danger:true}} onConfirm={()=>onDelete(row)}><Tooltip title="Hapus"><Button danger type="text" icon={<DeleteOutlined/>} aria-label={`Hapus ${row.description}`}/></Tooltip></Popconfirm>
    </Space>:null}]:[]),
  ];
  return <section className="daily-section" data-daily-guide="transactions"><div className="daily-section-heading"><div><h2>Transaksi Daily</h2><p>Ledger saldo dan pengeluaran pada periode terpilih.</p></div></div>
    <div className="daily-filters">
      <Input allowClear prefix={<SearchOutlined/>} placeholder="Cari deskripsi atau catatan" value={filters.search} onChange={event=>onFilters({...filters,search:event.target.value,page:1})}/>
      <Select allowClear placeholder="Semua kategori" value={filters.category_id||undefined} options={categories.map(item=>({value:item.id,label:item.name}))} onChange={value=>onFilters({...filters,category_id:value||'',page:1})}/>
      <DatePicker.RangePicker value={filters.dates?.length===2?filters.dates.map(dayjs):null} format="DD MMM YYYY" onChange={values=>onFilters({...filters,dates:values?values.map(value=>value.format('YYYY-MM-DD')):[],page:1})}/>
      <Select value={filters.sort} onChange={value=>onFilters({...filters,sort:value,page:1})} options={[{value:'newest',label:'Terbaru'},{value:'oldest',label:'Terlama'}]}/>
    </div>
    <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} scroll={{x:hasActions?850:750}} locale={{emptyText:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Belum ada transaksi Daily pada periode ini."/>}} pagination={{current:pagination.page,pageSize:pagination.page_size,total:pagination.total,showSizeChanger:true,pageSizeOptions:[10,20,50],showTotal:total=>`${total} transaksi`,onChange:onPage}} />
  </section>;
}
