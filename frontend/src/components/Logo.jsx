// Icon badge — can be used standalone or inside Logo
export function LogoIcon({ size = 32, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      className={className}
      aria-label="MobilisCar"
    >
      <defs>
        <linearGradient id="mc-bg" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#0f2a5e" />
        </linearGradient>
      </defs>

      {/* Badge background */}
      <rect width="56" height="56" rx="13" fill="url(#mc-bg)" />

      {/* Car body (lower slab) */}
      <rect x="5" y="27" width="43" height="10" rx="2.5" fill="white" />

      {/* Cabin / roof */}
      <path d="M12 27 L17 16 L40 16 L44 27 Z" fill="white" />

      {/* Windshield */}
      <path d="M20 26.5 L24 18 L37 18 L41 26.5 Z" fill="#1d4ed8" opacity="0.3" />

      {/* Rear window */}
      <path d="M13 26.5 L17 18 L22 18 L19 26.5 Z" fill="#1d4ed8" opacity="0.3" />

      {/* Rear wheel */}
      <circle cx="14" cy="37" r="6.5" fill="#0c1e5c" />
      <circle cx="14" cy="37" r="3" fill="#93c5fd" />
      <circle cx="14" cy="37" r="1.2" fill="#0c1e5c" />

      {/* Front wheel */}
      <circle cx="40" cy="37" r="6.5" fill="#0c1e5c" />
      <circle cx="40" cy="37" r="3" fill="#93c5fd" />
      <circle cx="40" cy="37" r="1.2" fill="#0c1e5c" />

      {/* Headlight */}
      <rect x="47" y="29" width="5" height="2.5" rx="1.25" fill="#fde68a" />

      {/* Rear light */}
      <rect x="4" y="29" width="3" height="2.5" rx="1" fill="#fca5a5" opacity="0.85" />
    </svg>
  )
}

// Full horizontal logo: icon badge + wordmark
// dark=true → white text (for blue/dark backgrounds)
export default function Logo({ size = 'md', dark = false, className = '' }) {
  const cfg = {
    sm: { icon: 26, name: 'text-base leading-none', dot: 'text-[10px]', gap: 'gap-2' },
    md: { icon: 32, name: 'text-xl leading-none',   dot: 'text-xs',     gap: 'gap-2.5' },
    lg: { icon: 44, name: 'text-3xl leading-none',  dot: 'text-sm',     gap: 'gap-3' },
  }
  const { icon, name, dot, gap } = cfg[size] || cfg.md

  const textBase  = dark ? 'text-white'     : 'text-gray-900'
  const textAccent = dark ? 'text-blue-300' : 'text-blue-600'
  const textDot    = dark ? 'text-blue-300' : 'text-blue-400'

  return (
    <div className={`flex items-center ${gap} ${className}`}>
      <LogoIcon size={icon} />
      <div>
        <div className={`font-bold tracking-tight ${name}`}>
          <span className={textBase}>mobilis</span>
          <span className={textAccent}>car</span>
        </div>
        <div className={`${dot} ${textDot} leading-none mt-0.5`}>.com</div>
      </div>
    </div>
  )
}
