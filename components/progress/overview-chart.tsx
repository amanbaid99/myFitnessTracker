import { MASK } from "@/lib/mask";

export interface OverviewPoint {
  at: string;
  value: number | null;
  label: string;
  current?: boolean;
}

/** Read-only previews: the containing link opens the interactive detail view. */
export function OverviewChart({
  points,
  kind = "line",
  label,
  unit,
}: {
  points: OverviewPoint[];
  kind?: "line" | "bars";
  label: string;
  unit: string;
}) {
  const values = points.flatMap((point) =>
    point.value === null ? [] : [point.value],
  );
  if (!values.length) return null;
  const lo = kind === "bars" ? 0 : Math.floor(Math.min(...values) - 1);
  const hi = Math.max(lo + 1, ...values) + (kind === "bars" ? 0 : 1);
  const y = (value: number) => 86 - ((value - lo) / (hi - lo)) * 72;
  const first = Date.parse(points[0].at),
    last = Date.parse(points.at(-1)!.at);
  const x = (point: OverviewPoint, index: number) =>
    kind === "bars"
      ? 48 + ((index + 0.5) / points.length) * 258
      : last === first
        ? 177
        : 48 + ((Date.parse(point.at) - first) / (last - first)) * 258;
  const fmt = (value: number) =>
    new Intl.NumberFormat("en-GB", {
      maximumFractionDigits: 1,
      notation: value >= 10000 ? "compact" : "standard",
    }).format(value);
  const summary = points
    .map(
      (point) =>
        `${point.label}: ${point.value === null ? "unavailable" : `${fmt(point.value)} ${unit}`}${point.current ? ", in progress" : ""}`,
    )
    .join("; ");
  return (
    <svg
      viewBox="0 0 320 112"
      className={`mt-3 w-full ${MASK}`}
      role="img"
      aria-label={`${label}. ${summary}`}
    >
      {[lo, hi].map((value) => (
        <g key={value}>
          <line
            x1="45"
            x2="310"
            y1={y(value)}
            y2={y(value)}
            stroke="var(--border)"
            strokeDasharray="3 4"
          />
          <text
            x="37"
            y={y(value) + 3}
            textAnchor="end"
            fill="var(--muted-foreground)"
            fontSize="10"
          >
            {fmt(value)}
          </text>
        </g>
      ))}
      {kind === "bars"
        ? points.map((point, index) =>
            point.value === null ? (
              <text
                key={point.at}
                x={x(point, index)}
                y="82"
                textAnchor="middle"
                fontSize="12"
                fill="var(--muted-foreground)"
              >
                ·
              </text>
            ) : (
              <rect
                key={point.at}
                x={x(point, index) - Math.min(8, 90 / points.length)}
                y={y(point.value)}
                width={Math.min(16, 180 / points.length)}
                height={Math.max(
                  point.value === 0 ? 1 : 2,
                  86 - y(point.value),
                )}
                rx="3"
                fill="var(--primary)"
                fillOpacity={point.current ? 0.45 : 1}
              />
            ),
          )
        : points.map((point, index) => {
            if (point.value === null) return null;
            const previous = points[index - 1];
            return (
              <g key={`${point.at}-${index}`}>
                {previous?.value != null && (
                  <line
                    x1={x(previous, index - 1)}
                    y1={y(previous.value)}
                    x2={x(point, index)}
                    y2={y(point.value)}
                    stroke="var(--primary)"
                    strokeWidth="2"
                  />
                )}
                <circle
                  cx={x(point, index)}
                  cy={y(point.value)}
                  r="3"
                  fill="var(--primary)"
                  stroke="var(--card)"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}
      <text x="48" y="106" fill="var(--muted-foreground)" fontSize="10">
        {points[0].label}
      </text>
      <text
        x="306"
        y="106"
        textAnchor="end"
        fill="var(--muted-foreground)"
        fontSize="10"
      >
        {points.length > 1 ? points.at(-1)!.label : ""}
      </text>
    </svg>
  );
}
