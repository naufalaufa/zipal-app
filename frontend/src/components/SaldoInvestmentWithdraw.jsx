import { useState } from "react";
import { Avatar, Tooltip } from "antd";
import { EyeInvisibleOutlined, EyeOutlined, FundOutlined } from '@ant-design/icons';

const SaldoInvestmentWithdraw = ({ total }) => {
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
      marginTop: '50px', 
      marginBottom: '60px',
      gap: '5px' 
    }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' , marginBottom : '5px' }}>
        <h5 style={{ margin: 0, color: '#8c8c8c'}}>Total Saldo Aset Investasi</h5>
        
        <Tooltip
          title="Total akumulasi dana yang sudah ditarik dan dibelanjakan menjadi aset (Emas, Saham, dll)."
          placement="top"
        >
          <Avatar 
            size="small" 
            style={{ backgroundColor: '#52c41a', cursor: 'pointer' }} 
            icon={<FundOutlined />} 
          />
        </Tooltip>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        
        <span style={{ fontWeight: 'bold', fontSize: '17px', color: '#52c41a' }}>
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

export default SaldoInvestmentWithdraw;