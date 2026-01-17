import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Table, Tag, Tooltip, Button, Avatar, Input, Space } from 'antd';
import { 
    SafetyCertificateOutlined, 
    ReloadOutlined, 
    UserOutlined, 
    ClockCircleOutlined,
    LogoutOutlined,
    SearchOutlined
} from '@ant-design/icons';
import { HeadNavbar } from '../components'; 
import Swal from 'sweetalert2';
import moment from 'moment'; 

const LogActivities = () => {
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
            // Opsional: Redirect paksa jika user bandel akses via URL
            // window.location.href = '/dashboard';
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
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/activity-logs`, { // Pakai Env variable biar aman
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Map data dan tambahkan key
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

    // Helper untuk URL Avatar
    const getAvatarSrc = (filename) => {
        if (!filename) return null;
        if (filename.startsWith('http')) return filename; // Cloudinary
        return `${import.meta.env.VITE_API_URL}/public/uploads/${filename}`; // Local Uploads
    };

    const columns = [
        {
            title: 'No',
            key: 'index',
            width: 60,
            align: 'center',
            render: (text, record, index) => <b>{index + 1}</b>,
        },
        {
            title: 'User Login',
            dataIndex: 'username',
            key: 'username',
            width: 250,
            // 🔥 FITUR FILTER SEARCH USERNAME
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
            
            // 🔥 TAMPILAN AVATAR + USERNAME
            render: (text, record) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar 
                        src={getAvatarSrc(record.avatar)} 
                        icon={<UserOutlined />} 
                        style={{ backgroundColor: record.role === 'admin' ? '#fde3cf' : '#87d068', verticalAlign: 'middle' }}
                    />
                    <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{text}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>ID: {record.user_id}</div>
                    </div>
                </div>
            ),
        },
        {
            title: 'Role Access',
            dataIndex: 'role',
            key: 'role',
            align: 'center',
            width: 150,
            // 🔥 FITUR FILTER ROLE
            filters: [
                { text: 'Admin', value: 'admin' },
                { text: 'User', value: 'user' },
            ],
            onFilter: (value, record) => record.role === value,
            render: (role) => (
                <Tag color={role === 'admin' ? 'red' : 'green'} style={{ fontWeight: 'bold', padding: '4px 12px', borderRadius: '20px' }}>
                    {role ? role.toUpperCase() : '-'}
                </Tag>
            ),
        },
        {
            title: 'Waktu Login',
            dataIndex: 'login_at',
            key: 'login_at',
            width: 250,
            // 🔥 FITUR SORTING TANGGAL (ASC/DESC)
            sorter: (a, b) => moment(a.login_at).unix() - moment(b.login_at).unix(),
            defaultSortOrder: 'descend', // Default yang terbaru diatas
            render: (date) => (
                <div style={{ color: '#555' }}>
                    <ClockCircleOutlined style={{ marginRight: '8px', color: '#faad14' }} />
                    {moment(date).format('DD MMMM YYYY')} 
                    <span style={{ marginLeft: '8px', color: '#ccc' }}>|</span>
                    <strong style={{ marginLeft: '8px', color: '#333' }}>{moment(date).format('HH:mm')} WIB</strong>
                </div>
            ),
        },
    ];

    return (
        <div>
            <HeadNavbar
                title="Zipal Log Activities"
                icon={<SafetyCertificateOutlined />}
                description="Monitoring & Audit Siapa Saja yang Mengakses Sistem"
            />

            <div style={{ padding: '0 20px 40px 20px' }}>
                
                {isAdmin && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ color: '#666' }}>
                           Total Logs: <b>{logs.length}</b> record
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <Tooltip title="Muat ulang data log">
                                <Button 
                                    type="primary" 
                                    icon={<ReloadOutlined />} 
                                    onClick={fetchLogs} 
                                    loading={loading}
                                    style={{ borderRadius: '6px' }}
                                >
                                    Refresh
                                </Button>
                            </Tooltip>
                        </div>
                    </div>
                )}

                <Card 
                    variant="borderless" 
                    style={{ borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
                    bodyStyle={{ padding: '0' }}
                >
                    {isAdmin ? (
                        <Table
                            columns={columns}
                            dataSource={logs}
                            pagination={{ 
                                pageSize: 8, 
                                showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} logs`,
                            }}
                            loading={loading}
                            rowClassName={(record) => record.role === 'admin' ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}
                        />
                    ) : (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#ff4d4f' }}>
                            <SafetyCertificateOutlined style={{ fontSize: '60px', marginBottom: '20px', opacity: 0.5 }} />
                            <h2>Akses Terbatas</h2>
                            <p>Hanya Administrator yang memiliki izin untuk melihat halaman ini.</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default LogActivities;