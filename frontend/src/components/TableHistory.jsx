import { useEffect, useState } from 'react';
import { Table, Tag, Card, Typography, Button, Flex, message } from 'antd';
import { UserOutlined, RobotOutlined, ArrowUpOutlined, ArrowDownOutlined, FileExcelOutlined } from '@ant-design/icons';
import moment from 'moment';
import api from '../api';
import {
    applyHistoryTableState,
    exportHistoryToExcel,
    getHistoryUserDisplayName,
} from '../utils/historyExport';

const { Text } = Typography;
const TableHistory = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [tableState, setTableState] = useState({ filters: {}, sorter: {} });

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

    const handleTableChange = (_pagination, filters, sorter) => {
        setTableState({ filters, sorter: Array.isArray(sorter) ? sorter[0] || {} : sorter });
    };

    const handleExport = async () => {
        if (exporting) return;

        const exportData = applyHistoryTableState(data, tableState.filters, tableState.sorter);
        if (exportData.length === 0) {
            message.info('Tidak ada data history untuk diexport.');
            return;
        }

        setExporting(true);
        try {
            await exportHistoryToExcel(exportData);
            message.success('History berhasil didownload dalam format Excel.');
        } catch (error) {
            console.error('Gagal export history:', error);
            message.error('Gagal mendownload data History.');
        } finally {
            setExporting(false);
        }
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
                const name = getHistoryUserDisplayName(username);

                if (username === 'naufalaufa') {
                    color = 'blue';
                } else if (username === 'zihraangelina') {
                    color = 'magenta';
                } else if (username === 'zipaladmin') {
                    color = 'gold';
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
            title: 'Tabungan',
            dataIndex: 'goal_name',
            key: 'goal_name',
            render: value => value || 'Transaksi lama (belum dialokasikan)',
        },
        {
            title: 'Keterangan',
            dataIndex: 'description',
            key: 'description',
        },
    ];

    return (
        <Card style={{ margin: '20px', borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Flex justify="flex-end" style={{ marginBottom: 16 }}>
                <Button
                    type="primary"
                    icon={<FileExcelOutlined />}
                    loading={exporting}
                    disabled={loading || exporting}
                    onClick={handleExport}
                >
                    Download Excel
                </Button>
            </Flex>
            <Table 
                columns={columns} 
                dataSource={data} 
                loading={loading} 
                pagination={{ pageSize: 10 }}
                scroll={{ x: 800 }}
                onChange={handleTableChange}
            />
        </Card>
    );
};

export default TableHistory;
