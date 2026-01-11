import { useEffect, useState } from "react";
import { Card, Col, Row, Divider, Modal, Grid, Tooltip } from "antd"; 
import { DepositModal, WithdrawModal, ChartDeposit, ChartWithdraw, ChartInvestment, HeadNavbar, SaldoAvailable, SaldoInvestmentWithdraw, SaldoTotalIn, SaldoAllWithDraw, StatisticWithHide } from "../components";
import { LineChartOutlined, FundViewOutlined, DashboardOutlined, RiseOutlined, WalletOutlined, EyeOutlined, EyeInvisibleOutlined, InfoCircleOutlined } from "@ant-design/icons";
import api from "../api";

const { useBreakpoint } = Grid; 

const formatRupiahSimple = (number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(number || 0);
};

const BalanceTitle = ({ name, emoji, userTotalDeposit, totalDepositOverall, grandTotal, screens, onMobileClick, colorHighlight }) => {
  const [isVisible, setIsVisible] = useState(false); 

  const contributionPercent = totalDepositOverall > 0 
    ? (userTotalDeposit / totalDepositOverall) * 100 
    : 0;

  const cashShare = (contributionPercent / 100) * grandTotal;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <div style={{display:'flex', flexDirection:'column'}}>
         <span style={{ fontWeight: '600', fontSize:'16px' }}>{name} {emoji}</span>
         {screens.md && (
             <span style={{ fontSize: '11px', color: '#8c8c8c' }}>
                Kontribusi: <b>{contributionPercent.toFixed(1)}%</b>
             </span>
         )}
      </div>

      {screens.md ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 'normal', color: '#666', background:'#f5f5f5', padding:'4px 12px', borderRadius:'8px' }}>
          <Tooltip title={`Ini adalah ${contributionPercent.toFixed(1)}% dari Total Saldo Aktif (${formatRupiahSimple(grandTotal)}) berdasarkan kontribusi deposit.`}>
             <InfoCircleOutlined style={{color: colorHighlight, marginRight:'4px'}}/>
          </Tooltip>
          
          <span>Porsi Tunai: </span>
          <span style={{ fontWeight: 'bold', color: isVisible ? colorHighlight : '#bfbfbf', fontSize:'15px' }}>
             {isVisible ? formatRupiahSimple(cashShare) : 'Rp **********'}
          </span>
          
          <div 
            onClick={() => setIsVisible(!isVisible)} 
            style={{ cursor: 'pointer', color: '#1890ff', display: 'flex', alignItems: 'center', marginLeft: '5px' }}
            title={isVisible ? "Sembunyikan" : "Tampilkan"}
          >
            {isVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          </div>
        </div>
      ) : (
        <div 
            onClick={onMobileClick}
            style={{ 
                cursor: 'pointer', 
                background: '#f0f5ff', 
                border: '1px solid #d9d9d9',
                padding: '4px 8px', 
                borderRadius: '6px', 
                color: '#1890ff',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
            }}
        >
            <WalletOutlined /> <span style={{ fontSize: '12px' }}>{contributionPercent.toFixed(0)}% Tunai</span>
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const users = JSON.parse(localStorage.getItem('user')) || { role: 'guest' };
  const screens = useBreakpoint(); 
  
  const [dataSaldo, setDataSaldo] = useState({
    total_naufal: 0,        
    total_zihra: 0,         
    total_deposit_naufal: 0, 
    total_deposit_zihra: 0,  
    withdraw_naufal: 0,      
    withdraw_zihra: 0,       
    grand_total: 0,
    total_investment: 0,
    total_deposit_overall: 0 
  });

  const fetchSaldo = async () => {
    try {
      const res = await api.get('/summary');
      if (res.data.status === 'success') {
        setDataSaldo(res.data.data);
      }
    } catch (error) {
      console.error("Gagal ambil data", error);
    }
  };

  useEffect(() => {
    fetchSaldo();
  }, []);

  const totalWithdrawCalculated = (dataSaldo.total_deposit_overall || 0) - (dataSaldo.grand_total || 0);
  const showBalanceModal = (name, totalDepositUser, totalDepositAll, grandTotal) => {
    const percent = totalDepositAll > 0 ? (totalDepositUser / totalDepositAll) * 100 : 0;
    const cashShare = (percent / 100) * grandTotal;

    Modal.info({
      title: null, 
      icon: null,  
      content: (
        <div style={{ 
          display: 'flex',
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          textAlign: 'center',
          padding: '10px 0'
        }}>
          <WalletOutlined style={{ fontSize: '40px', color: '#1890ff', marginBottom: '15px' }} />
          <h3 style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '18px' }}>Porsi Uang Tunai {name}</h3>
          
          <div style={{background:'#f6ffed', border:'1px solid #b7eb8f', padding:'5px 10px', borderRadius:'4px', marginBottom:'15px'}}>
             <span style={{fontSize:'12px', color:'#389e0d'}}>Kontribusi: {percent.toFixed(1)}% dari Total Aset</span>
          </div>

          <p style={{ marginBottom: '5px', fontSize: '14px', color: '#555' }}>Jatah Saldo Tunai saat ini:</p>
          <h2 style={{ color: '#1890ff', fontWeight: 'bold', fontSize: '24px', margin: '5px 0' }}>
            {formatRupiahSimple(cashShare)}
          </h2>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '15px' }}>*Dihitung dari sisa saldo tunai (Rp Total Saldo Aktif {formatRupiahSimple(grandTotal)}) dikali persentase kontribusi.</p>
        </div>
      ),
      okText: "Tutup",
      centered: true,
      maskClosable: true,
      width: 320, 
    });
  };

  const topCardStyle = {
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0',
    background: '#fff',
    height: '120px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '10px'
  };

  return (
    <div>
      <HeadNavbar 
         title="Zipal Dashboard"
         icon={<DashboardOutlined/>}
         description="Statistik Keuangan Real-Time Naufal & Zihra"
       />

      <Row justify="center" align="middle" gutter={[24, 24]} style={{ maxWidth: '1200px', margin: '0 auto 40px auto' }}>
        <Col xs={24} md={8}>
           <Card style={topCardStyle}>
              <SaldoTotalIn total={dataSaldo.total_deposit_overall} />
           </Card>
        </Col>

         <Col xs={24} md={8}>
            <Card style={topCardStyle}>
              <SaldoAllWithDraw total={totalWithdrawCalculated} />
            </Card>
         </Col>

        <Col xs={24} md={8}>
            <Card style={topCardStyle}>
              <SaldoAvailable total={dataSaldo.grand_total} /> 
            </Card>
        </Col>
      </Row>
      
      <h3 style={{ borderLeft: '4px solid #1890ff', paddingLeft: '10px', marginTop: '20px' }}>
        Deposit ➕ | Withdraw ➖
      </h3>

      <Row gutter={[16, 16]} style={{ marginTop: "20px" }}>
        {/* === SECTION NAUFAL === */}
        <Col xs={24} lg={12}>
          <Card 
            title={
                <BalanceTitle 
                    name="Naufal Aufa" 
                    emoji="🧑‍🦱"
                    userTotalDeposit={dataSaldo.total_deposit_naufal} 
                    totalDepositOverall={dataSaldo.total_deposit_overall}
                    grandTotal={dataSaldo.grand_total}
                    screens={screens}
                    colorHighlight="#3f8600" 
                    onMobileClick={() => showBalanceModal('Naufal', dataSaldo.total_deposit_naufal, dataSaldo.total_deposit_overall, dataSaldo.grand_total)}
                />
            }  
            variant="borderless" 
            style={{ height: '100%' }}
          >
            <Row gutter={[0, 16]}>
              <Col span={24}>
                <Card title={`Total Deposit Naufal (All Time) 💴`} variant="borderless" type="inner">
                  <StatisticWithHide 
                    value={dataSaldo.total_deposit_naufal} 
                    color="#3f8600" 
                  />
                  <div style={{ marginTop: '15px' }}>
                      <DepositModal name="Deposit Naufal 💴" username="naufalaufa" onSuccess={fetchSaldo} />
                  </div>
                </Card>
              </Col>
              <Col span={24}>
                <Card title="Total Withdraw Naufal 💴" variant="borderless" type="inner">
                   {(dataSaldo.withdraw_naufal || 0) > 0 ? (
                      <StatisticWithHide value={dataSaldo.withdraw_naufal} color="#cf1322" />
                   ) : (
                      <div style={{ padding: '10px 0', color: '#8c8c8c', fontStyle: 'italic', fontSize: '14px' }}>
                        User belum pernah melakukan withdraw sekalipun
                      </div>
                   )}
                   <div style={{ marginTop: '15px' }}>
                      <WithdrawModal name="Withdraw Naufal 💴" username="naufalaufa" role={users.role} maxAmount={dataSaldo.total_naufal} onSuccess={fetchSaldo} />
                   </div>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
           <Card title="Statistik Deposit Recap 📊" variant="borderless" style={{ height: '100%' }}>
              <div style={{ height: "250px", width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
                 <ChartDeposit />
              </div>
           </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: "16px" }}>
        <Col xs={24} lg={12}>
          <Card 
            title={
                <BalanceTitle 
                    name="Zihra Angelina" 
                    emoji="👧"
                    userTotalDeposit={dataSaldo.total_deposit_zihra} 
                    totalDepositOverall={dataSaldo.total_deposit_overall}
                    grandTotal={dataSaldo.grand_total}
                    screens={screens}
                    colorHighlight="#d48806" 
                    onMobileClick={() => showBalanceModal('Zihra', dataSaldo.total_deposit_zihra, dataSaldo.total_deposit_overall, dataSaldo.grand_total)}
                />
            }
              variant="borderless" 
              style={{ height: '100%' }}
          >
            <Row gutter={[0, 16]}>
              <Col span={24}>
                <Card title="Total Deposit Zihra (All Time) 💴" variant="borderless" type="inner">
                    <StatisticWithHide 
                        value={dataSaldo.total_deposit_zihra} 
                        color="#d48806" 
                    />
                    <div style={{ marginTop: '15px' }}>
                      <DepositModal name="Deposit Zihra 💴" username="zihraangelina" onSuccess={fetchSaldo} />
                    </div>
                </Card>
              </Col>
              <Col span={24}>
                <Card title="Total Withdraw Zihra 💴" variant="borderless" type="inner">
                   {(dataSaldo.withdraw_zihra || 0) > 0 ? (
                      <StatisticWithHide value={dataSaldo.withdraw_zihra} color="#cf1322" />
                   ) : (
                      <div style={{ padding: '10px 0', color: '#8c8c8c', fontStyle: 'italic', fontSize: '14px' }}>
                        User belum pernah melakukan withdraw sekalipun
                      </div>
                   )}
                   <div style={{ marginTop: '15px' }}>
                      <WithdrawModal name="Withdraw Zihra 💴" username="zihraangelina" role={users.role} maxAmount={dataSaldo.total_zihra} onSuccess={fetchSaldo} />
                   </div>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
           <Card title="Statistik Withdraw Recap 📉" variant="borderless" style={{ height: '100%' }}>
              <div style={{ height: "250px", width: "100%", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: 'white' }}>
                 <ChartWithdraw />
              </div>
           </Card>
        </Col>
      </Row>

      <Divider orientation="left" style={{ borderColor: 'gray', borderWidth: '2px', margin: '60px 0 40px 0' }}>
         <span style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RiseOutlined /> Investment & Portfolio Zone
         </span>
      </Divider>
      
      <SaldoInvestmentWithdraw total={dataSaldo.total_investment} />

      <h3 style={{ marginTop: '20px', marginBottom: '20px', borderLeft: '4px solid #7cb305', paddingLeft: '10px' }}>
        Withdraw For Investment 🚀
      </h3>
      
      <Row gutter={[16, 16]} style={{ marginBottom: "40px" }}>
        <Col xs={24} lg={12}>
          <Card 
            title={<span><LineChartOutlined /> Investment Actions (General)</span>} 
            variant="borderless"
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}
          >
             <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {users.role === 'admin' ? 
                  <p style={{marginBottom: '25px', color: '#666', textAlign: 'center', fontSize: '15px'}}>
                    Tarik dana untuk investasi.
                  </p> :
                  <p style={{marginBottom: '25px', textAlign : 'center', color: '#ff4d4f', fontWeight: '600'}}>
                    🚫 Hanya Admin Yang Dapat Mengakses Dan Memasukan Uang Investasi.
                  </p>
                }
                <WithdrawModal name="Withdraw to Invest 🚀" role={users.role} username="zipaladmin" isInvestment={true} onSuccess={fetchSaldo} />
             </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={<span><FundViewOutlined /> Investment Allocation Chart</span>} variant="borderless" style={{ height: '100%' }}>
            <div style={{ height: "220px", width: "100%", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: 'white' }}>
                <ChartInvestment /> 
             </div>
          </Card>
        </Col>
      </Row>

    </div>
  );
};

export default Dashboard;