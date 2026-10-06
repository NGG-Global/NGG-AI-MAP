import type { Locale } from "@/domain/shared/enums";

export interface TrendPoint {
  code: string;
  label: string;
  score: number | null;
  planned?: boolean;
  suppressed?: boolean;
}

/**
 * Minimal SVG line chart. In RTL the time axis runs right → left (design §4), achieved by mirroring
 * the x positions, so no CSS transforms are needed and the text stays readable. A table alternative
 * is always rendered for accessibility.
 */
export function TrendChart({ points, min, max, locale, title }: { points: TrendPoint[]; min: number; max: number; locale: Locale; title: string }) {
  const width = 640;
  const height = 220;
  const padX = 48;
  const padY = 24;
  const rtl = locale === "he";
  const n = Math.max(points.length, 2);
  const x = (i: number) => {
    const t = points.length === 1 ? 0.5 : i / (n - 1);
    return padX + (rtl ? 1 - t : t) * (width - padX * 2);
  };
  const y = (v: number) => height - padY - ((v - min) / (max - min)) * (height - padY * 2);
  const real = points.map((p, i) => ({ ...p, i })).filter((p) => p.score != null && !p.planned);
  const path = real.map((p, idx) => `${idx === 0 ? "M" : "L"} ${x(p.i).toFixed(1)} ${y(p.score!).toFixed(1)}`).join(" ");
  const last = real[real.length - 1];
  const planned = points.map((p, i) => ({ ...p, i })).filter((p) => p.planned);
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} className="h-auto w-full">
        {[min, (min + max) / 2, max].map((v) => (
          <g key={v}>
            <line x1={padX} x2={width - padX} y1={y(v)} y2={y(v)} stroke="#E5E4E7" strokeWidth="1" />
            <text x={rtl ? width - padX + 6 : padX - 6} y={y(v) + 4} fontSize="11" fill="#5A5A5C" textAnchor={rtl ? "start" : "end"}>{v}</text>
          </g>
        ))}
        {path ? <path d={path} fill="none" stroke="#15151F" strokeWidth="2.5" strokeLinejoin="round" /> : null}
        {last && planned.length ? <line x1={x(last.i)} y1={y(last.score!)} x2={x(planned[0]!.i)} y2={y(last.score!)} stroke="#C7C6C7" strokeWidth="2" strokeDasharray="6 6" /> : null}
        {points.map((p, i) => (
          <g key={p.code}>
            {p.score != null && !p.planned ? <circle cx={x(i)} cy={y(p.score)} r={i === last?.i ? 7 : 5} fill={i === last?.i ? "#EC2A8C" : "#FFFFFF"} stroke={i === last?.i ? "#EC2A8C" : "#949494"} strokeWidth="2.5" /> : null}
            {p.planned ? <circle cx={x(i)} cy={last ? y(last.score!) : height / 2} r={5} fill="none" stroke="#C7C6C7" strokeWidth="2" strokeDasharray="3 3" /> : null}
            {p.score != null && !p.planned ? <text x={x(i)} y={y(p.score) - 12} fontSize="12" fontWeight="700" fill="#15151F" textAnchor="middle">{p.score.toFixed(1)}</text> : null}
            <text x={x(i)} y={height - 6} fontSize="11" fill="#5A5A5C" textAnchor="middle">{p.code} · {p.label}</text>
          </g>
        ))}
      </svg>
      <figcaption className="sr-only">
        <table>
          <tbody>
            {points.map((p) => (
              <tr key={p.code}><th scope="row">{p.code}</th><td>{p.score == null ? "—" : p.score.toFixed(2)}</td></tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
