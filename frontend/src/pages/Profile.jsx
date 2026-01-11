import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Upload, Avatar, message, Row, Col, Typography, Divider } from 'antd';
import { UserOutlined, UploadOutlined, LockOutlined, SaveOutlined, KeyOutlined, EditOutlined } from '@ant-design/icons';
import { HeadNavbar } from '../components';
import { useOutletContext } from 'react-router-dom';
import api from '../api';

const { Title, Text } = Typography;

const Profile = () => {
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [fileList, setFileList] = useState([]);
  
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const { refreshHeader } = useOutletContext() || {}; 
  
  // Kita buat 2 Form Instance terpisah
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    // Set data awal hanya untuk form Profil
    profileForm.setFieldsValue({
      username: currentUser.username,
    });

    if (currentUser.avatar) {
      setImageUrl(`${import.meta.env.VITE_API_URL}/public/uploads/${currentUser.avatar}?t=${Date.now()}`);
    }
  }, [currentUser, profileForm]);

  const handleUploadChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
    if (newFileList.length > 0) {
      const file = newFileList[0].originFileObj;
      const reader = new FileReader();
      reader.onload = e => setImageUrl(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (values) => {
    setProfileLoading(true);
    const formData = new FormData();
    formData.append('id', currentUser.id);
    formData.append('username', values.username);
    
    if (fileList.length > 0) {
      formData.append('avatar', fileList[0].originFileObj);
    }

    try {
      const res = await api.put('/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.status === 'success') {
        message.success('Foto & Username berhasil diupdate! 📸');
        updateLocalUser(res.data.user);
        setFileList([]);
      }
    } catch (error) {
      console.error(error);
      message.error('Gagal update profil');
    } finally {
      setProfileLoading(false);
    }
  };

  // --- FUNGSI 2: KHUSUS GANTI PASSWORD ---
  const handleChangePassword = async (values) => {
    setPasswordLoading(true);
    const formData = new FormData();
    formData.append('id', currentUser.id);
    
    // Kita Tetap kirim username saat ini agar tidak tertimpa null di database
    formData.append('username', currentUser.username); 
    formData.append('password', values.newPassword);

    try {
      const res = await api.put('/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.status === 'success') {
        message.success('Password berhasil diganti! 🔒');
        updateLocalUser(res.data.user);
        passwordForm.resetFields(); // Kosongkan form password setelah sukses
      }
    } catch (error) {
      console.error(error);
      message.error('Gagal ganti password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Helper untuk update localStorage & Context
  const updateLocalUser = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    if (refreshHeader) refreshHeader();
  };

  return (
    <div> 
      <HeadNavbar 
         title="Zipal Profile"
         icon={<UserOutlined/>}
         description="Kelola informasi akun dan preferensi pribadi Anda"
       />

       <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
         <Row gutter={[24, 24]}>
            
            {/* --- GRID 1: PROFILE PICTURE & USERNAME --- */}
            <Col xs={24} md={12}>
                <Card 
                    title={<span><EditOutlined /> Edit Identitas</span>} 
                    bordered={false} 
                    style={{ borderRadius: '15px', height: '100%', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
                >
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <Avatar 
                            size={120} 
                            src={imageUrl} 
                            icon={<UserOutlined />} 
                            style={{ border: '4px solid #f0f0f0', backgroundColor: '#e6f7ff', color: '#1890ff', marginBottom: '15px' }}
                        />
                         <br/>
                         <Text type="secondary" strong>{currentUser.role === 'admin' ? 'Administrator' : 'User Member'}</Text>
                    </div>

                    <Form form={profileForm} layout="vertical" onFinish={handleUpdateProfile}>
                        <Form.Item label="Username" name="username" rules={[{ required: true, message: 'Username wajib diisi' }]}>
                            <Input prefix={<UserOutlined />} size="large" />
                        </Form.Item>

                        <Form.Item label="Ganti Foto">
                            <Upload beforeUpload={() => false} fileList={fileList} onChange={handleUploadChange} maxCount={1} listType="picture" accept="image/*">
                                <Button block icon={<UploadOutlined />}>Upload Foto Baru</Button>
                            </Upload>
                        </Form.Item>

                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} size="large" block loading={profileLoading} style={{ marginTop: '45px' }}>
                            Simpan Profil
                        </Button>
                    </Form>
                </Card>
            </Col>

            {/* --- GRID 2: CHANGE PASSWORD --- */}
            <Col xs={24} md={12}>
                <Card 
                    title={<span><LockOutlined /> Keamanan Akun</span>} 
                    bordered={false} 
                    style={{ borderRadius: '15px', height: '100%', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
                >
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#faad14' }}>
                        <KeyOutlined style={{ fontSize: '48px', marginBottom: '10px' }} />
                        <Title level={5} style={{ marginTop: 0 }}>Ganti Password</Title>
                        <Text type="secondary">Amankan akun Anda dengan password yang kuat.</Text>
                    </div>

                    <Divider />

                    <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
                        <Form.Item 
                            label="Password Baru" 
                            name="newPassword" 
                            rules={[
                                { required: true, message: 'Mohon isi password baru!' },
                                { min: 5, message: 'Password minimal 5 karakter!' }
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} size="large" placeholder="Masukkan password baru" />
                        </Form.Item>

                        <Form.Item 
                            label="Konfirmasi Password" 
                            name="confirmPassword"
                            dependencies={['newPassword']}
                            rules={[
                                { required: true, message: 'Mohon konfirmasi password!' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('newPassword') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('Password tidak cocok!'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} size="large" placeholder="Ulangi password baru" />
                        </Form.Item>

                        <Button type="primary" danger htmlType="submit" icon={<LockOutlined />} size="large" block loading={passwordLoading} style={{ marginTop: '10px' }}>
                            Update Password
                        </Button>
                    </Form>
                </Card>
            </Col>

         </Row>
       </div>
    </div>
  )
}

export default Profile;