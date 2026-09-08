import { useEffect, useState } from 'react';
import { Alert, Button, Form, Select } from 'antd';
import api from '../api';

export default function GoalSelect() {
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        api.get('/goals').then(({ data }) => {
            if (active) { setGoals(data.data); setError(false); }
        }).catch(() => { if (active) setError(true); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [attempt]);
    return <>
        <Form.Item name="goal_id" label="Pilih Tabungan (Purpose)" rules={[{ required: true, message: 'Pilih tabungan terlebih dahulu.' }]}>
            <Select loading={loading} disabled={loading || error || goals.length === 0} placeholder="Pilih tabungan tujuan / sumber dana" showSearch optionFilterProp="label"
                options={goals.map(goal => {
                    const current = Number(goal.collected_amount);
                    const target = Number(goal.target_amount);
                    const done = target > 0 && current >= target;
                    const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
                    return { value: Number(goal.id), label: `${done ? '✅ ' : ''}${goal.title} — ${money(current)} / ${money(target)}${done ? ' (DONE)' : ` — kurang ${money(Math.max(target - current, 0))}`}` };
                })} />
        </Form.Item>
        {error && <Alert type="error" showIcon title="Gagal memuat tabungan." action={<Button onClick={() => { setLoading(true); setAttempt(value => value + 1); }}>Coba lagi</Button>} />}
        {!loading && !error && goals.length === 0 && <Alert type="info" showIcon title="Belum ada tabungan. Minta admin menambah tujuan di halaman Purpose." />}
    </>;
}
