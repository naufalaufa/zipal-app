import { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";
import api from '../api';

ChartJS.register(ArcElement, Tooltip, Legend);
const ChartInvestment = () => {
  const [investmentTotal, setInvestmentTotal] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/summary');
        if (res.data.status === 'success') {
          setInvestmentTotal(res.data.data.total_investment || 0);
        }
      } catch (error) {
        console.error("Gagal ambil data investasi:", error);
      }
    };

    fetchData();
  }, []);

  const data = {
    labels: ["Total Dana Terinvestasi"], 
    datasets: [
      {
        label: "Nominal (Rp)",
        data: [investmentTotal], 
        backgroundColor: [
          "rgba(75, 192, 192, 0.5)", 
        ],
        borderColor: [
          "rgba(75, 192, 192, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        position: 'bottom', 
      }
    }
  };

  return (
    <div style={{ width: '100%', textAlign: 'center' }}>
      {investmentTotal === 0 ? (
        <div style={{ padding: '20px', color: '#888' }}>
            <p style={{ fontWeight: 'bold', margin: 0 }}>Investment Portfolio Empty</p>
            <small>Belum ada dana yang ditarik oleh Admin untuk Investasi</small>
        </div>
      ) : (
        <div style={{ width: '250px', margin: '0 auto' }}>
           <Pie data={data} options={options} />
        </div>
      )}
    </div>
  );
};

export default ChartInvestment;