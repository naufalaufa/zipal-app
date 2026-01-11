import { useState } from "react";
import { Avatar, Tooltip } from "antd";
import { ArrowDownOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';

const SaldoAllWithDraw = ({ total }) => { 
  const [isVisible, setIsVisible] = useState(false);

  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(number || 0);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      width: '100%',
      height: '100%',
      gap: '5px' 
    }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom : '5px' }}>
        <h5 style={{ margin: 0, color: '#8c8c8c' }}>Total Uang Keluar (All Time)</h5>
        
        <Tooltip
          title="Total akumulasi uang yang sudah ditarik (Withdraw) dari sistem."
          placement="top"
        >
          {/* Menggunakan Icon Panah Bawah dengan warna Merah */}
          <Avatar 
            size="small" 
            style={{ backgroundColor: '#cf1322', cursor: 'pointer' }} 
            icon={<ArrowDownOutlined />} 
          />
        </Tooltip>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        
        <span style={{ fontWeight: 'bold', fontSize: '17px', color: '#cf1322' }}>
          {isVisible ? formatRupiah(total) : 'Rp **********'}
        </span>

        <div 
          onClick={() => setIsVisible(!isVisible)} 
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#1890ff', fontSize: '16px' }}
        >
          {isVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
        </div>

      </div>
      
    </div>
  );
}

export default SaldoAllWithDraw;