import { useEffect, useRef, useState } from 'react';
import { Skeleton } from 'antd';

// Mount the canvas only once it can be seen, so entrance animation isn't spent off-screen.
export default function AnalyticsChart({ loading, children }) {
  const container = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: .15 });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const ready = !loading && (visible || typeof IntersectionObserver === 'undefined');
  return <div className="chart-box" ref={container} aria-busy={loading}>
    {ready ? <div className="chart-reveal">{children}</div> : <Skeleton active paragraph={{ rows:5 }} title={false} />}
  </div>;
}
