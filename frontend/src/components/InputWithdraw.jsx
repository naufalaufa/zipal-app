import { useState } from 'react';
import { Form, InputNumber, Input, Button, message } from 'antd';
import api from '../api';

const InputWithdraw = ({ username, onSuccess, closeModal }) => {
    const [loading, setLoading] = useState(false);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            await api.post('/transaction', {
                username: username,
                type: 'withdraw',
                amount: values.amount,
                description: values.description
            });
            message.success('Penarikan Berhasil! Saldo Berkurang 📉');
            if (onSuccess) onSuccess();
            if (closeModal) closeModal();
        } catch (error) {
            console.error(error);
            message.error('Gagal melakukan withdraw');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form layout="vertical" onFinish={onFinish}>
            <Form.Item 
                label="Jumlah Penarikan (Rp)" 
                name="amount" 
                rules={[{ required: true, message: 'Masukkan nominal withdraw!' }]}
            >
                <InputNumber 
                    style={{ width: '100%' }}
                    placeholder="Contoh: 100000"
                    inputMode="numeric" 
                    min={1}
                    formatter={value => value ? `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                    parser={value => value.replace(/\Rp\s?|(,*)/g, '')}
                    onKeyPress={(event) => {
                        if (!/[0-9]/.test(event.key)) {
                            event.preventDefault();
                        }
                    }}
                />
            </Form.Item>

            <Form.Item label="Alasan Penarikan" name="description">
                <Input placeholder="Contoh: Beli Makan / Investasi Saham" />
            </Form.Item>

            <Form.Item>
                <Button type="primary" danger htmlType="submit" loading={loading} block>Konfirmasi Withdraw 💸</Button>
            </Form.Item>
        </Form>
    );
};

export default InputWithdraw;