import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MUSCLE_GROUPS } from "@/lib/muscles";
import { BODY_REGIONS, WorkoutBodyDiagram } from "./workout-body-diagram";

describe("workout schematic", () => {
  it("covers every supported muscle without external assets", () => {
    expect(new Set(BODY_REGIONS.map((r) => r.muscle))).toEqual(new Set(MUSCLE_GROUPS));
    const html = renderToStaticMarkup(createElement(WorkoutBodyDiagram, { workload: {} }));
    expect(html).not.toMatch(/<iframe|<image|https?:/);
    expect(html).toContain('aria-label="Front schematic');
    expect(html).toContain('aria-label="Back schematic');
  });
  it("uses the atlas workload scale, caps heavy work and ignores invalid values", () => {
    const html = renderToStaticMarkup(createElement(WorkoutBodyDiagram, { workload: { chest: 2, glutes: 9.6, quads: 30, calves: -1, biceps: NaN } }));
    expect(html).toContain('data-muscle="chest" data-heat="0.2"');
    expect(html).toContain('data-muscle="glutes" data-heat="0.96"');
    expect(html).toContain('data-muscle="quads" data-heat="1"');
    expect(html).toContain('data-muscle="calves" data-heat="0"');
    expect(html).toContain('data-muscle="biceps" data-heat="0"');
  });
});
