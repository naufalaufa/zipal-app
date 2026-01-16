import { useState } from "react";
import { Modal, Form, Input, Button, message, Steps } from "antd";
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import api from "../api"; 

const ForgotPassword = ({ open, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [verifiedUser, setVerifiedUser] = useState(null);
  
  const [form] = Form.useForm();

  const handleCancel = () => {
    form.resetFields();
    setCurrentStep(0);
    setVerifiedUser(null);
    onCancel();
  };

  const handleCheckUsername = async () => {
    try {
        const values = await form.validateFields(["username"]);
        setLoading(true);

        const response = await api.post("/auth/check-username", {
            username: values.username
        });
        message.success(`Halo ${response.data.user.username}, silakan buat password baru.`);
        setVerifiedUser(values.username);
        setCurrentStep(1);

    } catch (error) {
        if (error.response) {
            message.error(error.response.data.message);
        } else {
            if(error.errorFields) return; 
            message.error("Terjadi kesalahan sistem.");
        }
    } finally {
        setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
        const values = await form.validateFields(["newPassword", "confirmPassword"]);
        setLoading(true);

        await api.post("/auth/reset-password", {
            username: verifiedUser,
            newPassword: values.newPassword
        });

        message.success("Password berhasil diubah! Silakan login kembali.");
        handleCancel();

    } catch (error) {
        if (error.response) {
            message.error(error.response.data.message);
        } else {
            if(error.errorFields) return;
            message.error("Gagal mengubah password.");
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal
      title="Pemulihan Akun"
      open={open}
      onCancel={handleCancel}
      footer={null}
      centered
    >
      <Steps 
        current={currentStep} 
        size="small" 
        style={{ marginBottom: 24 }}
        items={[
            { title: 'Verifikasi User' },
            { title: 'Password Baru' },
        ]}
      />

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
      >
        <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
            <p style={{ color: '#666', marginBottom: 16 }}>
                Masukkan username Anda untuk melanjutkan proses penggantian password.
            </p>
            <Form.Item
                label="Username"
                name="username"
                rules={[{ required: true, message: "Mohon isi username Anda!" }]}
            >
                <Input 
                    prefix={<UserOutlined />} 
                    placeholder="Contoh: naufalaufa" 
                    size="large" 
                />
            </Form.Item>
            
            <Button 
                type="primary" 
                block 
                size="large" 
                onClick={handleCheckUsername} 
                loading={loading}
            >
                Cari Akun
            </Button>
        </div>

        <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
            <p style={{ color: '#666', marginBottom: 16 }}>
                Akun ditemukan: <b>{verifiedUser}</b>. <br/>
                Silakan masukkan password baru Anda.
            </p>
            
            <Form.Item
                label="Password Baru"
                name="newPassword"
                rules={[
                    { required: true, message: "Masukkan password baru!" },
                    { min: 3, message: "Password minimal 3 karakter" }
                ]}
            >
                <Input.Password 
                    prefix={<LockOutlined />} 
                    placeholder="Password baru" 
                    size="large"
                />
            </Form.Item>

            <Form.Item
                label="Konfirmasi Password"
                name="confirmPassword"
                dependencies={['newPassword']}
                rules={[
                    { required: true, message: "Ulangi password baru!" },
                    ({ getFieldValue }) => ({
                        validator(_, value) {
                            if (!value || getFieldValue('newPassword') === value) {
                                return Promise.resolve();
                            }
                            return Promise.reject(new Error('Password tidak sama!'));
                        },
                    }),
                ]}
            >
                <Input.Password 
                    prefix={<SafetyCertificateOutlined />} 
                    placeholder="Ulangi password baru" 
                    size="large"
                />
            </Form.Item>

            <div style={{ display: 'flex', gap: 10 }}>
                <Button block size="large" onClick={() => setCurrentStep(0)}>
                    Kembali
                </Button>
                <Button 
                    type="primary" 
                    block 
                    size="large" 
                    onClick={handleResetPassword} 
                    loading={loading}
                    style={{ backgroundColor: '#52c41a' }}
                >
                    Simpan Password
                </Button>
            </div>
        </div>
      </Form>
    </Modal>
  );
};

export default ForgotPassword;