export default function NudgeLogo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`nudge-logo ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, borderRadius: '25%' }}
    >
      {/* Background teal rounded squircle */}
      <rect width="64" height="64" rx="16" fill="#00A896" />

      {/* Top Antenna */}
      <path d="M26 15h9a2 2 0 0 1 2 2v4h-5v-3h-6a1.5 1.5 0 0 1-1.5-1.5v-.5a1.5 1.5 0 0 1 1.5-1.5z" fill="#FFFFFF" />

      {/* Head Frame with side ear tabs */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M22 21C17.5817 21 14 24.5817 14 29V32H11C9.34315 32 8 33.3431 8 35V37C8 38.6569 9.34315 40 11 40H14V43C14 47.4183 17.5817 51 22 51H42C46.4183 51 50 47.4183 50 43V40H53C54.6569 40 56 38.6569 56 37V35C56 33.3431 54.6569 32 53 32H50V29C50 24.5817 46.4183 21 42 21H22ZM20 27C18.8954 27 18 27.8954 18 29V43C18 44.1046 18.8954 45 20 45H44C45.1046 45 46 44.1046 46 43V29C46 27.8954 45.1046 27 44 27H20Z"
        fill="#FFFFFF"
      />

      {/* Vertical capsule eyes */}
      <rect x="25" y="32" width="4.5" height="8" rx="2.25" fill="#FFFFFF" />
      <rect x="34.5" y="32" width="4.5" height="8" rx="2.25" fill="#FFFFFF" />
    </svg>
  );
}
