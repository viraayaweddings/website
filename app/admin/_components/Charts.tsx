/**
 * Charts, drawn as inline SVG on the server.
 *
 * No charting library: the panel runs on a worker with a strict CSP and no
 * external script host, and these three shapes are the only ones the dashboard
 * needs. Server-rendered means they are in the first paint rather than after a
 * hydration round trip.
 *
 * Every colour is a token, so both themes work without a second code path.
 */

export interface Point {
  label: string;
  value: number;
}

/** Bars with a baseline. Used for submissions per day. */
export function BarChart({
  points,
  height = 132,
  title,
}: {
  points: Point[];
  height?: number;
  title: string;
}) {
  const max = Math.max(1, ...points.map((point) => point.value));
  const gap = 3;
  const width = 100;
  const barWidth = points.length > 0 ? (width - gap * (points.length - 1)) / points.length : width;

  return (
    <figure className="m-0">
      <figcaption className="sr-only">{title}</figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`${title}. Highest value ${max}.`}
      >
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1="0"
            x2={width}
            y1={height * fraction}
            y2={height * fraction}
            stroke="var(--line)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {points.map((point, index) => {
          // A day with submissions must never render as nothing at all.
          const barHeight = point.value === 0 ? 2 : Math.max(3, (point.value / max) * (height - 10));
          return (
            <rect
              key={point.label}
              x={index * (barWidth + gap)}
              y={height - barHeight}
              width={barWidth}
              height={barHeight}
              rx="1.5"
              fill={point.value === 0 ? "var(--line)" : "var(--accent)"}
              opacity={point.value === 0 ? 1 : 0.35 + 0.65 * (point.value / max)}
            >
              <title>{`${point.label}: ${point.value}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-1.5 flex justify-between text-[0.6875rem]" style={{ color: "var(--ink-faint)" }}>
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </figure>
  );
}

/** A single horizontal bar per row, for a breakdown by category. */
export function BreakdownBars({
  points,
  tones,
}: {
  points: Point[];
  /** CSS colour per label; falls back to the accent. */
  tones?: Record<string, string>;
}) {
  const total = points.reduce((sum, point) => sum + point.value, 0);

  if (total === 0) {
    return (
      <p className="py-6 text-center text-sm" style={{ color: "var(--ink-faint)" }}>
        Nothing to show yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {points.map((point) => {
        const share = Math.round((point.value / total) * 100);
        return (
          <li key={point.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate font-medium capitalize" style={{ color: "var(--ink)" }}>
                {point.label}
              </span>
              <span className="flex-none tabular-nums" style={{ color: "var(--ink-faint)" }}>
                {point.value.toLocaleString("en-IN")} · {share}%
              </span>
            </div>
            <div className="vw-meter">
              <span
                style={{
                  width: `${Math.max(share, point.value > 0 ? 2 : 0)}%`,
                  background: tones?.[point.label] ?? "var(--accent)",
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A ring showing one share of a whole. Reads faster than a number alone for
 * "how much of the library is unused" style figures.
 */
export function Donut({
  value,
  total,
  label,
  tone = "var(--accent)",
  size = 96,
}: {
  value: number;
  total: number;
  label: string;
  tone?: string;
  size?: number;
}) {
  const share = total > 0 ? value / total : 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${label}: ${value} of ${total}`}>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--surface-hover)" strokeWidth="11" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${circumference * share} ${circumference}`}
          transform="rotate(-90 50 50)"
        />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="22"
          fontWeight="600"
          fill="var(--ink)"
        >
          {total > 0 ? `${Math.round(share * 100)}%` : "—"}
        </text>
      </svg>
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          {value.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}
        </p>
        <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
          {label}
        </p>
      </div>
    </div>
  );
}

/** A compact trend line for a stat tile. */
export function Sparkline({ points, tone = "var(--accent)" }: { points: number[]; tone?: string }) {
  if (points.length < 2) return null;

  const max = Math.max(1, ...points);
  const width = 100;
  const height = 26;
  const step = width / (points.length - 1);

  const path = points
    .map((value, index) => `${index === 0 ? "M" : "L"}${(index * step).toFixed(2)},${(height - (value / max) * (height - 3)).toFixed(2)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-6 w-full" aria-hidden="true">
      <path d={`${path} L${width},${height} L0,${height} Z`} fill={tone} opacity="0.1" />
      <path d={path} fill="none" stroke={tone} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
