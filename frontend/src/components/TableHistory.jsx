import { useEffect, useState } from 'react';
import { Table, Tag, Card, Typography } from 'antd';
import { UserOutlined, RobotOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import moment from 'moment';
import api from '../api';

const { Text } = Typography;
const TableHistory = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get('/history');
                if (res.data.status === 'success') {
                    const formattedData = res.data.data.map(item => ({
                        ...item,
                        key: item.id
                    }));
                    setData(formattedData);
                }
            } catch (error) {
                console.error("Gagal ambil history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const formatRupiah = (number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0
        }).format(number);
    };

    const columns = [
        {
            title: 'Tanggal',
            dataIndex: 'date',
            key: 'date',
            render: (text) => <span style={{ color: '#888' }}>{moment(text).format('DD MMMM YYYY')}</span>,
            sorter: (a, b) => new Date(a.date) - new Date(b.date),
        },
        {
            title: 'User / Pelaku',
            dataIndex: 'username',
            key: 'username',
            render: (username) => {
                let color = 'geekblue';
                let icon = <UserOutlined />;
                let name = username;

                if (username === 'naufalaufa') {
                    color = 'blue';
                    name = 'Naufal Aufa';
                } else if (username === 'zihraangelina') {
                    color = 'magenta';
                    name = 'Zihra Angelina';
                } else if (username === 'zipaladmin') {
                    color = 'gold';
                    name = 'Admin Investasi';
                    icon = <RobotOutlined />;
                }
                return (
                    <Tag icon={icon} color={color} style={{ fontSize: '13px', padding: '5px 10px' }}>
                        {name}
                    </Tag>
                );
            },
            filters: [
                { text: 'Naufal', value: 'naufalaufa' },
                { text: 'Zihra', value: 'zihraangelina' },
                { text: 'Admin Investasi', value: 'zipaladmin' },
            ],
            onFilter: (value, record) => record.username.indexOf(value) === 0,
        },
        {
            title: 'Tipe Transaksi',
            dataIndex: 'type',
            key: 'type',
            render: (type) => {
                const isDeposit = type === 'deposit';
                return (
                    <Tag 
                        color={isDeposit ? 'success' : 'error'} 
                        icon={isDeposit ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    >
                        {isDeposit ? 'Uang Masuk (Deposit)' : 'Uang Keluar (Withdraw)'}
                    </Tag>
                );
            },
            filters: [
                { text: 'Deposit', value: 'deposit' },
                { text: 'Withdraw', value: 'withdraw' },
            ],
            onFilter: (value, record) => record.type.indexOf(value) === 0,
        },
        {
            title: 'Nominal',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount, record) => (
                <Text strong style={{ color: record.type === 'deposit' ? '#3f8600' : '#cf1322' }}>
                    {record.type === 'deposit' ? '+ ' : '- '}
                    {formatRupiah(amount)}
                </Text>
            ),
        },
        {
            title: 'Keterangan',
            dataIndex: 'description',
            key: 'description',
        },
    ];

    return (
        <Card style={{ margin: '20px', borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Table 
                columns={columns} 
                dataSource={data} 
                loading={loading} 
                pagination={{ pageSize: 10 }}
                scroll={{ x: 800 }}
            />
        </Card>
    );
};

export default TableHistory;