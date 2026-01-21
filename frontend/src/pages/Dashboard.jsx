import { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom"; 
import { Card, Col, Row, Divider, Modal, Grid, Tooltip, Typography, Avatar } from "antd"; 
import { DepositModal, WithdrawModal, ChartDeposit, ChartWithdraw, ChartInvestment, HeadNavbar, SaldoAvailable, SaldoInvestmentWithdraw, SaldoTotalIn, SaldoAllWithDraw, StatisticWithHide, CancelOrEditDepositModal} from "../components";
import { LineChartOutlined, FundViewOutlined, DashboardOutlined, RiseOutlined, LockOutlined, UserOutlined, InfoCircleOutlined, EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";
import api from "../api";

const { useBreakpoint } = Grid; 
const { Text, Title } = Typography;

const formatRupiahSimple = (number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0
  }).format(number || 0);
};

const BalanceTitle = ({ name, avatarUrl, userTotalDeposit, totalDepositOverall, grandTotal, screens, colorHighlight }) => {
  const [isVisible, setIsVisible] = useState(false); 
  const [isPreviewOpen, setIsPreviewOpen] = useState(false); 

  const contributionPercent = totalDepositOverall > 0 ? (userTotalDeposit / totalDepositOverall) * 100 : 0;
  const cashShare = (contributionPercent / 100) * grandTotal;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <div style={{display:'flex', alignItems: 'center', gap: '12px'}}>
         <div onClick={() => setIsPreviewOpen(true)} style={{ cursor: 'pointer' }}>
            <Avatar 
                src={avatarUrl} 
                icon={<UserOutlined />} 
                size={screens.md ? 50 : 40} 
                style={{ border: `2px solid ${colorHighlight}`, backgroundColor: '#e6f7ff', color: colorHighlight }}
            />
         </div>
         <div style={{display:'flex', flexDirection:'column'}}>
            <span style={{ fontWeight: '600', fontSize:'16px' }}>{name}</span>
            {screens.md && <span style={{ fontSize: '11px', color: '#8c8c8c' }}>Kontribusi: <b>{contributionPercent.toFixed(1)}%</b></span>}
         </div>
      </div>

      {screens.md && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background:'#f5f5f5', padding:'4px 12px', borderRadius:'8px', border: '1px solid #e8e8e8' }}>
          <Tooltip title="Porsi tunai berdasarkan persentase deposit."><InfoCircleOutlined style={{color: colorHighlight}}/></Tooltip>
          <span>Porsi Tunai: </span>
          <span style={{ fontWeight: 'bold', color: isVisible ? colorHighlight : '#bfbfbf' }}>{isVisible ? formatRupiahSimple(cashShare) : 'Rp **********'}</span>
          <div onClick={() => setIsVisible(!isVisible)} style={{ cursor: 'pointer', color: '#1890ff', display: 'flex' }}>
            {isVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          </div>
        </div>
      )}

        <Modal 
          open={isPreviewOpen} 
          footer={null} 
          onCancel={() => setIsPreviewOpen(false)} 
          centered 
          width={350}
          styles={{ body: { padding: 0, overflow: 'hidden', borderRadius: '10px' } }}
        >
        <Avatar 
          shape="square"
          src={avatarUrl} 
          size={350}
          style={{ 
            width: '100%', 
            height: 'auto', 
            aspectRatio: '1/1',
            display: 'block'
          }} 
          imgProps={{ 
            style: { objectFit: 'cover' } 
          }}
        />
        <div style={{ padding: '15px', textAlign: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>{name}</Title>
            <Text type="secondary">Zipal Users</Text>
        </div>
      </Modal>
    </div>
  );
};

const Dashboard = () => {
  const users = JSON.parse(localStorage.getItem('user')) || { role: 'guest' };
  const screens = useBreakpoint(); 
  const context = useOutletContext();
  const refreshHeader = context ? context.refreshHeader : () => {};   
  
  const [dataSaldo, setDataSaldo] = useState({
    total_naufal: 0, total_zihra: 0, total_deposit_naufal: 0, total_deposit_zihra: 0, 
    withdraw_naufal: 0, withdraw_zihra: 0, grand_total: 0, total_investment: 0, total_deposit_overall: 0 
  });

  const [userAvatars, setUserAvatars] = useState({ naufalaufa: null, zihraangelina: null });

  const fetchSaldo = async () => {
    try {
      const res = await api.get('/summary');
      if (res.data.status === 'success') setDataSaldo(res.data.data);
    } 
    catch (error) { console.error("Gagal load summary", error); }
  };

  const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    return avatar.startsWith('http') ? avatar : `${import.meta.env.VITE_API_URL}/public/uploads/${avatar}`;
  };

  const fetchUserAvatars = useCallback(async () => {
    try {
      const resNaufal = await api.post('/auth/check-username', { username: 'naufalaufa' });
      const resZihra = await api.post('/auth/check-username', { username: 'zihraangelina' });

      setUserAvatars({
        naufalaufa: getAvatarUrl(resNaufal.data.user?.avatar),
        zihraangelina: getAvatarUrl(resZihra.data.user?.avatar)
      });
    } catch (error) { 
      console.error("Gagal load avatar real-time", error); 
    }
  }, []);

  const handleTransactionSuccess = () => { fetchSaldo(); refreshHeader(); };

  useEffect(() => { fetchSaldo(); fetchUserAvatars(); }, [fetchUserAvatars]);

  const totalWithdrawCalculated = (dataSaldo.total_deposit_overall || 0) - (dataSaldo.grand_total || 0);
  const elegantCardStyle = { borderRadius: '8px', border: '1px solid #e8e8e8', height: '100%', display: 'flex', flexDirection: 'column' };

  return (
    <div style={{ paddingBottom: '40px' }}>
      <HeadNavbar title="Zipal Dashboard" icon={<DashboardOutlined/>} description="Statistik Keuangan Real-Time Naufal & Zihra" />

      <div style={{ marginBottom: '40px' }}>
        <Row justify="center" gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <Card style={{ ...elegantCardStyle, height: '130px', justifyContent: 'center', alignItems: 'center' }}>
                <SaldoTotalIn total={dataSaldo.total_deposit_overall} />
              </Card>
            </Col>
            <Col xs={24} md={8}>
                <Card style={{ ...elegantCardStyle, height: '130px', justifyContent: 'center', alignItems: 'center' }}>
                  <SaldoAllWithDraw total={totalWithdrawCalculated} />
                </Card>
            </Col>
              <Col xs={24} md={8}>
                <Card style={{ ...elegantCardStyle, height: '130px', justifyContent: 'center', alignItems: 'center' }}>
                  <SaldoAvailable total={dataSaldo.grand_total} />
              </Card>
            </Col>
        </Row>
      </div>
      <Divider style={{ margin: '0 0 40px 0' }} />
      <div style={{ marginBottom: '40px' }}>
        <Row gutter={[24, 24]}>
          {['naufalaufa', 'zihraangelina'].map((user) => {
            const hasWithdraw = user === 'naufalaufa' ? (dataSaldo.withdraw_naufal > 0) : (dataSaldo.withdraw_zihra > 0);
            return (
              <Col xs={24} lg={12} key={user}>
                <Card 
                  style={elegantCardStyle}
                  title={<BalanceTitle 
                          name={user === 'naufalaufa' ? "Naufal Aufa" : "Zihra Angelina"} 
                          avatarUrl={userAvatars[user]} 
                          userTotalDeposit={user === 'naufalaufa' ? dataSaldo.total_deposit_naufal : dataSaldo.total_deposit_zihra} 
                          totalDepositOverall={dataSaldo.total_deposit_overall} grandTotal={dataSaldo.grand_total} screens={screens} 
                          colorHighlight={user === 'naufalaufa' ? "#3f8600" : "#d48806"} />}
                >
                  <Row gutter={[0, 16]}>
                    <Col span={24}>
                      <Card title={`Total Deposit ${user === 'naufalaufa' ? 'Naufal' : 'Zihra'} 💴`} variant="borderless" type="inner">
                        <StatisticWithHide value={user === 'naufalaufa' ? dataSaldo.total_deposit_naufal : dataSaldo.total_deposit_zihra} color={user === 'naufalaufa' ? "#3f8600" : "#d48806"} />
                        <div style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                            <DepositModal 
                              name={`Deposit ${user === 'naufalaufa' ? 'Naufal' : 'Zihra'} 💴`}
                              username={user} 
                              onSuccess={handleTransactionSuccess} />
                            <CancelOrEditDepositModal 
                                username={user} 
                                type="deposit" 
                                onSuccess={handleTransactionSuccess} 
                                disabled={users.username !== user} 
                            />
                        </div>
                      </Card>
                    </Col>
                    <Col span={24}>
                      <Card title={`Total Withdraw ${user === 'naufalaufa' ? 'Naufal' : 'Zihra'} 💴`} variant="borderless" type="inner">
                         <StatisticWithHide value={user === 'naufalaufa' ? dataSaldo.withdraw_naufal : dataSaldo.withdraw_zihra} color="#cf1322" />
                         <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                              <WithdrawModal name={`Withdraw ${user === 'naufalaufa' ? 'Naufal' : 'Zihra'} 💴`} username={user} role={users.role} maxAmount={user === 'naufalaufa' ? dataSaldo.total_naufal : dataSaldo.total_zihra} onSuccess={handleTransactionSuccess} />
                              
                              <CancelOrEditDepositModal 
                                  username={user} 
                                  type="withdraw" 
                                  onSuccess={handleTransactionSuccess} 
                                  disabled={users.username !== user || !hasWithdraw} 
                              />
                            </div>
                            {!hasWithdraw && users.username === user && <Text type="secondary" style={{ fontSize: '11px', textAlign: 'center' }}>*Belum ada riwayat withdraw.</Text>}
                         </div>
                      </Card>
                    </Col>
                  </Row>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: '40px' }}>
        <Col xs={24} md={12}><Card title="Statistik Deposit Recap 📊" style={elegantCardStyle}><div style={{ height: "250px", display: "flex", justifyContent: "center", alignItems: "center" }}><ChartDeposit /></div></Card></Col>
        <Col xs={24} md={12}><Card title="Statistik Withdraw Recap 📉" style={elegantCardStyle}><div style={{ height: "250px", display: "flex", justifyContent: "center", alignItems: "center" }}><ChartWithdraw /></div></Card></Col>
      </Row>

      <Divider orientation="left" style={{ margin: '0 0 30px 0' }}><span style={{ fontSize: '18px', fontWeight: 'bold' }}><RiseOutlined /> Investment & Portfolio Zone</span></Divider>
      <div style={{ marginBottom: '30px' }}><SaldoInvestmentWithdraw total={dataSaldo.total_investment} /></div>

      <Row gutter={[24, 24]} align="stretch">
        <Col xs={24} lg={12}>
          <Card title={<span><LineChartOutlined /> Withdraw For Investment 🚀</span>} style={elegantCardStyle} styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '220px' } }}>
            <Typography.Text style={{marginBottom : '10px'}}>Dana Withdraw Untuk kebutuhan investasi 💴</Typography.Text>
            {users.role === 'admin' ? <WithdrawModal name="Withdraw to Invest 🚀" role={users.role} username="zipaladmin" isInvestment={true} onSuccess={handleTransactionSuccess} /> : <div style={{ textAlign: 'center' }}><LockOutlined style={{ fontSize: '24px', color: '#ff4d4f', marginBottom: '8px' }} /><br /><Text type="secondary">Hanya Admin yang dapat menarik dan mengakses investasi.</Text></div>}
          </Card>
        </Col>
        <Col xs={24} lg={12}><Card title={<span><FundViewOutlined /> Investment Allocation Chart</span>} style={elegantCardStyle}><div style={{ height: "220px", display: "flex", justifyContent: "center", alignItems: "center" }}><ChartInvestment /></div></Card></Col>
      </Row>
    </div>
  );
};

export default Dashboard;