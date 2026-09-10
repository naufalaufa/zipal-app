import { useState } from "react";
import { Button, Checkbox, Form, Input, message } from "antd";
import ReCAPTCHA from "react-google-recaptcha";
import { useNavigate } from "react-router-dom";
import { startSession } from "../authSession";
import api from "../api";
import ForgotPassword from "./ForgotPassword";
import ThemeIndicator from './ThemeIndicator';

const FormLayout = () => {
  const [loading, setLoading] = useState(false);
  const [captchaVal, setCaptchaVal] = useState(null);
  const [isRemember, setIsRemember] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();

  const onChange = (e) => {
    setIsRemember(e.target.checked);
  };

  const onFinish = async (values) => {
    if (!captchaVal) {
      message.error("Silakan verifikasi Captcha terlebih dahulu!");
      return; 
    }

    if(isRemember === false) {
      message.error('Tolong lakukan aksi check sebelum login')
    }

    setLoading(true);

    try {
      const response = await api.post("/login", {
        username: values.username,
        password: values.password,
      });

      const { accessToken, data } = response.data;

      startSession({ accessToken, user: data });

      message.success("Login Berhasil! Selamat datang " + data.username);

      setTimeout(() => {
        navigate("/dashboard"); 
      }, 1000);

    } catch (error) {
      if (error.response) {
        message.error(error.response.data.message);
      } else {
        message.error("Gagal koneksi ke server Backend!");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCaptchaChange = (value) => {
    setCaptchaVal(value);
  };

  return (
    <div className="login-card">
      <div className="login-theme"><ThemeIndicator /></div>
      <div className="login-card-header">
        <span className="login-badge">Zipal · Zihra & Naufal</span>
        <h2>Selamat datang kembali</h2>
        <p>Langkah kecil hari ini, masa depan bersama.</p>
      </div>
      <Form
        layout="vertical"
        className="login-form"
        requiredMark={false}
        onFinish={onFinish}
      >
        <Form.Item
          label="Username"
          name="username"
          rules={[{ required: true, message: "Please input your username!" }]}
        >
          <Input placeholder="Enter your username" />
        </Form.Item>

        <Form.Item
          label="Password"
          name="password"
          rules={[{ required: true, message: "Please input your password!" }]}
        >
          <Input.Password placeholder="Enter your password" />
        </Form.Item>

        <Form.Item name="remember" valuePropName="checked">
          <Checkbox onChange={onChange} className="text-white">
            Remember me
          </Checkbox>
        </Form.Item>

        <Form.Item>
          <ReCAPTCHA
            sitekey={import.meta.env.VITE_SITE_KEY_RECAPTCHA_PRODUCTION}
            className="captcha-container"
            onChange={handleCaptchaChange}
          />

          <Button
            type="primary"
            htmlType="submit"
            block
            style={{ marginTop: "15px" }}
            loading={loading}
          >
            Submit
          </Button>
        </Form.Item>
        
        <Form.Item>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Button 
              type="link" 
              onClick={() => setIsModalOpen(true)}
              style={{ 
                color: "var(--accent-text)",
                textDecoration: "underline"
              }}
            >
              Forgot Password?
            </Button>
          </div>
        </Form.Item>
      </Form>
      <ForgotPassword
        open={isModalOpen} 
        onCancel={() => setIsModalOpen(false)} 
      />
      
    </div>
  );
};

export default FormLayout;
