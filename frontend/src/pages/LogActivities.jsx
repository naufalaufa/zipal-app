import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Table, Tag, Tooltip, Button, Avatar, Input, Space, Grid } from 'antd'; // Tambah Grid
import { 
    SafetyCertificateOutlined, 
    ReloadOutlined, 
    UserOutlined, 
    ClockCircleOutlined,
    SearchOutlined
} from '@ant-design/icons';
import { HeadNavbar } from '../components'; 
import Swal from 'sweetalert2';
import moment from 'moment'; 

const { useBreakpoint } = Grid;

const LogActivities = () => {
    const screens = useBreakpoint();

    const user = JSON.parse(localStorage.getItem('user')) || { role: 'guest' };
    const isAdmin = user.role === 'admin';
    const token = localStorage.getItem('accessToken');

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isAdmin) {
            Swal.fire({
                icon: 'error',
                title: 'Akses Ditolak!',
                text: 'Halaman ini sangat rahasia.',
                confirmButtonText: 'Kembali',
                confirmButtonColor: '#d33',
                allowOutsideClick: false
            });
        } else {
            if (!token) {
                Swal.fire('Error', 'Token hilang, login ulang.', 'error');
                return;
            }
            fetchLogs();
        }
    }, []);

    const fetchLogs = async () => {
        if (!isAdmin) return; 

        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/activity-logs`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const dataWithKey = response.data.data.map((item, index) => ({
                ...item,
                key: item.id || index
            }));

            setLogs(dataWithKey);
            setLoading(false);

        } catch (err) {
            console.error("Error Fetch Logs:", err);
            setLoading(false);
            if (err.response && err.response.status === 403) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Sesi Invalid',
                    text: 'Silakan login ulang.',
                    confirmButtonText: 'Login',
                }).then(() => {
                    localStorage.clear();
                    window.location.href = '/login'; 
                });
            }
        }
    };

    const getAvatarSrc = (filename) => {
        if (!filename) return null;
        if (filename.startsWith('http')) return filename;
        return `${import.meta.env.VITE_API_URL}/public/uploads/${filename}`;
    };

    const columns = [
        {
            title: 'No',
            key: 'index',
            width: 60,
            fixed: screens.md ? 'left' : false,
            align: 'center',
            render: (text, record, index) => <b>{index + 1}</b>,
        },
        {
            title: 'User Login',
            dataIndex: 'username',
            key: 'username',
            width: 200,
            filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
                <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
                    <Input
                        placeholder="Cari Username"
                        value={selectedKeys[0]}
                        onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                        onPressEnter={() => confirm()}
                        style={{ marginBottom: 8, display: 'block' }}
                    />
                    <Space>
                        <Button type="primary" onClick={() => confirm()} icon={<SearchOutlined />} size="small" style={{ width: 90 }}>
                            Search
                        </Button>
                        <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
                            Reset
                        </Button>
                    </Space>
                </div>
            ),
            filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
            onFilter: (value, record) => record.username.toLowerCase().includes(value.toLowerCase()),
            render: (text, record) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar 
                        src={getAvatarSrc(record.avatar)} 
                        icon={<UserOutlined />} 
                        style={{ backgroundColor: record.role === 'admin' ? '#fde3cf' : '#87d068', flexShrink: 0 }}
                    />
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{text}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>ID: {record.user_id}</div>
                    </div>
                </div>
            ),
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            align: 'center',
            width: 100,
            filters: [
                { text: 'Admin', value: 'admin' },
                { text: 'User', value: 'user' },
            ],
            onFilter: (value, record) => record.role === value,
            render: (role) => (
                <Tag color={role === 'admin' ? 'red' : 'green'} style={{ fontWeight: 'bold', borderRadius: '20px' }}>
                    {role ? role.toUpperCase() : '-'}
                </Tag>
            ),
        },
        {
            title: 'Waktu Login',
            dataIndex: 'login_at',
            key: 'login_at',
            width: 220,
            sorter: (a, b) => moment(a.login_at).unix() - moment(b.login_at).unix(),
            defaultSortOrder: 'descend',
            render: (date) => (
                <div style={{ color: '#555', fontSize: '13px' }}>
                    <ClockCircleOutlined style={{ marginRight: '6px', color: '#faad14' }} />
                    {moment(date).format('DD MMM YYYY')} 
                    <span style={{ margin: '0 6px', color: '#ccc' }}>|</span>
                    <strong style={{ color: '#333' }}>{moment(date).format('HH:mm')}</strong>
                </div>
            ),
        },
    ];

    return (
        <div>
            <HeadNavbar
                title="Zipal Logs Activities"
                icon={<SafetyCertificateOutlined />}
                description="Audit Sistem Dari kedua user siapa saja yang masuk untuk login"
            />

            {/* Container Padding Responsif */}
            <div style={{ 
                padding: screens.md ? '0 20px 40px 20px' : '0 10px 20px 10px',
                marginTop: screens.md ? '0' : '10px' 
            }}>
                
                {isAdmin && (
                    <div style={{ 
                        display: 'flex', 
                        // Flex direction column di HP, Row di Tablet+
                        flexDirection: screens.md ? 'row' : 'column', 
                        justifyContent: 'space-between', 
                        alignItems: screens.md ? 'center' : 'flex-start', 
                        marginBottom: '20px',
                        gap: '10px' // Jarak antar elemen saat stack
                    }}>
                        <div style={{ color: '#666', fontSize: screens.md ? '14px' : '13px' }}>
                            Total Logs: <b>{logs.length}</b> record
                        </div>
                        <div style={{ display: 'flex', gap: '10px', width: screens.md ? 'auto' : '100%' }}>
                            <Tooltip title="Muat ulang data log">
                                <Button 
                                    type="primary" 
                                    icon={<ReloadOutlined />} 
                                    onClick={fetchLogs} 
                                    loading={loading}
                                    style={{ borderRadius: '6px', width: screens.md ? 'auto' : '100%' }} // Full width button di HP
                                >
                                    Refresh Data
                                </Button>
                            </Tooltip>
                        </div>
                    </div>
                )}

                <Card 
                    variant="borderless" 
                    style={{ borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', overflow: 'hidden' }}
                    bodyStyle={{ padding: '0' }}
                >
                    {isAdmin ? (
                        <Table
                            columns={columns}
                            dataSource={logs}
                            pagination={{ 
                                pageSize: 8, 
                                showTotal: (total, range) => screens.md ? `${range[0]}-${range[1]} dari ${total} logs` : `${total} Logs`, // Sederhanakan pagination text di HP
                                size: screens.md ? 'default' : 'small'
                            }}
                            loading={loading}
                            // FITUR UTAMA RESPONSIVE: Scroll X
                            scroll={{ x: 800 }} 
                            rowClassName={(record) => record.role === 'admin' ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}
                        />
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#ff4d4f' }}>
                            <SafetyCertificateOutlined style={{ fontSize: '40px', marginBottom: '20px', opacity: 0.5 }} />
                            <h3>Akses Terbatas</h3>
                            <p style={{ fontSize: '12px' }}>Hanya Administrator yang memiliki izin.</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default LogActivities;