import React, { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Table, Tag, Button, Modal, Form, InputNumber, Select, message, DatePicker, Progress, Divider, Tooltip } from "antd";
import { 
  DollarCircleOutlined, 
  GoldOutlined, 
  PlusCircleOutlined, 
  CalendarOutlined, 
  WalletOutlined, 
  CheckCircleOutlined,
  CalculatorOutlined,
  UnorderedListOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { HeadNavbar } from '../components';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import moment from 'moment';
import Swal from 'sweetalert2';
import api from "../api";

ChartJS.register(ArcElement, ChartTooltip, Legend);

const Investment = () => {
  const users = JSON.parse(localStorage.getItem('user')) || { role: 'guest' };
  const isAdmin = users.role === 'admin'; 

  const [loading, setLoading] = useState(true);
  
  const [cashBalance, setCashBalance] = useState(0); 
  const [totalAssetValue, setTotalAssetValue] = useState(0); 
  const [totalGram, setTotalGram] = useState(0); 
  const [assetData, setAssetData] = useState([]); 
  const [purchasedAssetList, setPurchasedAssetList] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (users.role === 'user') {
        Swal.fire({
            icon: 'info',
            title: 'Mode Read-Only',
            text: 'Anda sedang mengakses halaman Investasi sebagai User. Anda hanya dapat melihat data, tidak dapat melakukan pembelian.',
            confirmButtonText: 'Mengerti',
            confirmButtonColor: '#1890ff',
            background: '#f0f9ff',
            iconColor: '#1890ff'
        });
    } else if (users.role === 'admin') {
          Swal.fire({
            icon: 'info',
            title: 'Hallo Admin',
            text: 'Anda sedang mengakses halaman Investasi sebagai Admin. Yuk Berinvestasi 🚀',
            confirmButtonText: 'Mengerti',
            confirmButtonColor: '#1890ff',
            background: '#f0f9ff',
            iconColor: '#1890ff'
        });
    }
  }, []); 

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resSummary, resList] = await Promise.all([
        api.get('/summary'),
        api.get('/investments')
      ]);

      let modalDariAdmin = 0;
      if (resSummary.data.status === 'success') {
        modalDariAdmin = resSummary.data.data.total_investment || 0;
      }

      let uangTerpakai = 0;
      let calculatedGram = 0;
      let detailedList = [];

      if (resList.data.status === 'success') {
        const formattedData = resList.data.data.map((item, index) => {
           const amount = parseFloat(item.amount);
           uangTerpakai += amount;

           const gramMatch = item.description.match(/(\d+(\.\d+)?)\s*(Gr|Gram)/i);
           const gramValue = gramMatch ? parseFloat(gramMatch[1]) : 0;
           calculatedGram += gramValue;

           const pricePerGram = gramValue > 0 ? (amount / gramValue) : 0;

           detailedList.push({
               key: index,
               date: item.date,
               item: item.description,
               gram: gramValue,
               price: amount
           });

           return {
             key: item.id,
             date: item.date,
             type: 'Logam Mulia (Gold)',
             name: item.description,
             qty: gramValue > 0 ? `${gramValue} Gram` : '-',
             pricePerGram: pricePerGram,
             buyPrice: amount,
             status: 'Hold ✊'
           };
        });

        setAssetData(formattedData);
        setTotalGram(calculatedGram);
        setTotalAssetValue(uangTerpakai);
        setPurchasedAssetList(detailedList);
      }

      setCashBalance(modalDariAdmin - uangTerpakai);

    } catch (error) {
      console.error("Gagal ambil data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInvestSubmit = async (values) => {
    if (values.amount > cashBalance) {
        message.error(`Gagal! Saldo tidak cukup. Sisa: ${formatRupiah(cashBalance)}`);
        return;
    }

    try {
        await api.post('/transaction', {
            username: 'zipaladmin',
            type: 'withdraw',
            amount: values.amount,
            description: `${values.type} - ${values.gram} Gram`, 
            date: values.date ? values.date.format('YYYY-MM-DD') : moment().format('YYYY-MM-DD')
        });

        message.success('Investasi Berhasil Dicatat! 🚀');
        setIsModalOpen(false);
        form.resetFields();
        fetchData(); 
    } catch (error) {
        message.error('Gagal mencatat investasi');
    }
  };

  const formatRupiah = (val) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

  const chartData = {
    labels: ['Dana Dibelanjakan (Aset)', 'Sisa Saldo Cash (Idle)'],
    datasets: [
      {
        label: 'Nilai (Rp)',
        data: [totalAssetValue, cashBalance], 
        backgroundColor: ['#1890ff', '#52c41a'], 
        borderColor: ['#ffffff', '#ffffff'],
        borderWidth: 2,
      },
    ],
  };

  const columns = [
    {
      title: 'Tanggal',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      fixed: 'left',
      render: (text) => <span style={{ color: '#666', fontSize: '13px' }}><CalendarOutlined style={{ marginRight: '5px' }} />{moment(text).format('DD MMM YY')}</span>
    },
    {
      title: 'Produk',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text) => <span style={{fontWeight: 'bold', fontSize: '13px'}}>{text}</span>
    },
    {
      title: 'Qty', 
      dataIndex: 'qty',
      key: 'qty',
      width: 90,
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Harga/Gram',
      dataIndex: 'pricePerGram',
      key: 'pricePerGram',
      width: 140,
      align: 'right',
      render: (val) => <span style={{ color: '#faad14', fontWeight: '500' }}>{formatRupiah(val)}</span>
    },
    {
      title: 'Total Modal',
      dataIndex: 'buyPrice',
      key: 'buyPrice',
      width: 150,
      align: 'right',
      render: (val) => <span style={{color: '#1890ff', fontWeight: 'bold'}}>{formatRupiah(val)}</span>
    },
    {
        title: 'Status', 
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (text) => <Tag color="green">{text}</Tag>
    },
  ];

  const columnsAnalysis = [
    {
      title: 'Nama Pemilik',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text) => <span style={{ fontWeight: '600' }}>{text}</span>,
    },
    {
      title: 'Kontribusi (Est)',
      dataIndex: 'contribution',
      key: 'contribution',
      width: 150,
      render: (val) => <span style={{ color: '#cf1322', fontWeight: 'bold' }}>{formatRupiah(val)}</span>,
    },
    {
      title: 'Beban (%)',
      dataIndex: 'percent',
      key: 'percent',
      width: 150,
      render: (percent) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Progress percent={percent} size="small" showInfo={false} strokeColor={percent > 50 ? '#ff4d4f' : '#faad14'} style={{ width: '100px' }} />
             <span style={{ fontSize: '12px' }}>{percent}%</span>
        </div>
      ),
    },
  ];

  const columnsAssetDetail = [
    {
        title: 'Tanggal Beli',
        dataIndex: 'date',
        key: 'date',
        width: 120,
        render: (text) => moment(text).format('DD MMM YYYY')
    },
    {
        title: 'Barang Investasi',
        dataIndex: 'item',
        key: 'item',
        render: (text) => <b>{text}</b>
    },
    {
        title: 'Harga',
        dataIndex: 'price',
        key: 'price',
        align: 'right',
        render: (val) => formatRupiah(val)
    }
  ];

  const dataAnalysis = [
    {
      key: '1',
      name: 'Naufal Aufa 🧑‍🦱',
      contribution: totalAssetValue > 0 ? (totalAssetValue - 3300000) : 0, 
      percent: totalAssetValue > 0 ? (((totalAssetValue - 3300000) / totalAssetValue) * 100).toFixed(1) : 0,
    },
    {
      key: '2',
      name: 'Zihra Angelina 👧',
      contribution: totalAssetValue > 0 ? 3300000 : 0, 
      percent: totalAssetValue > 0 ? ((3300000 / totalAssetValue) * 100).toFixed(1) : 0,
    },
  ];

  const handleProtectedClick = () => {
    if (isAdmin) {
        setIsModalOpen(true);
    } else {
        message.error("⛔ Akses Ditolak! Hanya Admin yang boleh menambah investasi.");
    }
  };

  return (
    <div>
      <HeadNavbar
        title="Zipal Investment Portfolio"
        icon={<DollarCircleOutlined/>} 
        description="Detail aset investasi yang dimiliki oleh Zihra & Naufal"
      />

      <div style={{ padding: '0 20px 40px 20px' }}>
        
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <Tooltip title={!isAdmin ? "Hanya Admin yang boleh mengakses ini" : ""}>
                <div style={{ display: 'inline-block', position: 'relative' }}> 
                    <Button 
                        type="primary" 
                        icon={!isAdmin ? <LockOutlined /> : <PlusCircleOutlined />} 
                        style={{ 
                            backgroundColor: !isAdmin ? '#d9d9d9' : '#faad14', 
                            borderColor: !isAdmin ? '#d9d9d9' : '#faad14', 
                            height: '40px', fontWeight: 'bold',
                            color: !isAdmin ? '#8c8c8c' : '#fff',
                            cursor: !isAdmin ? 'not-allowed' : 'pointer'
                        }}
                        onClick={handleProtectedClick}
                    >
                        {!isAdmin ? "Hanya Admin (Locked)" : "Go Investment 🚀"}
                    </Button>
                </div>
            </Tooltip>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card variant="borderless" style={{ background: 'linear-gradient(135deg, #3a7bd5 0%, #3a6073 100%)', color: 'white' }}>
              <Statistic 
                title={<span style={{ color: '#e0e0e0' }}>Dana Dibelanjakan</span>}
                value={totalAssetValue} 
                formatter={formatRupiah}
                valueStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '1.5rem' }}
                prefix={<CheckCircleOutlined />}
              />
               <div style={{color: '#e0e0e0', fontSize: '12px', marginTop: '5px'}}>*Total modal yang sudah jadi aset</div>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card variant="borderless" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white' }}>
              <Statistic 
                title={<span style={{ color: '#e0e0e0' }}>Sisa Saldo Cash</span>}
                value={cashBalance} 
                formatter={formatRupiah}
                valueStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '1.5rem' }}
                prefix={<WalletOutlined />}
              />
               <div style={{color: '#e0e0e0', fontSize: '12px', marginTop: '5px'}}>*Dana siap pakai (Available)</div>
            </Card>
          </Col>

          <Col xs={24} md={8}>
             <Card variant="borderless" style={{ background: '#fff4cc', border: '1px solid #ffe58f' }}>
              <Statistic 
                title={<span style={{ color: '#876800' }}>Total Fisik Emas</span>}
                value={totalGram} 
                suffix="Gram"
                precision={2}
                valueStyle={{ color: '#d48806', fontWeight: 'bold', fontSize: '1.5rem' }}
                prefix={<GoldOutlined />}
              />
              <div style={{color: '#876800', fontSize: '12px', marginTop: '5px'}}>*Akumulasi berat logam mulia</div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[24, 24]} style={{ marginTop: '30px' }}>
          <Col xs={24} lg={10}>
             <Card title="Alokasi Portofolio 📊" variant="borderless" style={{ height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                   <Doughnut 
                      data={chartData} 
                      options={{ 
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } }
                      }} 
                   />
                </div>
             </Card>
          </Col>

          <Col xs={24} lg={14}>
            <Card title="Riwayat Pembelian Aset 📝" variant="borderless" style={{ height: '100%' }}>
               <Table 
                  columns={columns} 
                  dataSource={assetData} 
                  pagination={{ pageSize: 5 }} 
                  loading={loading}
                  scroll={{ x: 900 }} 
                  size="middle"
               />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: '30px' }}>
            <Col span={24}>
                <Card 
                    title={<span><CalculatorOutlined /> Analisis Beban Investasi (Real-Time)</span>} 
                    variant="borderless"
                >
                    <h4 style={{ color: '#666', marginBottom: '10px' }}>1. Proporsi Kontribusi Dana</h4>
                    <Table 
                        columns={columnsAnalysis} 
                        dataSource={dataAnalysis} 
                        pagination={false} 
                        bordered
                        size="small"
                        scroll={{ x: 400 }} 
                    />
                    
                    <Divider />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h4 style={{ color: '#666', margin: 0 }}>2. Rincian Objek Investasi (Barang Terbeli) <UnorderedListOutlined /></h4>
                        <Tag color="blue">Total: {formatRupiah(totalAssetValue)}</Tag>
                    </div>
                    
                    <Table 
                        columns={columnsAssetDetail}
                        dataSource={purchasedAssetList}
                        pagination={false}
                        bordered
                        size="small"
                        scroll={{ x: 400 }}
                        locale={{ emptyText: 'Belum ada aset dibeli' }}
                    />

                    <div style={{ marginTop: '15px', color: '#888', fontSize: '12px', fontStyle: 'italic' }}>
                        * Tabel di atas menunjukkan daftar aset fisik yang dibeli menggunakan dana kontribusi gabungan.
                    </div>
                </Card>
            </Col>
        </Row>

      </div>

      <Modal
        title="Tambah Investasi Baru 💰"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <div style={{ 
            background: '#f6ffed', 
            border: '1px solid #b7eb8f', 
            padding: '12px', 
            borderRadius: '8px', 
            marginBottom: '20px', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '5px'
        }}>
            <span style={{ fontSize: '14px', color: '#555' }}>Dana Cash Tersedia:</span>
            <span style={{ color: '#52c41a', fontWeight: 'bold', fontSize: '20px' }}>
                {formatRupiah(cashBalance)}
            </span>
            <span style={{ fontSize: '11px', color: '#999' }}>*Pastikan nominal tidak melebihi saldo ini</span>
        </div>

        <Form layout="vertical" form={form} onFinish={handleInvestSubmit}>
            <Form.Item label="Jenis Investasi" name="type" initialValue="Emas Antam" rules={[{ required: true }]}>
                <Select>
                    <Select.Option value="Emas Antam">Emas Antam</Select.Option>
                    <Select.Option value="Emas UBS">Emas UBS</Select.Option>
                </Select>
            </Form.Item>

            <Form.Item label="Tanggal Pembelian" name="date" rules={[{ required: true, message: 'Pilih tanggal!' }]}>
                <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
            </Form.Item>

            <Form.Item 
                label="Nominal Rupiah (Rp)" 
                name="amount" 
                rules={[
                    { required: true, message: 'Masukkan nominal!' },
                    {
                        validator: (_, value) => {
                            if (value > cashBalance) {
                                return Promise.reject(new Error('Saldo tidak mencukupi!'));
                            }
                            return Promise.resolve();
                        }
                    }
                ]}
            >
                 <InputNumber 
                    style={{ width: '100%' }} 
                    placeholder="Masukkan Harga Beli"
                    formatter={value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                    parser={value => value.replace(/\Rp\s?|(,*)/g, '')} 
                 />
            </Form.Item>

            <Form.Item label="Berat (Gram)" name="gram" rules={[{ required: true, message: 'Masukkan gramasi!' }]}>
                 <InputNumber style={{ width: '100%' }} placeholder="Contoh: 1.5" step={0.1} suffix="Gr" />
            </Form.Item>

            <Button type="primary" htmlType="submit" block style={{ backgroundColor: '#faad14', borderColor: '#faad14', color: 'black', fontWeight: 'bold' }}>
                Beli Aset Sekarang 🛒
            </Button>
        </Form>
      </Modal>

    </div>
  )
}

export default Investment;