const PERSON_META = {
  male: { label: 'Ikon pendamping Naufal', background: '#1e3a5f', shirt: '#75a7f7', hair: '#49352d' },
  female: { label: 'Ikon pendamping Zihra', background: '#5a315f', shirt: '#f09bc9', hair: '#6b422d' },
};

export default function PersonCompanion({ name = '' }) {
  const variant = name.toLowerCase().includes('zihra') ? 'female' : 'male';
  const meta = PERSON_META[variant];

  return (
    <span className={`person-companion person-companion--${variant}`} role="img" aria-label={meta.label} title={meta.label}>
      <svg viewBox="0 0 72 72" aria-hidden="true" focusable="false">
        <circle className="person-companion__halo" cx="36" cy="36" r="32" fill={meta.background} />
        <circle className="person-companion__ring" cx="36" cy="36" r="33.5" />
        <g className="person-companion__sparkles">
          <path d="M59 13v8M55 17h8" />
          <path d="M13 21v5M10.5 23.5h5" />
        </g>
        <g className="person-companion__body">
          {variant === 'female' && <path d="M17 43V29C17 7 55 7 55 29v22H17Z" fill={meta.hair} />}
          <path d="M17 68c1-22 37-22 38 0" fill={meta.shirt} />
          <path d="M31 45h10v11c-3.5 4-6.5 4-10 0Z" fill="#efbd9e" />
          <ellipse cx="36" cy="32" rx="17" ry="20" fill="#ffe0c7" />
          <path
            d={variant === 'female'
              ? 'M19 31C14 9 46 5 53 24v9c-7-3-12-8-16-14-4 6-9 10-18 12Z'
              : 'M19 29C13 13 28 8 39 10c12-1 17 11 12 21l-5-10c-8 6-14-3-22 3l-3 8Z'}
            fill={meta.hair}
          />
          <g className="person-companion__eyes" fill="#3e3431">
            <ellipse cx="29.5" cy="33" rx="2" ry="2.8" />
            <ellipse cx="42.5" cy="33" rx="2" ry="2.8" />
          </g>
          <path d="M31 41q5 5 10-1" stroke="#b66f62" strokeWidth="2" strokeLinecap="round" />
          <circle cx="25" cy="39" r="3" fill="#f3a99d" opacity=".55" />
          <circle cx="47" cy="39" r="3" fill="#f3a99d" opacity=".55" />
          {variant === 'female' && <path d="m48 16 7-4 2 8-8 1Z" fill="#ffc2e4" />}
        </g>
        <g className="person-companion__hand">
          <path d="M54 60V47c0-3 4-3 4 0v3-10c0-3 4-3 4 0v10c5-6 8-2 4 3l-3 8c-2 6-9 5-9-1Z" fill="#ffe0c7" stroke="#d59e80" strokeWidth="1" />
        </g>
      </svg>
    </span>
  );
}
