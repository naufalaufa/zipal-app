import { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import api from '../api'; 

ChartJS.register(ArcElement, Tooltip, Legend);

const ChartDeposit = () => {
  const [chartValues, setChartValues] = useState([0, 0]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/summary'); 
        
        if (res.data.status === 'success') {
          setChartValues([
            res.data.data.total_zihra, 
            res.data.data.total_naufal
          ]);
        }
      } catch (error) {
        console.error("Gagal mengambil data chart:", error);
      }
    };

    fetchData();
  }, []);

  const data = {
    labels: ['Zihra Angelina', 'Naufal Aufa'],
    datasets: [
      {
        label: 'Total Saldo (Rp)',
        data: chartValues, 
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return <Pie data={data} />;
}

export default ChartDeposit;