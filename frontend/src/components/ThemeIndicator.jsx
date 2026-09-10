import { useAutomaticTheme } from '../themeContext';

export default function ThemeIndicator() {
  const isDark = useAutomaticTheme() === 'dark';
  return (
    <div className="theme-indicator" role="status" aria-live="polite"
      aria-label={`Mode ${isDark ? 'gelap' : 'terang'} otomatis. ${isDark ? 'Terang mulai 05.00' : 'Gelap mulai 18.00'}, mengikuti waktu perangkat. Tema tidak dapat diubah manual.`}
      title="Tema otomatis mengikuti waktu perangkat · Terang 05.00–18.00 · Gelap 18.00–05.00">
      <span className="theme-indicator__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          {isDark ? <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" /> : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>}
        </svg>
      </span>
      <span className="theme-indicator__copy">
        <span className="theme-indicator__title">Mode {isDark ? 'gelap' : 'terang'} <span className="theme-indicator__badge">Otomatis</span></span>
        <span className="theme-indicator__schedule">{isDark ? 'Terang mulai 05.00' : 'Gelap mulai 18.00'} · waktu perangkat</span>
      </span>
    </div>
  );
}
