import { useState } from "react";
import { EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";

const StatisticWithHide = ({ value, color }) => {
  const [isVisible, setIsVisible] = useState(false);

  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(number || 0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px'}}>
        <span style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: color, 
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial' 
        }}>
          {isVisible ? formatRupiah(value) : 'Rp **********'}
        </span>

        <div 
          onClick={() => setIsVisible(!isVisible)} 
          style={{ 
            cursor: 'pointer', 
            color: '#1890ff', 
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            padding: '5px',
            borderRadius: '50%',
            backgroundColor: isVisible ? '#e6f7ff' : 'transparent',
            transition: 'all 0.3s'
          }}
          title={isVisible ? "Sembunyikan Saldo" : "Tampilkan Saldo"}
        >
          {isVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
        </div>
      </div>
    </div>
  );
};

export default StatisticWithHide;