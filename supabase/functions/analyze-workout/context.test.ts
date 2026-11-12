import { describe, expect, it, vi } from "vitest";
import { analysisWeek } from "../../../lib/analysis-week";
import { buildAnalysisContext, contextRows, loadAnalysisContext } from "./context";

const week = analysisWeek("2026-11-11T12:00:00Z");
const recent = analysisWeek("2026-10-19T12:00:00Z");
const session = { id: "w1", started_at: "2026-11-10T06:00:00Z", ended_at: "2026-11-10T07:00:00Z" };
const base = { week, recent, sessions: [session], volumes: null, strength: null, muscles: null, weights: null, targets: null };

describe("weekly and four-week evidence", () => {
  it("uses SQL values verbatim, separates imports/goals and preserves unknown targets", () => {
    const context = buildAnalysisContext({ ...base, volumes: [{ week_start: week.start, exercise_id: "e", exercise_name: "Bench", volume_kg: "3333", eligible_sets: 4, excluded_sets: 2 }], targets: [{ week_start: week.start, target: 5 }] });
    expect(context.text).toContain("3333 kg x reps");
    expect(context.text).toContain("saved goal 5");
    expect(context.text).toContain("saved goal unknown");
    expect(context.text).toContain("imports contribute to volume, not activity/goals");
    expect(context.text).toContain("partial current period is not a decline");
    expect(context.basis).toEqual({ sessions: 1, trainingDays: 1, comparableLifts: null, historyAvailable: true });
    expect(context.broaderStart).toBe("2026-10-19");
  });
  it("limits estimates to repeated like-for-like loaded lifts and redacts names", () => {
    const row = { exercise_id: "e", workout_id: "old", started_at: "2026-10-20T06:00:00Z", e1rm_kg: "90", exercises: { name: "Bench test@example.com", equipment: "barbell", tracking: "reps" } };
    const rows = [row, { ...row, workout_id: "w1", started_at: session.started_at, e1rm_kg: "94" }];
    const context = buildAnalysisContext({ ...base, strength: [...rows, ...rows.map(r => ({ ...r, exercise_id: "band", exercises: { ...r.exercises, equipment: "band" } })), { ...row, exercise_id: "one", exercises: { ...row.exercises, name: "Only once" } }] });
    expect(context.text).toContain("90kg estimated -> 2026-11-10 94kg estimated");
    expect(context.text).not.toContain("test@example.com");
    expect(context.text).not.toContain("Only once:");
    expect(context.basis.comparableLifts).toBe(1);
  });
  it("keeps muscle credits scoped to finished app sessions and readings dated", () => {
    const context = buildAnalysisContext({ ...base, muscles: [{ workout_id: "other", started_at: session.started_at, muscle: "quads", sets: 99 }, { workout_id: "w1", started_at: session.started_at, muscle: "chest", sets: 3 }], weights: [{ measured_on: "2026-10-20", weight_kg: 70 }, { measured_on: "2026-11-09", weight_kg: 71 }] });
    expect(context.text).toContain("chest 3 set credits");
    expect(context.text).not.toContain("quads 99");
    expect(context.text).toContain("2026-10-20 70kg -> 2026-11-09 71kg");
    expect(context.text).toContain("No body-weight goal");
  });
  it("reports failed history as unavailable, not zero", () => {
    const context = buildAnalysisContext({ ...base, sessions: null });
    expect(context.text).toContain("Weekly activity (app sessions, including small quick logs; goal-qualifying count is supplied separately when known): unavailable");
    expect(context.text).not.toContain("0 app sessions");
    expect(context.text).toContain("Strength history unavailable");
    expect(context.basis.historyAvailable).toBe(false);
  });
});

describe("owner-scoped bounded history reads", () => {
  it("paginates without treating errors or truncation as an empty history", async () => {
    const read = vi.fn().mockResolvedValueOnce(Array(500).fill({ id: "x" })).mockResolvedValueOnce([{ id: "last" }]);
    expect(await contextRows(read, "workouts?user_id=eq.owner")).toHaveLength(501);
    expect(read.mock.calls[1][0]).toContain("offset=500");
    expect(await contextRows(vi.fn().mockRejectedValue(new Error("offline")), "q?")).toBeNull();
    expect(await contextRows(vi.fn().mockResolvedValue(Array(500).fill({})), "q?")).toBeNull();
  });
  it("filters every service-role read by owner and one consistent India-time range", async () => {
    const read = vi.fn().mockResolvedValue([]);
    await loadAnalysisContext(read, "private-owner", week);
    expect(read).toHaveBeenCalledTimes(6);
    for (const [query] of read.mock.calls) expect(query).toContain("user_id=eq.private-owner");
    expect(read.mock.calls.find(([q]) => q.startsWith("exercise_session_best"))?.[0]).toContain("started_at=lt.2026-11-15T18%3A30%3A00.000Z");
    expect(read.mock.calls.find(([q]) => q.startsWith("weekly_targets"))?.[0]).toContain("week_start=lte.2026-11-09");
  });
});
