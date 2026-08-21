export default function NudgeLogo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`nudge-logo ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="nl-grad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="50%" stopColor="#0D9488" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="nl-glow" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="16" fill="#0D111C" />
      <rect x="1" y="1" width="62" height="62" rx="15" stroke="url(#nl-grad)" strokeWidth="1.5" strokeOpacity="0.4" />
      <rect width="64" height="64" rx="16" fill="url(#nl-glow)" />

      {/* Left Pillar */}
      <path
        d="M17 46V18C17 16.3431 18.3431 15 20 15H21C22.6569 15 24 16.3431 24 18V46C24 47.6569 22.6569 49 21 49H20C18.3431 49 17 47.6569 17 46Z"
        fill="url(#nl-grad)"
      />

      {/* Dynamic Diagonal Streak */}
      <path
        d="M22 17L42 47C42.8 48.2 44.5 48.4 45.6 47.4C46.2 46.8 46.5 46 46.5 45.1V18C46.5 16.3431 45.1569 15 43.5 15C41.8431 15 40.5 16.3431 40.5 18V36.5L25.2 15.6C24.1 14.2 22.1 13.9 20.7 15C20.2 15.4 19.8 16 19.6 16.7L22 17Z"
        fill="url(#nl-grad)"
      />

      {/* Neural Core Nodes */}
      <circle cx="43.5" cy="18" r="3" fill="#5EEAD4" />
      <circle cx="20.5" cy="46" r="3" fill="#818CF8" />
    </svg>
  );
}
