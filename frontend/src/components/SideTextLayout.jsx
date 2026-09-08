const SideTextLayout = () => {
  return (
    <div className="sidetext-layout-container">
      <div className="side-orb side-orb-1"></div>
      <div className="side-orb side-orb-2"></div>
      <div className="side-orb side-orb-3"></div>

      <div className="side-content">
        <div className="side-logo">👧🧑‍🦱</div>
        <h1 className="side-title">ZIPAL</h1>
        <p className="side-subtitle">Zihra Naufal Private Data Recap</p>
        <p className="side-desc">
          Kelola keuangan pribadi dengan mudah, aman, dan terorganisir dalam satu platform.
        </p>

        <div className="side-features">
          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <span>Pantau investasi real-time</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">💰</span>
            <span>Rekap tabungan otomatis</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔒</span>
            <span>Data aman &amp; terenkripsi</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SideTextLayout;
