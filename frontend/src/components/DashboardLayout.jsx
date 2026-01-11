import { useState, useEffect, useCallback } from 'react'; 
import { HistoryOutlined, DollarCircleOutlined, DashboardOutlined, UserOutlined, FileOutlined, LogoutOutlined , EyeOutlined , EyeInvisibleOutlined , WalletOutlined,  TeamOutlined, IdcardOutlined } from '@ant-design/icons';
import { Avatar, Button, Layout, Menu, theme, Modal, Typography, Tag, Divider, Descriptions } from 'antd'; 
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import Swal from 'sweetalert2'
import api from '../api';

const { Header, Content, Footer, Sider } = Layout;
const { Title, Text } = Typography;

const menuItems = [
  { 
    key: '/dashboard', 
    icon: <DashboardOutlined />,
    label: 'Dashboard' 
  },
  {
    key: '/dashboard/history', 
    icon: <HistoryOutlined />,
    label: 'History'
  },
  {
    key: '/dashboard/investment',
    icon: <DollarCircleOutlined />,
    label: 'Investment'
  },
  {
    key: '/dashboard/purpose',
    icon: <TeamOutlined />, 
    label: 'Purpose' 
  },
  { 
    key: '/dashboard/profile',
    icon: <UserOutlined />,
    label: 'Profile'
  },
  {
    key: '/dashboard/agreement',
    icon: <FileOutlined />, 
    label: 'Agreement' 
  },
];

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('user')) || { username: 'Guest' });
  const [avatarUrl, setAvatarUrl] = useState(null);

  const [cashAvailable, setCashAvailable] = useState(0);
  const [showBalance, setShowBalance] = useState(false); 
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();

  const updateUserData = useCallback(() => {
    const latestUser = JSON.parse(localStorage.getItem('user')) || { username: 'Guest' };
    setCurrentUser(latestUser);
    
    if (latestUser.avatar) {
      setAvatarUrl(`${import.meta.env.VITE_API_URL}/public/uploads/${latestUser.avatar}?t=${Date.now()}`);
    } else {
      setAvatarUrl(null);
    }
  }, []);

  const fetchSaldoNavbar = useCallback(async () => {
    try {
      const res = await api.get('/summary');
      if (res.data.status === 'success') {
        setCashAvailable(res.data.data.grand_total || 0);
      }
    } catch (error) {
      console.error("Gagal load saldo navbar", error);
    }
  }, []);

  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(number || 0);
  };

  useEffect(() => {
    updateUserData();
    fetchSaldoNavbar();
  }, [updateUserData, fetchSaldoNavbar]);

  // --- LOGOUT DENGAN FOTO PROFILE (UPDATED) ---
  const LogoutAccount = () => {
    Swal.fire({
      title: 'Do you want to logout?',
      text: currentUser.username,
      
      // Setting Gambar
      imageUrl: avatarUrl, 
      imageWidth: 160,   // Ukuran Lebih Besar
      imageHeight: 160,  // Ukuran Lebih Besar
      imageAlt: 'User Avatar',
      
      // Icon fallback jika tidak ada foto
      icon: !avatarUrl ? 'warning' : undefined, 
      
      showCancelButton: true,
      confirmButtonColor: '#d33', 
      cancelButtonColor: '#3085d6',
      confirmButtonText: "Yes, Logout",
      cancelButtonText: "Cancel",

      // --- SUNTIK CSS SUPAYA BULAT & TIDAK PEYANG ---
      didOpen: () => {
        const image = Swal.getImage();
        if (image) {
            image.style.borderRadius = '50%'; // Bikin Bulat
            image.style.objectFit = 'cover';  // Bikin Proporsional (Gak Peyang)
            image.style.border = '4px solid #eee'; // Pemanis Border
            image.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)'; // Pemanis Bayangan
        }
      }
      // ----------------------------------------------

    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('user');
        sessionStorage.removeItem('admin_welcome_shown');
        window.location.href = "/"; 
      }
    });
  }
  // ----------------------------------

  const refreshAllData = () => {
      updateUserData();
      fetchSaldoNavbar();
  }

  const showProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const handleProfileModalOk = () => {
    setIsProfileModalOpen(false);
  };

  const handleProfileModalCancel = () => {
    setIsProfileModalOpen(false);
  };

  return (
    <Layout style={{ height: '100vh', width: '100vw', overflow: 'hidden', display: 'flex' }}>
      <Sider breakpoint="lg" collapsedWidth="0" onCollapse={(value) => setCollapsed(value)} style={{ position: 'relative', height: '100vh' }}>
        <div style={{ fontSize: '14px', height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', display: 'grid', placeContent: 'center', placeItems: 'center', color: 'white', borderRadius: '10px' }} >
          <p>Zipal Application 📱</p>
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menuItems} onClick={({ key }) => navigate(key)} />
        {!collapsed && (
          <Button onClick={LogoutAccount} icon={<LogoutOutlined />} style={{ width: '90%', position: 'absolute', bottom: '10px', left: '5%', right: '5%', fontWeight: 'bold' }}>
            Logout
          </Button>
        )}
      </Sider>

      <Layout style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
        
        <Header style={{ 
            color: 'white', 
            padding: '0 24px',
            background: '#001529',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <div style={{  padding: '5px 8px', borderRadius: '6px' }}>
                <WalletOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
             </div>

             <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                <span style={{ fontSize: '10px', color: '#bfbfbf', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cash Available</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>
                        {showBalance ? formatRupiah(cashAvailable) : 'Rp **********'}
                    </span>
                    <div 
                        onClick={() => setShowBalance(!showBalance)} 
                        style={{ cursor: 'pointer', color: '#1890ff', fontSize: '14px', display: 'flex' }}
                    >
                        {showBalance ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                    </div>
                </div>
             </div>
          </div>

          <div 
            onClick={showProfileModal} 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} 
          >
            <small style={{ textAlign: 'end', marginBottom: 0, fontWeight: '300', display: collapsed ? 'none' : 'block' }}>
                Hallo {currentUser.username}👋
            </small>
            
            <Avatar 
                size="large"
                src={avatarUrl} 
                icon={!avatarUrl && <UserOutlined />} 
                style={{ backgroundColor: avatarUrl ? 'transparent' : '#1890ff', border: '1px solid white' }}
            />
          </div>
        </Header>

        <Content style={{ margin: '24px 16px 0', flex: '0 0 auto' }}>
          <div style={{ padding: 24, minHeight: 360, background: colorBgContainer, borderRadius: borderRadiusLG }}>
            <Outlet context={{ refreshHeader: refreshAllData }} />
          </div>
        </Content>

        <Footer style={{ textAlign: 'center', flexShrink: 0 }}>Zihra Naufal (Zipal)</Footer>
      </Layout>

      {/* --- MODAL PROFILE POPUP --- */}
      <Modal 
        title={null} 
        open={isProfileModalOpen} 
        onOk={handleProfileModalOk} 
        onCancel={handleProfileModalCancel}
        footer={[
          <Button key="edit" type="primary" onClick={() => {
              setIsProfileModalOpen(false);
              navigate('/dashboard/profile');
          }}>
             Edit Profile
          </Button>,
          <Button key="close" onClick={handleProfileModalCancel}>
             Tutup
          </Button>
        ]}
        centered
        width={400} 
      >
         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
            <div style={{ position: 'relative', marginBottom: '20px' }}>
                <Avatar 
                    size={200} 
                    src={avatarUrl} 
                    icon={!avatarUrl && <UserOutlined />} 
                    style={{ backgroundColor: '#e6f7ff', border: '5px solid #1890ff', color: '#1890ff' }}
                />
                <div style={{ 
                    position: 'absolute', 
                    bottom: '10px', 
                    right: '10px', 
                    background: currentUser.role === 'admin' ? '#faad14' : '#52c41a', 
                    borderRadius: '50%', 
                    padding: '8px', 
                    border: '3px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}>
                    <IdcardOutlined style={{ color: 'white', fontSize: '20px' }} /> 
                </div>
            </div>

            <Title level={2} style={{ margin: 0, fontSize: '24px' }}>{currentUser.username}</Title>
            <div style={{ marginTop: '5px' }}>
                <Tag color={currentUser.role === 'admin' ? 'gold' : 'green'} style={{ fontSize: '14px', padding: '5px 12px' }}>
                    {currentUser.role === 'admin' ? 'Administrator' : 'User Member'}
                </Tag>
            </div>

            <Divider style={{ margin: '20px 0' }} />

            <Descriptions column={1} size="middle" style={{ width: '100%' }} contentStyle={{ fontWeight: 'bold' }}>
                <Descriptions.Item label="User ID">
                    <Text copyable style={{ fontSize: '15px' }}>{currentUser.id}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                     <span style={{ color: '#52c41a', fontSize: '15px' }}>● Active Account</span>
                </Descriptions.Item>
            </Descriptions>
         </div>
      </Modal>
    </Layout>
  );
};

export default DashboardLayout;