import { useState } from 'react';
import { Form, InputNumber, Input, Button, message } from 'antd';
import api from '../api';

const InputDeposit = ({ username, onSuccess, closeModal }) => {
    const [loading, setLoading] = useState(false);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            await api.post('/transaction', {
                username: username,
                type: 'deposit',
                amount: values.amount,
                description: values.description
            });
            message.success('Deposit Berhasil! 💸');
            
            if (onSuccess) onSuccess();
            if (closeModal) closeModal();
            
        } catch (error) {
            console.error(error); // Log error asli untuk debugging
            message.error('Gagal deposit');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form layout="vertical" onFinish={onFinish}>
            <Form.Item 
                label="Jumlah Uang (Rp)" 
                name="amount" 
                rules={[{ required: true, message: 'Masukkan jumlah!' }]}
            >
                <InputNumber 
                    style={{ width: '100%' }} 
                    placeholder="Contoh: 500000"
                    
                    inputMode="numeric"
                    formatter={value => value ? `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                    parser={value => value.replace(/\Rp\s?|(,*)/g, '')}
                    onKeyPress={(event) => {
                        if (!/[0-9]/.test(event.key)) {
                            event.preventDefault();
                        }
                    }}
                />
            </Form.Item>
            
            <Form.Item label="Keterangan / Catatan" name="description">
                <Input placeholder="Contoh: Tabungan Bulan Maret" />
            </Form.Item>

            <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>
                    Simpan Tabungan 🚀
                </Button>
            </Form.Item>
        </Form>
    );
};

export default InputDeposit;