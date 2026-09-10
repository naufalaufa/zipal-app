import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Col, DatePicker, Form, Input, InputNumber, List, message, Modal, Row, Select, Space, Spin, Typography } from 'antd';
import { PlusOutlined, RocketOutlined } from '@ant-design/icons';
import { HeadNavbar } from '../components';
import api from '../api';
import { CATEGORIES, EmptyGoalCategory, FinancialGoalCard, FinancialGoalDetail, FinancialGoalSummary, money, normalizeFinancialGoal, RecoveryModeCard } from '../features/financialGoals';
import '../features/financialGoals.css';
import { goalDefaults as defaults, goalToForm, goalFormPayload } from '../features/goalForm';

const { TextArea } = Input;
const categoryOptions = Object.entries(CATEGORIES).map(([value, item]) => ({ value, label: <span>{item.icon} {item.label}</span> }));

export default function Purpose() {
  const detailRequest = useRef(0);
  const saveInFlight = useRef(false);
  useEffect(() => () => { detailRequest.current += 1; }, []);
  const [goals, setGoals] = useState([]); const [summary, setSummary] = useState({}); const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); const [formOpen, setFormOpen] = useState(false); const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null); const [detail, setDetail] = useState(null); const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false); const [form] = Form.useForm(); const category = Form.useWatch('category', form);
  const [planOpen, setPlanOpen] = useState(false); const [capacity, setCapacity] = useState(null); const [plan, setPlan] = useState(null); const [planLoading, setPlanLoading] = useState(false);
  const user = JSON.parse(sessionStorage.getItem('user') || '{}'); const isAdmin = user.role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    try { const [goalRes, summaryRes] = await Promise.all([api.get('/goals'), api.get('/goals/summary')]); setGoals((goalRes.data.data || []).map(normalizeFinancialGoal)); setSummary(summaryRes.data.data || {}); }
    catch (error) { console.error('Financial Goals load failed:', error); message.error('Gagal memuat Financial Goals. Silakan coba lagi.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => goals.reduce((map, goal) => ({ ...map, [goal.category]: (map[goal.category] || 0) + 1 }), {}), [goals]);
  const filtered = filter === 'ALL' ? goals : goals.filter(goal => goal.category === filter);
  const filters = [{ value:'ALL', label:'Semua', count:goals.length }, ...Object.entries(CATEGORIES).map(([value, item]) => ({ value, label:item.short, icon:item.icon, count:counts[value] || 0 }))];

  const openAdd = () => { if (!isAdmin) return; setEditing(null); form.resetFields(); form.setFieldsValue(goalToForm()); setFormOpen(true); };
  const openEdit = goal => { if (!isAdmin) return; setEditing(goal); form.resetFields(); form.setFieldsValue(goalToForm(goal)); setFormOpen(true); };
  const closeDetail = () => { detailRequest.current += 1; setDetailId(null); setDetail(null); setDetailLoading(false); };
  const openDetail = async id => {
    const request = ++detailRequest.current;
    setDetailId(id); setDetail(null); setDetailLoading(true);
    try { const response = await api.get(`/goals/${id}`); if (request === detailRequest.current) setDetail(normalizeFinancialGoal(response.data.data)); }
    catch (error) { if (request === detailRequest.current) { console.error('Financial Goal detail failed:', { id, error }); message.error(error.response?.data?.message || 'Gagal memuat detail Financial Goal.'); } }
    finally { if (request === detailRequest.current) setDetailLoading(false); }
  };
  const removeGoal = goal => Modal.confirm({ title:'Hapus Financial Goal?', content:`Financial goal ${goal.title} akan dihapus. Data yang terkait mungkin tidak dapat dipulihkan.`,
    okText:'Hapus', cancelText:'Batal', okButtonProps:{ danger:true }, async onOk() { try { await api.delete(`/goals/${goal.id}`); message.success('Financial goal berhasil dihapus.'); if (detailId === goal.id) setDetailId(null); await load(); }
      catch (error) { console.error('Financial Goal delete failed:', { id:goal.id, error }); message.error(error.response?.data?.message || 'Gagal menghapus Financial Goal.'); return Promise.reject(error); } } });
  const save = async () => {
    if (!isAdmin || saveInFlight.current) return;
    saveInFlight.current = true;
    try {
      const values = await form.validateFields(); setSaving(true);
      const payload = goalFormPayload(values);
      if (editing) await api.put(`/goals/${editing.id}`, payload); else await api.post('/goals', payload);
      message.success(editing ? 'Goal berhasil diperbarui.' : 'Goal berhasil dibuat.'); setFormOpen(false); form.resetFields(); await load();
    } catch (error) { if (error?.errorFields) return; message.error(error.response?.data?.message || 'Gagal menyimpan goal.'); }
    finally { saveInFlight.current = false; setSaving(false); }
  };
  const calculatePlan = async () => {
    if (!capacity || capacity <= 0) return message.warning('Masukkan kapasitas menabung bulan ini.');
    setPlanLoading(true);
    try { const response = await api.post('/goals/refill-recommendation', { monthly_saving_capacity: capacity }); setPlan(response.data.data); }
    catch (error) { message.error(error.response?.data?.message || 'Gagal menghitung rencana refill.'); }
    finally { setPlanLoading(false); }
  };

  return <div><HeadNavbar title="Zipal Purpose" icon={<RocketOutlined />} description="Financial Goal Management System" />
    <main className="financial-page">
      <div className="page-toolbar"><div><Typography.Title level={2} style={{ margin:0 }}>Financial Goals</Typography.Title><Typography.Text type="secondary">Kelola, pantau, dan prioritaskan tujuan keuangan keluarga.</Typography.Text></div>
        <Button type="primary" size="large" icon={<PlusOutlined />} disabled={!isAdmin} onClick={openAdd}>Tambah Tujuan</Button></div>
      <FinancialGoalSummary summary={summary} loading={loading} /><RecoveryModeCard summary={summary} onPlan={() => setPlanOpen(true)} />
      <nav className="goal-filters" aria-label="Filter kategori Financial Goals">{filters.map(item => <Button key={item.value} className={`goal-filter goal-filter-${item.value.toLowerCase()}`} type={filter === item.value ? 'primary' : 'default'} onClick={() => setFilter(item.value)}>{item.icon}<span>{item.label}</span><strong>{item.count}</strong></Button>)}</nav>
      <section id="goal-list">{loading ? <div style={{ textAlign:'center', padding:60 }}><Spin size="large" /></div> : filtered.length ? <Row gutter={[16,16]}>{filtered.map(goal => <Col xs={24} md={12} lg={8} key={goal.id}><FinancialGoalCard goal={goal} onDetail={openDetail} onEdit={isAdmin ? openEdit : null} onDelete={isAdmin ? removeGoal : null} /></Col>)}</Row> : <EmptyGoalCategory label={filter === 'ALL' ? 'Financial Goal' : CATEGORIES[filter]?.label} onAdd={isAdmin ? openAdd : null} />}</section>
    </main>
    <FinancialGoalDetail open={detailId != null} goal={detail} loading={detailLoading} onClose={closeDetail} />
    <Modal title="Rencana Refill" open={planOpen} onCancel={() => setPlanOpen(false)} footer={null} width={600}>
      <Alert type="info" showIcon message="Rekomendasi tidak melakukan deposit otomatis" description="Alokasi berikut hanya suggestion berdasarkan kondisi, due date, dan priority goal." style={{ marginBottom:16 }} />
      <Space.Compact style={{ width:'100%', marginBottom:16 }}><InputNumber value={capacity} onChange={setCapacity} min={1} precision={0} prefix="Rp" placeholder="Kapasitas menabung bulan ini" style={{ width:'100%' }} /><Button type="primary" loading={planLoading} onClick={calculatePlan}>Hitung</Button></Space.Compact>
      {plan && <><Typography.Text type="secondary">Dialokasikan {money(plan.allocated)} dari {money(plan.capacity)}</Typography.Text><List dataSource={plan.recommendations} locale={{ emptyText:'Belum ada goal yang memerlukan alokasi.' }} renderItem={item => <List.Item extra={<strong>{money(item.allocation)}</strong>}><List.Item.Meta title={`${item.goal_name} · P${item.priority}`} description={item.reasons.join(' · ')} /></List.Item>} /></>}
    </Modal>
    <Modal title={editing ? 'Edit Financial Goal' : 'Tambah Financial Goal'} open={formOpen} forceRender onCancel={() => { if (!saveInFlight.current) setFormOpen(false); }} onOk={save} confirmLoading={saving} cancelButtonProps={{ disabled:saving }} closable={!saving} maskClosable={!saving} width={620} okText="Simpan">
      <Form form={form} layout="vertical" initialValues={defaults}>
        <Row gutter={16}><Col xs={24} md={14}><Form.Item name="title" label="Nama" rules={[{ required:true }]}><Input /></Form.Item></Col><Col xs={24} md={10}><Form.Item name="category" label="Kategori" rules={[{ required:true }]}><Select options={categoryOptions} /></Form.Item></Col></Row>
        <Form.Item name="description" label="Deskripsi"><TextArea rows={3} /></Form.Item>
        <Form.Item name="cycle_interval" hidden><InputNumber /></Form.Item>
        <Row gutter={16}><Col xs={24} md={12}><Form.Item name="target_amount" label={category === 'ASSET' ? 'Milestone Target' : 'Target'} rules={[{ required:true }]}><InputNumber min={1} precision={0} style={{ width:'100%' }} prefix="Rp" /></Form.Item></Col>
          {!editing && <Col xs={24} md={12}><Form.Item name="collected_amount" label="Saldo Awal" help="Dicatat sebagai opening deposit."><InputNumber min={0} precision={0} style={{ width:'100%' }} prefix="Rp" /></Form.Item></Col>}</Row>
        {(category === 'PLANNED' || category === 'SOCIAL') && <Form.Item name="target_date" label="Target Date (opsional)"><DatePicker style={{ width:'100%' }} /></Form.Item>}
        {category === 'PROTECTION' && <><Form.Item name="refill_enabled" valuePropName="checked"><Checkbox>Aktifkan refill</Checkbox></Form.Item><Row gutter={16}><Col span={12}><Form.Item name="healthy_threshold" label="Batas sehat"><InputNumber min={.1} max={1} step={.05} style={{ width:'100%' }} /></Form.Item></Col><Col span={12}><Form.Item name="critical_threshold" label="Batas kritis"><InputNumber min={.1} max={1} step={.05} style={{ width:'100%' }} /></Form.Item></Col></Row></>}
        {category === 'RECURRING' && <Row gutter={16}><Col span={12}><Form.Item name="cycle_type" label="Siklus" rules={[{ required:true }]}><Select options={[{value:'MONTHLY',label:'Bulanan'},{value:'YEARLY',label:'Tahunan'},{value:'CUSTOM',label:'Custom'}]} /></Form.Item></Col><Col span={12}><Form.Item name="next_due_date" label="Periode Berikutnya" rules={[{ required:true }]}><DatePicker style={{ width:'100%' }} /></Form.Item></Col></Row>}
        <Form.Item name="configured_priority" label="Priority (opsional)"><Select allowClear options={[1,2,3,4,5].map(value => ({ value, label:`P${value} — ${['Critical','High','Medium','Normal','Low'][value-1]}` }))} /></Form.Item>
        {editing && <Form.Item name="lifecycle_status" label="Lifecycle"><Select options={['ACTIVE','PAUSED','COMPLETED'].map(value => ({ value, label:value }))} /></Form.Item>}
      </Form>
    </Modal>
  </div>;
}
