import { useState } from "react";
import { Button, Checkbox, Form, Input, message } from "antd";
import ReCAPTCHA from "react-google-recaptcha";
import { useNavigate } from "react-router-dom";
import api from "../api";
import ForgotPassword from "./ForgotPassword";

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

    if (isRemember === false) {
      message.error("Tolong lakukan aksi check sebelum login");
    }

    setLoading(true);

    try {
      const response = await api.post("/login", {
        username: values.username,
        password: values.password,
      });

      const { accessToken, refreshToken, data } = response.data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(data));

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
    <div className="form-outer-wrapper">
      <div className="login-card">
        <div className="login-card-header">
          <div className="login-badge">Zipal 🧑‍🦱👧</div>
          <div className="login-icon-wrap">🔐</div>
          <h2 className="login-heading">Selamat Datang Kembali</h2>
          <p className="login-subheading">Masukkan kredensial Anda untuk masuk</p>
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
            <Input placeholder="Masukkan username Anda" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password placeholder="Masukkan password Anda" />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox onChange={onChange}>Ingat saya</Checkbox>
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
              className="login-submit-btn"
              loading={loading}
            >
              Masuk ke Akun
            </Button>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Button
                type="link"
                onClick={() => setIsModalOpen(true)}
                className="forgot-password-btn"
              >
                Lupa Password?
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>

      <ForgotPassword open={isModalOpen} onCancel={() => setIsModalOpen(false)} />
    </div>
  );
};

export default FormLayout;
