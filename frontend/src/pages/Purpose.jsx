import { useState, useEffect } from "react";
import { Card, Row, Col, Button, Modal, Form, Input, InputNumber, Progress, Typography, Popconfirm, message, Empty, Tooltip, Spin, Grid} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, AimOutlined, RocketOutlined, } from "@ant-design/icons";
import { HeadNavbar } from "../components";
import api from "../api";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

const formatRupiah = (number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(number);
};

const Purpose = () => {
  const screens = useBreakpoint();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); 
  const [form] = Form.useForm();
  
  const [dataPurpose, setDataPurpose] = useState([]);
  const [loading, setLoading] = useState(false);

  const userString = localStorage.getItem('user'); 
  const user = userString ? JSON.parse(userString) : null;
  const isAdmin = user?.role === 'admin';

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/goals');
      if (res.data.status === 'success') {
        setDataPurpose(res.data.data);
      }
    } catch (error) {
      message.error("Gagal mengambil data tujuan.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      try {
        if (editingItem) {
            await api.put(`/goals/${editingItem.id}`, values);
            message.success("Tujuan berhasil diperbarui! 🚀");
        } else {
            await api.post('/goals', values);
            message.success("Tujuan baru berhasil ditambahkan! semangat 💪");
        }
        
        fetchGoals();
        setIsModalOpen(false);
        form.resetFields();
        setEditingItem(null);

      } catch (error) {
        console.error(error);
        message.error("Terjadi kesalahan saat menyimpan data.");
      }
    });
  };

  const handleDelete = async (id) => {
    try {
        await api.delete(`/goals/${id}`);
        message.success("Data berhasil dihapus.");
        fetchGoals(); 
    } catch (error) {
        console.error(error);
        message.error("Gagal menghapus data.");
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    form.setFieldsValue({
        title: item.title,
        target: item.target_amount, 
        collected: item.collected_amount, 
        description: item.description
    }); 
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingItem(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  return (
   <div>
      <HeadNavbar 
         title="Zipal Purpose"
         icon={<RocketOutlined/>}
         description="Tujuan Dari Uang Keseluruhan Tabungan Mau Untuk Apa"
       />
      
      <div style={{ padding: screens.xs ? "15px" : "20px", maxWidth: "1200px", margin: "0 auto" }}>
      
      <div style={{ 
          display: "flex", 
          flexDirection: screens.xs ? "column" : "row", 
          justifyContent: "space-between", 
          alignItems: screens.xs ? "flex-start" : "center", 
          marginBottom: "24px",
          gap: screens.xs ? "15px" : "0" 
      }}>
        <div style={{ width: screens.xs ? "100%" : "auto" }}>
          <Title level={3} style={{ margin: 0, fontSize: screens.xs ? "20px" : "24px" }}>
             <RocketOutlined style={{ color: "#1890ff", marginRight: "8px" }} /> Financial Goals
          </Title>
          <Text type="secondary" style={{ fontSize: screens.xs ? "13px" : "14px" }}>
             Monitor progress investasi dan tujuan keuangan kalian.
          </Text>
        </div>
        
        <Tooltip title={!isAdmin ? "Hanya admin yang bisa menambah" : ""}>
          <Button 
            type="primary" 
            disabled={!isAdmin} 
            icon={<PlusOutlined />} 
            size="large"
            onClick={openAddModal}
            style={{ 
                borderRadius: "8px", 
                width: screens.xs ? "100%" : "auto" 
            }}
          >
            Tambah Tujuan
          </Button>
        </Tooltip>
      </div>

      {loading ? (
          <div style={{textAlign: 'center', padding: '50px'}}><Spin size="large" /></div>
      ) : dataPurpose.length === 0 ? (
         <Empty description="Belum ada tujuan finansial. Yuk buat sekarang!" />
      ) : (
        <Row gutter={[24, 24]}>
          {dataPurpose.map((item) => {
            const target = parseFloat(item.target_amount);
            const collected = parseFloat(item.collected_amount);
            const percent = target > 0 ? ((collected / target) * 100).toFixed(1) : 0;
            
            return (
              <Col xs={24} md={12} lg={8} key={item.id}>
                <Card
                  hoverable
                  style={{ borderRadius: "12px", border: "1px solid #f0f0f0" }}
                  actions={[
                    isAdmin ? (
                        <Tooltip title="Edit Data" key="edit">
                            <EditOutlined 
                                onClick={() => openEditModal(item)} 
                                style={{ color: "#faad14", fontSize: "18px" }} 
                            />
                        </Tooltip>
                    ) : (
                        <Tooltip title="Akses Dibatasi" key="edit-disabled">
                            <EditOutlined 
                                style={{ color: "#d9d9d9", fontSize: "18px", cursor: "not-allowed" }} 
                            />
                        </Tooltip>
                    ),
                    isAdmin ? (
                        <Tooltip title="Hapus Data" key="delete">
                            <Popconfirm
                                title="Yakin hapus tujuan ini?"
                                onConfirm={() => handleDelete(item.id)}
                                okText="Ya, Hapus"
                                cancelText="Batal"
                            >
                                 <DeleteOutlined style={{ color: "#ff4d4f", fontSize: "18px" }} />
                            </Popconfirm>
                        </Tooltip>
                    ) : (
                        <Tooltip title="Akses Dibatasi" key="delete-disabled">
                             <DeleteOutlined 
                                style={{ color: "#d9d9d9", fontSize: "18px", cursor: "not-allowed" }} 
                             />
                        </Tooltip>
                    )
                  ]}
                >
                  <Card.Meta
                    avatar={
                        <div style={{ background: '#fff1b8', padding: '10px', borderRadius: '50%' }}>
                            <AimOutlined style={{ fontSize: '24px', color: '#d48806' }} />
                        </div>
                    }
                    title={<span style={{ fontSize: "16px", fontWeight: "bold", whiteSpace: "normal" }}>{item.title}</span>}
                    description={
                      <div style={{ minHeight: "60px" }}>
                         <Text type="secondary" ellipsis={{ tooltip: item.description, rows: 2 }}>
                           {item.description || "Tidak ada deskripsi."}
                         </Text>
                      </div>
                    }
                  />
                  
                  <div style={{ marginTop: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#8c8c8c" }}>
                      <span>Terkumpul</span>
                      <span>Target</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", marginBottom: "5px", fontSize: screens.xs ? "14px" : "15px" }}>
                      <span style={{ color: "#52c41a" }}>{formatRupiah(collected)}</span>
                      <span>{formatRupiah(target)}</span>
                    </div>
                    
                    <Progress 
                        percent={parseFloat(percent)} 
                        status="active" 
                        strokeColor={{
                            '0%': '#108ee9',
                            '100%': '#87d068',
                        }}
                    />
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <Modal
        title={editingItem ? "Edit Tujuan ✏️" : "Tambah Tujuan Baru 🎯"}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => setIsModalOpen(false)}
        okText={editingItem ? "Simpan Perubahan" : "Buat Tujuan"}
        cancelText="Batal"
        centered
        width={screens.xs ? "95%" : 520}
      >
        <Form form={form} layout="vertical" name="purposeForm">
          <Form.Item
            name="title"
            label="Nama Tujuan"
            rules={[{ required: true, message: "Nama tujuan wajib diisi!" }]}
          >
            <Input placeholder="Contoh: Investasi Emas, Beli Rumah" prefix={<RocketOutlined />} />
          </Form.Item>

          <Form.Item
            name="target_amount" 
            label="Target Nominal (Rp)"
            rules={[{ required: true, message: "Target nominal wajib diisi!" }]}
          >
             <InputNumber
                style={{ width: '100%' }}
                placeholder="Contoh: 100000000"
                inputMode="numeric"
                formatter={(value) => value ? `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                parser={(value) => value.replace(/\Rp\s?|(,*)/g, '')}
                onKeyPress={(event) => {
                    if (!/[0-9]/.test(event.key)) {
                        event.preventDefault();
                    }
                }}
             />
          </Form.Item>

           <Form.Item
              name="collected_amount" 
              label="Saldo Terkumpul Saat Ini"
              help="Update manual jika ada dana masuk/aset bertambah."
           >
              <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Contoh: 500000"
                  inputMode="numeric"
                  formatter={(value) => value ? `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                  parser={(value) => value.replace(/\Rp\s?|(,*)/g, '')}
                  onKeyPress={(event) => {
                    if (!/[0-9]/.test(event.key)) {
                        event.preventDefault();
                    }
                  }}
              />
           </Form.Item>

          <Form.Item
            name="description"
            label="Keterangan / Progress Aset"
          >
            <TextArea rows={3} placeholder="Contoh: Sudah beli emas 5 gram..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
   </div>
  );
};

export default Purpose;