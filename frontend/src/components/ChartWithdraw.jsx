import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import api from '../api';

ChartJS.register(ArcElement, Tooltip, Legend);
const ChartWithdraw = () => {
  const [withdrawValues, setWithdrawValues] = useState([0, 0]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/summary');
        if (res.data.status === 'success') {
          setWithdrawValues([
            res.data.data.withdraw_zihra,
            res.data.data.withdraw_naufal
          ]);
        }
      } catch (error) {
        console.error("Gagal ambil data withdraw:", error);
      }
    };

    fetchData();
  }, []);

  const data = {
    labels: ['Zihra Angelina', 'Naufal Aufa'],
    datasets: [
      {
        label: 'Total Withdraw (Rp)',
        data: withdrawValues,
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

  const totalData = withdrawValues.reduce((a, b) => a + b, 0);

  return (
    <div style={{ textAlign: 'center' }}>
      {totalData === 0 ? (
        <div style={{ padding: '20px', color: '#888' }}>
            <p style={{ fontWeight: 'bold' }}>Withdraw is empty</p>
            <small>Masih kosong Belum Ada Yang Withdraw</small>
        </div>
      ) : (
        <Pie data={data} />
      )}
    </div>
  );
}

export default ChartWithdraw;