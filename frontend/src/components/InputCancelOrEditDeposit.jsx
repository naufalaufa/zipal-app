import { useState, useEffect } from 'react';
import { Form, InputNumber, Input, Button, message, Space, Divider, Typography } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../api';

const { Text, Title } = Typography;

const InputCancelOrEdit = ({ lastItem, type, username, onSuccess, closeModal }) => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        if (lastItem) {
            form.setFieldsValue({
                amount: lastItem.amount,
                description: lastItem.description
            });
        }
    }, [lastItem, form]);

    const onUpdate = async (values) => {
        setLoading(true);
        try {
            await api.put(`/transaction/${lastItem.id}`, {
                amount: values.amount,
                description: values.description
            });
            message.success('Data berhasil diupdate! ✨');
            if (onSuccess) onSuccess();
            if (closeModal) closeModal();
        } catch (error) {
            message.error('Gagal update data');
        } finally {
            setLoading(false);
        }
    };

    const onDelete = async () => {
        setLoading(true);
        try {
            await api.delete(`/transaction/cancel-last/${username}?type=${type}`);
            message.success('Data terakhir berhasil dihapus! 🗑️');
            if (onSuccess) onSuccess();
            if (closeModal) closeModal();
        } catch (error) {
            message.error('Gagal menghapus data');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form form={form} layout="vertical" onFinish={onUpdate}>
            <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px', marginBottom: '20px', border: '1px dashed #d9d9d9' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>Data Terakhir yang Terinput:</Text>
                <Title level={5} style={{ margin: '4px 0 0 0' }}>
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(lastItem?.amount || 0)}
                </Title>
                <Text italic style={{ fontSize: '13px' }}>{lastItem?.description || 'Tidak ada keterangan'}</Text>
            </div>

            <Divider orientation="left" style={{ fontSize: '12px' }}>Revisi Data</Divider>

            <Form.Item 
                label="Nominal Baru (Rp)" 
                name="amount" 
                rules={[{ required: true, message: 'Masukkan jumlah!' }]}
            >
                <InputNumber 
                    style={{ width: '100%' }} 
                    formatter={value => value ? `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                    parser={value => value.replace(/\Rp\s?|(,*)/g, '')}
                />
            </Form.Item>
            
            <Form.Item label="Keterangan Baru" name="description">
                <Input placeholder="Contoh: Revisi salah input nominal" />
            </Form.Item>

            <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Button type="primary" icon={<EditOutlined />} htmlType="submit" loading={loading} block>
                    Update Data Terakhir
                </Button>
                <Button danger icon={<DeleteOutlined />} onClick={onDelete} loading={loading} block>
                    Hapus / Batalkan Transaksi Ini
                </Button>
            </Space>
        </Form>
    );
};

export default InputCancelOrEdit;