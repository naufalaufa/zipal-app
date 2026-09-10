/* eslint-disable react-refresh/only-export-components */
import { Alert, Button, Card, Col, Descriptions, Drawer, Empty, List, Progress, Row, Skeleton, Space, Statistic, Tag, Typography } from 'antd';
import { AimOutlined, CalendarOutlined, HeartOutlined, ReloadOutlined, SafetyCertificateOutlined, RiseOutlined } from '@ant-design/icons';

export const CATEGORIES = {
  PROTECTION: { label: 'Proteksi', short: 'Proteksi', icon: <SafetyCertificateOutlined />, color: 'blue' },
  PLANNED: { label: 'Tujuan Terencana', short: 'Tujuan', icon: <AimOutlined />, color: 'geekblue' },
  RECURRING: { label: 'Berkala', short: 'Berkala', icon: <ReloadOutlined />, color: 'cyan' },
  ASSET: { label: 'Aset & Masa Depan', short: 'Aset', icon: <RiseOutlined />, color: 'green' },
  SOCIAL: { label: 'Sosial & Keluarga', short: 'Sosial', icon: <HeartOutlined />, color: 'magenta' }
};
export const getGoalCategoryMeta = category => CATEGORIES[category] || { label:'Belum dikategorikan', short:'Belum dikategorikan', icon:<AimOutlined />, color:'default' };
export const safeNumber = value => Number.isFinite(Number(value)) ? Number(value) : 0;
export const clampPercent = value => Math.min(100, Math.max(0, safeNumber(value)));
export const normalizeFinancialGoal = goal => ({ ...goal, id:safeNumber(goal?.id), title:goal?.title || '', category:CATEGORIES[goal?.category] ? goal.category : 'UNKNOWN',
  current_amount:safeNumber(goal?.current_amount ?? goal?.collected_amount), target_amount:safeNumber(goal?.target_amount), progress:safeNumber(goal?.progress),
  remaining_amount:safeNumber(goal?.remaining_amount), surplus_amount:safeNumber(goal?.surplus_amount), refill_deficit:safeNumber(goal?.refill_deficit),
  effective_priority:safeNumber(goal?.effective_priority) || 4, effective_status:goal?.effective_status || 'ACTIVE', transactions:Array.isArray(goal?.transactions) ? goal.transactions : [] });
export const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(safeNumber(value));
export const dateText = value => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date);
};

const statusMeta = {
  ACTIVE: ['Aktif', 'default'], ON_TRACK: ['On Track', 'processing'], NEEDS_REFILL: ['Needs Refill', 'warning'],
  TARGET_REACHED: ['Target Reached', 'success'], COMPLETED: ['Completed', 'success'], PAUSED: ['Paused', 'default']
};
export function GoalStatusBadge({ status }) { const item = statusMeta[status] || [status, 'default']; return <Tag color={item[1]}>{item[0]}</Tag>; }
export function GoalCategoryBadge({ category }) { const item = getGoalCategoryMeta(category); return <Tag color={item.color} icon={item.icon}>{item.label}</Tag>; }

export function FinancialGoalSummary({ summary, loading }) {
  const cards = [
    ['Total Saldo', money(summary.total_balance)], ['Total Target', money(summary.total_target)],
    ['Overall Progress', `${Number(summary.overall_progress || 0).toFixed(1)}%`], ['Total Kekurangan', money(summary.total_remaining)],
    ['Goals Tercapai', summary.reached_count || 0], ['Needs Refill', `${summary.needs_refill_count || 0} Goals`]
  ];
  return <Row gutter={[12, 12]} className="goal-summary">{cards.map(([title, value]) => <Col xs={12} md={8} xl={4} key={title}>
    <Card size="small"><Skeleton loading={loading} active paragraph={false}><Statistic title={title} value={value} /></Skeleton></Card>
  </Col>)}</Row>;
}

export function RecoveryModeCard({ summary, onPlan }) {
  if (!summary.recovery_mode) return null;
  return <Alert className="recovery-card" type="warning" showIcon message="Recovery Mode"
    description={<Space direction="vertical" size={2}><span>{summary.recovery_goal_count} dana proteksi berada di bawah batas sehat.</span>
      <strong>Total refill {money(summary.total_refill_deficit)}</strong><Button type="link" onClick={onPlan} style={{ padding: 0 }}>Lihat Rencana Refill</Button></Space>} />;
}

export function FinancialGoalCard({ goal, onDetail, onEdit, onDelete }) {
  const category = getGoalCategoryMeta(goal.category); const capped = clampPercent(goal.progress);
  return <Card hoverable className={`goal-card goal-card-${String(goal.category).toLowerCase()}`} onClick={() => onDetail(goal.id)}>
    <div className="goal-card-head"><div className="goal-icon">{category?.icon || <AimOutlined />}</div><div className="goal-title-wrap">
      <Typography.Text strong className="goal-title">{goal.title}</Typography.Text><Space size={[0, 4]} wrap><GoalCategoryBadge category={goal.category} /><GoalStatusBadge status={goal.effective_status} /></Space>
    </div></div>
    <div className="goal-money"><strong>{money(goal.current_amount)}</strong><span>dari {money(goal.target_amount)}</span></div>
    <Progress percent={capped} size="small" strokeColor="#1677ff" format={() => `${Number(goal.progress || 0).toFixed(1)}%`} />
    <Typography.Text type={goal.refill_deficit > 0 ? 'warning' : 'secondary'}>
      {goal.refill_deficit > 0 ? `Perlu refill ${money(goal.refill_deficit)}` : goal.surplus_amount > 0 ? `Surplus ${money(goal.surplus_amount)}` : `Kurang ${money(goal.remaining_amount)}`}
    </Typography.Text>
    <div className="goal-actions"><Button className="goal-action-detail" size="small" onClick={event => { event.stopPropagation(); onDetail(goal.id); }}>Detail</Button>
      {onEdit && <Button className="goal-action-edit" size="small" onClick={event => { event.stopPropagation(); onEdit(goal); }}>Edit</Button>}
      {onDelete && <Button className="goal-action-delete" size="small" danger onClick={event => { event.stopPropagation(); onDelete(goal); }}>Delete</Button>}<Tag className="goal-priority">P{goal.effective_priority}</Tag></div>
  </Card>;
}

export function FinancialGoalDetail({ open, loading, goal, onClose }) {
  const recommended = goal?.due_in_days > 0 && goal.remaining_amount > 0 ? goal.remaining_amount / Math.max(1, Math.ceil(goal.due_in_days / 30)) : null;
  return <Drawer title="Detail Financial Goal" open={open} onClose={onClose} width={620} className="goal-drawer">
    {loading ? <Skeleton active /> : !goal ? <Empty description="Detail tidak tersedia" /> : <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div><Typography.Title level={3} style={{ marginBottom: 8 }}>{goal.title}</Typography.Title><Space wrap><GoalCategoryBadge category={goal.category} /><GoalStatusBadge status={goal.effective_status} /><Tag>P{goal.effective_priority}</Tag></Space></div>
      <Card size="small"><Typography.Text type="secondary">Saldo saat ini</Typography.Text><Typography.Title level={2}>{money(goal.current_amount)}</Typography.Title>
        <Progress percent={clampPercent(goal.progress)} format={() => `${safeNumber(goal.progress).toFixed(1)}%`} />
        {goal.refill_deficit > 0 && <Alert type="warning" showIcon message={`Perlu refill ${money(goal.refill_deficit)} untuk kembali ke saldo ideal.`} />}</Card>
      <Descriptions className="goal-descriptions" column={1} size="small" bordered items={[
        { key:'target',label:'Target',children:money(goal.target_amount) },{ key:'remaining',label:'Remaining',children:money(goal.remaining_amount) },
        { key:'deposit',label:'Total deposit',children:money(goal.total_deposit) },{ key:'withdraw',label:'Total withdrawal',children:money(goal.total_withdrawal) },
        { key:'targetDate',label:'Target date',children:dateText(goal.target_date) },{ key:'created',label:'Dibuat',children:dateText(goal.created_at) },
        { key:'updated',label:'Terakhir diperbarui',children:dateText(goal.updated_at) },{ key:'priority',label:'Priority',children:`P${goal.effective_priority || 4}` },
        { key:'last',label:'Transaksi terakhir',children:dateText(goal.last_transaction) },{ key:'monthly',label:'Rekomendasi/bulan',children:recommended ? money(recommended) : 'Butuh target date' }
      ]} />
      <div><Typography.Title level={5}>Deskripsi</Typography.Title><Typography.Paragraph type="secondary">{goal.description || 'Belum ada deskripsi.'}</Typography.Paragraph></div>
      <div><Typography.Title level={5}>Riwayat transaksi</Typography.Title>{goal.transactions?.length ? <List size="small" dataSource={goal.transactions} renderItem={item => <List.Item extra={<Typography.Text type={item.type === 'deposit' ? 'success' : 'danger'}>{item.type === 'deposit' ? '+' : '-'}{money(item.amount)}</Typography.Text>}><List.Item.Meta title={`${item.type === 'deposit' ? 'Deposit' : 'Withdrawal'} · ${dateText(item.date)}`} description={item.description || item.username} /></List.Item>} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Belum ada transaksi teralokasi ke goal ini." />}</div>
    </Space>}
  </Drawer>;
}

export function EmptyGoalCategory({ label, onAdd }) { return <Empty description={`Belum ada ${label}.`}>{onAdd && <Button type="primary" onClick={onAdd}>+ Tambah Goal</Button>}</Empty>; }
export function DueDate({ value }) { return value ? <Space><CalendarOutlined />{dateText(value)}</Space> : null; }
