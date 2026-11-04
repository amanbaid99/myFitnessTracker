import { MUSCLE_GROUPS } from "@/lib/muscles";
import { rankedWorkload } from "@/lib/anatomy";

type Muscle = (typeof MUSCLE_GROUPS)[number];
// Paired regions use the same path mirrored around the body's centre.
export const BODY_REGIONS: { muscle: Muscle; view: "Front" | "Back"; path: string }[] = [
  { muscle: "chest", view: "Front", path: "M59 48 L44 47 Q34 50 35 62 L57 66 Z" },
  { muscle: "front delts", view: "Front", path: "M40 47 Q29 48 27 60 L34 64 L36 54 Z" },
  { muscle: "side delts", view: "Front", path: "M28 54 L25 61 L23 72 L29 72 L33 64 Z" },
  { muscle: "biceps", view: "Front", path: "M28 74 L23 74 L18 96 L25 99 L31 78 Z" },
  { muscle: "core", view: "Front", path: "M58 69 L38 66 L42 102 L58 109 Z" },
  { muscle: "quads", view: "Front", path: "M43 119 L33 124 L34 160 L43 170 L50 156 L53 123 Z" },
  { muscle: "adductors", view: "Front", path: "M55 121 L51 146 L46 161 L52 167 L59 131 Z" },
  { muscle: "calves", view: "Front", path: "M36 177 L34 196 L39 218 L45 218 L48 193 L44 177 Z" },
  { muscle: "traps", view: "Back", path: "M57 39 L44 47 L38 51 L58 65 Z" },
  { muscle: "rear delts", view: "Back", path: "M37 49 Q28 50 26 63 L34 66 L40 56 Z" },
  { muscle: "upper back", view: "Back", path: "M57 68 L38 56 L36 70 L57 82 Z" },
  { muscle: "lats", view: "Back", path: "M36 73 L40 100 L55 109 L57 85 Z" },
  { muscle: "triceps", view: "Back", path: "M26 70 L22 78 L18 97 L25 100 L32 75 Z" },
  { muscle: "glutes", view: "Back", path: "M42 109 L34 120 Q33 137 46 139 L58 136 L58 114 Z" },
  { muscle: "abductors", view: "Back", path: "M37 108 L32 116 L31 134 L36 128 L40 115 Z" },
  { muscle: "hamstrings", view: "Back", path: "M35 142 L35 163 L42 173 L49 164 L55 141 Z" },
  { muscle: "calves", view: "Back", path: "M35 179 L33 194 L38 216 L46 214 L49 192 L44 178 Z" },
];

/** Shading is relative to this workout: the most worked muscle is darkest. */
export function heatColor(share: number): string {
  return `color-mix(in oklab, var(--destructive) ${Math.round(20 + share * 80)}%, var(--background))`;
}

export function WorkoutBodyDiagram({ workload, compact = false }: { workload: Record<string, number>; compact?: boolean }) {
  const shares = new Map(rankedWorkload(workload).map((m) => [m.muscle, m.share]));
  return <div className={`mt-3 grid grid-cols-2 gap-3 rounded-xl bg-muted/30 px-3 ${compact ? "py-2" : "py-3"}`}>
    {(["Front", "Back"] as const).map((view) => <figure key={view} className="text-center">
      <svg viewBox="0 0 120 246" role="img" aria-label={`${view} schematic muscle workload. Darker means more work.`} className={`mx-auto w-full ${compact ? "h-40 max-w-24" : "h-60 max-w-36"}`}>
        <g fill="var(--muted)" stroke="var(--border)" strokeWidth="1.2" strokeLinejoin="round">
          <ellipse cx="60" cy="21" rx="12" ry="16" />
          <path d="M53 36 L52 42 L35 46 Q25 48 23 63 L12 106 L16 119 L22 119 L24 107 L34 81 L38 101 L30 120 L32 166 L34 178 L32 202 L36 225 L33 238 L48 238 L49 226 L51 196 L49 177 L55 153 L60 132 L65 153 L71 177 L69 196 L71 226 L72 238 L87 238 L84 225 L88 202 L86 178 L88 166 L90 120 L82 101 L86 81 L96 107 L98 119 L104 119 L108 106 L97 63 Q95 48 85 46 L68 42 L67 36" />
        </g>
        {BODY_REGIONS.filter((region) => region.view === view).map(({ muscle, path }) => {
          const heat = shares.get(muscle) ?? 0;
          const fill = heat ? heatColor(heat) : "var(--muted-foreground)";
          return <g key={muscle} data-muscle={muscle} data-heat={heat} fill={fill} opacity={heat ? 1 : 0.12} stroke="var(--background)" strokeWidth="0.8"><title>{`${muscle}: ${heat ? `${Math.round(heat * 100)}% of the most worked muscle` : "not worked"}`}</title><path d={path} /><path d={path} transform="translate(120 0) scale(-1 1)" /></g>;
        })}
      </svg>
      <figcaption className="mt-1 text-xs text-muted-foreground">{view}</figcaption>
    </figure>)}
  </div>;
}
