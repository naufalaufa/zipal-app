import React, { useState } from 'react';
import { Card, Button, Checkbox, Typography, Divider, Alert, message, Space } from 'antd';
import { FileProtectOutlined, CheckCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { HeadNavbar } from "../components";

const { Title, Paragraph, Text } = Typography;

const Agreement = () => {
  const [agreed, setAgreed] = useState(false);
  const [isSigned, setIsSigned] = useState(false);

  const handleSign = () => {
    if (!agreed) return;
    
    setIsSigned(true);
    message.success({
      content: 'Perjanjian berhasil disahkan secara digital! 📜',
      duration: 5,
      icon: <SafetyCertificateOutlined style={{ color: '#52c41a' }} />,
    });
  };

  const agreementClauses = [
    {
      title: "Pasal 1: Tujuan & Definisi",
      content: "Tabungan ini dibuat atas nama bersama (Zihra & Naufal) dengan tujuan masa depan bersama (Menikah/Aset/Investasi). Rekening atau wadah penyimpanan dana ini adalah milik bersama, terlepas dari siapa pemegang akun utamanya."
    },
    {
      title: "Pasal 2: Mekanisme Setoran (Fairness)",
      content: "Setiap setoran dari Zihra maupun Naufal WAJIB dicatat nominal dan tanggalnya. Hal ini untuk memastikan transparansi persentase kontribusi masing-masing pihak (apakah 50:50 atau proporsional sesuai pendapatan)."
    },
    {
      title: "Pasal 3: Penggunaan Dana",
      content: "Dana di dalam tabungan ini TIDAK BOLEH ditarik atau digunakan untuk keperluan apa pun tanpa persetujuan tertulis atau lisan dari KEDUA BELAH PIHAK. Penggunaan sepihak dianggap sebagai pelanggaran perjanjian."
    },
    {
      title: "Pasal 4: Ketentuan Jika Berpisah (Putus Hubungan)",
      content: "Apabila terjadi perpisahan di antara kedua belah pihak sebelum tujuan tabungan tercapai, maka pembagian dana dilakukan dengan prinsip keadilan sebagai berikut: \n(a) Jika data setoran tercatat rapi: Dana dikembalikan ke masing-masing pihak sesuai dengan jumlah total nominal yang telah disetorkan masing-masing.\n(b) Jika setoran dianggap lebur: Dana dibagi rata (50% untuk Zihra, 50% untuk Naufal) tanpa memandang siapa yang menyetor lebih banyak."
    },
    {
      title: "Pasal 5: Keadaan Kahar (Force Majeure)",
      content: "Jika terjadi hal yang tidak diinginkan (seperti meninggal dunia atau ketidakmampuan hukum) pada salah satu pihak, maka hak atas dana tabungan tersebut sepenuhnya jatuh kepada pihak pasangan yang masih ada, atau dapat diserahkan kepada ahli waris yang ditunjuk, sesuai kesepakatan awal."
    },
    {
      title: "Pasal 6: Komitmen",
      content: "Dengan menyetujui perjanjian ini, Zihra dan Naufal berjanji untuk saling jujur, terbuka, dan tidak menyalahgunakan kepercayaan dalam mengelola tabungan ini."
    },
    {
      title: "Pasal 7: Sanksi Atas Ketidaksetiaan (Perselingkuhan)",
      content: "Demi menjaga integritas hubungan dan kepercayaan finansial, kedua belah pihak menyepakati aturan ketat mengenai perselingkuhan:\n\nApabila salah satu pihak terbukti secara sah dan meyakinkan melakukan perselingkuhan (melibatkan hubungan romantis atau seksual dengan pihak ketiga) selama periode menabung, maka pihak yang berselingkuh dikenakan sanksi berupa:\n\n(a) Kehilangan hak atas 50% dari total dana yang telah ia setorkan.\n(b) Dana denda tersebut (poin a) akan dialihkan sepenuhnya menjadi hak milik pihak yang diselingkuhi (korban) sebagai kompensasi kerugian emosional dan waktu.\n(c) Sisa dana milik pihak yang berselingkuh akan dikembalikan, dan perjanjian tabungan bersama dinyatakan berakhir seketika."
    }
  ];

  return (
    <div>
      <HeadNavbar 
        title="Zipal Agreement"
        icon={<FileProtectOutlined />} 
        description="Dokumen legalitas tabungan bersama (Joint Account Agreement)"
      />

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px 40px 20px' }}>
        
        <Alert
          message="Dokumen Resmi Internal"
          description="Harap baca setiap pasal dengan teliti. Kesepakatan ini mengikat kedua belah pihak demi kenyamanan finansial bersama."
          type="info"
          showIcon
          style={{ marginBottom: '20px', border: '1px solid #91d5ff', backgroundColor: '#e6f7ff' }}
        />

        <Card 
          bordered={false} 
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)', borderRadius: '12px' }}
          bodyStyle={{ padding: '0' }} // Reset padding card utama agar header rapi
        >
          <div style={{ padding: '24px', borderBottom: '1px solid #f0f0f0', textAlign: 'center', backgroundColor: '#fafafa', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
            <Title level={3} style={{ margin: 0 }}>SURAT PERJANJIAN TABUNGAN BERSAMA</Title>
            <Text type="secondary">Nomor: 001/ZIPAL/AGR/2026</Text>
          </div>

          <div style={{ 
            height: '500px', 
            overflowY: 'auto', 
            padding: '24px', 
            backgroundColor: '#fff' 
          }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              
              <Text>
                Pada hari ini, kami yang bertanda tangan di bawah ini:
                <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
                  <li><b>Pihak Pertama:</b> Zihra Angelina</li>
                  <li><b>Pihak Kedua:</b> Naufal Aufa</li>
                </ul>
                Sepakat untuk mengikatkan diri dalam perjanjian tabungan bersama dengan ketentuan sebagai berikut:
              </Text>

              {agreementClauses.map((clause, index) => (
                <Card 
                  key={index} 
                  type="inner" 
                  title={<span style={{ fontWeight: 'bold', color: '#1890ff' }}>{clause.title}</span>}
                  style={{ backgroundColor: '#fff', border: '1px solid #f0f0f0' }}
                >
                  <Text style={{ whiteSpace: 'pre-line', color: '#595959', lineHeight: '1.6' }}>
                    {clause.content}
                  </Text>
                </Card>
              ))}

              <Divider style={{ margin: '40px 0' }}>TANDA TANGAN DIGITAL</Divider>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', padding: '0 40px' }}>
                <div>
                  <div style={{ height: '60px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    {isSigned && <Text type="success" style={{ fontFamily: 'cursive', fontSize: '18px' }}>Zihra Angelina</Text>}
                  </div>
                  <Divider style={{ margin: '5px 0' }} />
                  <Text strong>Zihra Angelina</Text><br/>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Pihak Pertama</Text>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                   {isSigned ? 
                     <SafetyCertificateOutlined style={{ fontSize: '40px', color: '#52c41a', opacity: 0.5 }} /> : 
                     <Text type="secondary" italic>Menunggu persetujuan...</Text>
                   }
                </div>

                <div>
                  <div style={{ height: '60px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    {isSigned && <Text type="success" style={{ fontFamily: 'cursive', fontSize: '18px' }}>Naufal Aufa</Text>}
                  </div>
                  <Divider style={{ margin: '5px 0' }} />
                  <Text strong>Naufal Aufa</Text><br/>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Pihak Kedua</Text>
                </div>
              </div>

              <div style={{ height: '20px' }}></div>
            </Space>
          </div>

          <div style={{ padding: '20px 24px', borderTop: '1px solid #f0f0f0', backgroundColor: '#fafafa', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
            {isSigned ? (
               <Alert 
                 message="Dokumen Telah Disahkan" 
                 description="Perjanjian ini telah aktif dan mengikat kedua belah pihak sejak tombol ditekan."
                 type="success" 
                 showIcon 
               />
            ) : (
              <>
                <Checkbox 
                  checked={agreed} 
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}
                >
                  <Text strong>
                    Saya telah membaca, memahami, dan menyetujui seluruh pasal yang tertulis di atas tanpa paksaan dari pihak manapun.
                  </Text>
                </Checkbox>
                
                <Button 
                  type="primary" 
                  size="large" 
                  block 
                  disabled={!agreed} // Tombol mati kalau belum centang
                  onClick={handleSign}
                  icon={<CheckCircleOutlined />}
                  style={{ height: '50px', fontSize: '16px', fontWeight: 'bold' }}
                >
                  SAH-KAN PERJANJIAN
                </Button>
              </>
            )}
          </div>

        </Card>
      </div>
    </div>
  )
}

export default Agreement;