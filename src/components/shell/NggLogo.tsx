export function NggLogo({ tagline, compact = false }: { tagline?: string; compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <path d="M15 3 L27 25 H3 Z" fill="none" stroke="#949494" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M6 21 C12 17 19 16 27 18" fill="none" stroke="#EC2A8C" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <div className="flex flex-col leading-[1.1]">
        <span className="text-[17px] font-black tracking-[0.04em]">NGG</span>
        {!compact && tagline ? <span className="text-[12px] font-medium text-text-muted">{tagline}</span> : null}
      </div>
    </div>
  );
}
