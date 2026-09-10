export default function PersonCompanion({ name }) {
  const female = name.toLowerCase().includes('zihra');
  return <span className={`person-companion ${female ? 'person-companion--female' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 64 64" width="34" height="34" fill="none">
      <circle cx="32" cy="32" r="30" fill={female ? '#49304f' : '#253f62'} />
      <g className="person-companion__head">
        {female && <path d="M13 37V24C13 2 51 2 51 24V46H13Z" fill="#73482f" />}
        <path d="M15 59c1-20 33-20 34 0" fill={female ? '#e9a6cc' : '#92b9f3'} />
        <path d="M27 40h10v10c-4 4-7 4-10 0" fill="#efbd9e" />
        <ellipse cx="32" cy="28" rx="16" ry="19" fill="#ffe0c7" />
        <path d={female ? 'M16 28C10 6 39 1 48 19L48 30C42 26 37 21 33 16C29 23 24 26 16 28Z' : 'M16 25C9 10 23 5 35 7C48 6 51 18 47 27L42 18C34 24 28 14 21 20L18 29Z'} fill={female ? '#73482f' : '#71503a'} />
        <g className="person-companion__eyes" fill="#493c38"><ellipse cx="26" cy="29" rx="2" ry="2.8" /><ellipse cx="39" cy="29" rx="2" ry="2.8" /></g>
        <path d="M28 37q5 5 10-1" stroke="#b66f62" strokeWidth="2" strokeLinecap="round" />
        <circle cx="22" cy="35" r="3" fill="#f3b5a6" opacity=".6" /><circle cx="43" cy="35" r="3" fill="#f3b5a6" opacity=".6" />
        {female && <path d="m43 13 6-4 2 7-7 1Z" fill="#f5b9df" />}
      </g>
      <g className="person-companion__hand"><path d="M49 51V40c0-3 4-3 4 0v3-8c0-3 4-3 4 0v9c5-6 7-2 4 2l-3 7c-2 5-9 4-9-2Z" fill="#ffe0c7" stroke="#dca98a" strokeWidth=".8" /></g>
    </svg>
  </span>;
}
