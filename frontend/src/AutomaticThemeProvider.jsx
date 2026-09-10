import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ConfigProvider, theme } from 'antd';
import { Chart } from 'chart.js';
import { ThemeContext } from './themeContext';
import { getScheduledTheme, getNextThemeChange } from './themeSchedule';

export default function AutomaticThemeProvider({ children }) {
  const [mode, setMode] = useState(getScheduledTheme);
  const previousMode = useRef(mode);

  useEffect(() => {
    let timeout;
    const sync = () => {
      clearTimeout(timeout);
      const now = new Date();
      setMode(getScheduledTheme(now));
      // Detect device clock/timezone changes as well as the exact boundary.
      timeout = setTimeout(sync, Math.min(getNextThemeChange(now) - now, 60_000));
    };
    sync();
    window.addEventListener('focus', sync);
    window.addEventListener('pageshow', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('focus', sync);
      window.removeEventListener('pageshow', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'dark' ? '#101522' : '#f6f7fc');
    Chart.defaults.color = mode === 'dark' ? '#b8c2d8' : '#667085';
    Chart.defaults.borderColor = mode === 'dark' ? '#2b354a' : '#e6e9f2';
    if (previousMode.current !== mode) Object.values(Chart.instances).forEach(chart => chart.update('none'));
    previousMode.current = mode;
  }, [mode]);

  return (
    <ThemeContext.Provider value={mode}>
      <ConfigProvider theme={{
        algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: mode === 'dark' ? '#a294ff' : '#6355d8',
          borderRadius: 10,
          fontFamily: "'Inter', sans-serif",
          ...(mode === 'dark' ? {
            colorBgBase: '#101522', colorBgContainer: '#181f30',
            colorBgElevated: '#20293c', colorText: '#edf0fa', colorTextSecondary: '#b0bad0',
          } : { colorBgLayout: '#f6f7fc' }),
        },
      }}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
