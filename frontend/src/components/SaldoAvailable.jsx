import { useState } from "react";
import { Avatar, Tooltip } from "antd";
import { DollarCircleOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';

const SaldoAvailable = ({ total }) => { 
  const [isVisible, setIsVisible] = useState(false);

  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2
    }).format(number || 0);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      marginTop: '50px', 
      marginBottom: '60px',
      gap: '5px' 
    }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' , marginBottom : '5px' }}>
        <h5 style={{ margin: 0, color: '#8c8c8c'}}>Saldo | Cash Available</h5>
        
        <Tooltip
          title="Jumlah Sisa Saldo Yang Belum Terpakai Untuk Keperluan Withdraw ataupun Withdraw For Investasi"
          placement="top"
          overlayInnerStyle={{ fontSize: '12px', padding: '6px 10px', minHeight: 'auto' }}
        >
          <Avatar 
            size="small" 
            style={{ backgroundColor: 'green', cursor: 'pointer' }} 
            icon={<DollarCircleOutlined />} 
          />
        </Tooltip>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        
        <span style={{ fontWeight: 'bold', fontSize: '17px' }}>
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

export default SaldoAvailable;