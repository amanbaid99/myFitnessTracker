import { describe, expect, it, vi } from "vitest";
import { analyzeWorkout, buildSummary, MODELS, parseReview, type WorkoutData } from "./analyze";

const ENV = { SUPABASE_URL: "https://db.example", SUPABASE_SERVICE_ROLE_KEY: "service-123", OPENROUTER_API_KEY: "or-key-123" };

const set = (exercise: string, weightKg: number | null, reps: number, rpe: number | null = null, setNo = 1) => ({
  exercise,
  equipment: "barbell",
  perHand: false,
  setNo,
  weightKg,
  addedKg: 0,
  reps,
  rpe,
});

const DATA: WorkoutData = {
  userId: "u1",
  dayName: "Push",
  startedAt: "2026-10-14T09:00:00Z",
  endedAt: "2026-10-14T09:52:00Z",
  today: [set("Bench Press", 82.5, 6, 7.5, 1), set("Bench Press", 82.5, 5, 9, 2), set("Dips", null, 12)],
  last: { "Bench Press": [set("Bench Press", 80, 6, null, 1), set("Bench Press", 80, 6, null, 2)] },
  bestBefore: { "Bench Press": 80 },
  notes: { "Bench Press": "Left shoulder a bit tight" },
};

describe("buildSummary", () => {
  it("lists each exercise against last time, with feel, records and notes", () => {
    expect(buildSummary(DATA)).toBe(
      [
        "Session: Push, 52 min.",
        '- Bench Press (barbell): today 82.5kgx6, 82.5kgx5; felt good, hard; last time 80kgx6, 80kgx6; new heaviest (was 80kg); note: "Left shoulder a bit tight".',
        "- Dips (barbell): today bodyweightx12; first time logged.",
      ].join("\n"),
    );
  });
});

describe("buildSummary privacy", () => {
  it("strips contact details from notes", () => {
    const text = buildSummary({ ...DATA, notes: { "Bench Press": "Trainer is jo@gym.com, 07700 900123" } });
    expect(text).toContain('note: "Trainer is [email], [phone]"');
  });
});

describe("parseReview", () => {
  it("reads JSON wrapped in other text or thinking, and tidies dashes", () => {
    expect(parseReview('<think>hmm {"x":1}</think>Sure! {"title":"Solid push day","summary":"Bench went up — nice."}')).toEqual({
      title: "Solid push day",
      summary: "Bench went up, nice.",
    });
  });
  it("rejects replies without a usable title and summary", () => {
    expect(parseReview(null)).toBeNull();
    expect(parseReview("no json here")).toBeNull();
    expect(parseReview('{"title": "", "summary": "x"}')).toBeNull();
    expect(parseReview('{"title": 3, "summary": "x"}')).toBeNull();
    expect(parseReview('{"title": "...", "summary": "..."}')).toBeNull();
  });
  it("finds the answer at the end of thinking that quotes the prompt", () => {
    const reasoning = 'Format is {"title": "...", "summary": "..."}. Bench {went} up. {"title":"Bench up","summary":"82.5kg for 6."}';
    expect(parseReview(reasoning)).toEqual({ title: "Bench up", summary: "82.5kg for 6." });
  });
});

/** A fake PostgREST plus OpenRouter. */
function fakeFetch(modelReplies: (Response | Error)[]) {
  const replies = [...modelReplies];
  return vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.startsWith("https://openrouter.ai")) {
      const next = replies.shift() ?? new Response("{}", { status: 500 });
      if (next instanceof Error) throw next;
      return next;
    }
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
    if (url.includes("/workouts?")) {
      return json([{ user_id: "u1", started_at: DATA.startedAt, ended_at: DATA.endedAt, routines: { name: "Push" } }]);
    }
    if (url.includes("/sets?workout_id=")) {
      return json([
        { workout_id: "w1", exercise_id: "e1", set_no: 1, weight_kg: "82.50", added_kg: "0", reps: 6, rpe: "7.5", exercises: { name: "Bench Press", equipment: "barbell", per_hand: false } },
      ]);
    }
    if (url.includes("/sets?user_id=")) {
      return json([
        { workout_id: "w0", exercise_id: "e1", set_no: 1, weight_kg: "80.00", added_kg: "0", reps: 6, rpe: null, exercises: { name: "Bench Press", equipment: "barbell", per_hand: false } },
      ]);
    }
    if (url.includes("/exercise_notes?")) return json([]);
    if (url.includes("/insights?")) return new Response(null, { status: 201 });
    return new Response("not found", { status: 404 });
  });
}

const modelOk = (content: string, model = MODELS[0]) =>
  new Response(JSON.stringify({ model, choices: [{ message: { content } }] }), { status: 200 });

describe("analyzeWorkout", () => {
  it("saves the first usable review as a workout_review insight", async () => {
    const fetchFn = fakeFetch([modelOk('{"title":"Bench is moving","summary":"82.5kg for 6, up from 80."}')]);
    expect(await analyzeWorkout(ENV, fetchFn, "w1", () => {})).toBe("saved");

    const modelCall = fetchFn.mock.calls.find(([u]) => String(u).startsWith("https://openrouter.ai"))!;
    const sent = JSON.parse(String(modelCall[1]?.body));
    expect(sent.model).toBe(MODELS[0]);
    expect(sent.messages[1].content).toContain("Bench Press (barbell): today 82.5kgx6");
    expect(sent.messages[1].content).not.toContain("u1");
    expect((modelCall[1]?.headers as Record<string, string>).Authorization).toBe("Bearer or-key-123");

    const save = fetchFn.mock.calls.find(([u]) => String(u).includes("/insights?"))!;
    expect(JSON.parse(String(save[1]?.body))).toMatchObject({
      user_id: "u1",
      kind: "workout_review",
      workout_id: "w1",
      period_start: "2026-10-14",
      title: "Bench is moving",
      generated_by: "openrouter",
      details: { model: MODELS[0] },
    });
  });

  it("falls back to the next model when one is busy, broken or rambling", async () => {
    const fetchFn = fakeFetch([
      new Response("rate limited", { status: 429 }),
      modelOk("I think the session was good."),
      modelOk('{"title":"Good session","summary":"Steady work."}', "some/free-model"),
    ]);
    const log = vi.fn();
    expect(await analyzeWorkout(ENV, fetchFn, "w1", log)).toBe("saved");
    const models = fetchFn.mock.calls
      .filter(([u]) => String(u).startsWith("https://openrouter.ai"))
      .map(([, init]) => JSON.parse(String(init?.body)).model);
    expect(models).toEqual(MODELS);
    expect(log).toHaveBeenCalledWith("analyze-workout: model refused", { model: MODELS[0], status: 429, reason: "rate limited" });
  });

  it("saves nothing when every model fails, and never leaks the key", async () => {
    const fetchFn = fakeFetch([new TypeError("boom or-key-123"), new Response("", { status: 500 }), new Response("", { status: 503 })]);
    const log = vi.fn();
    expect(await analyzeWorkout(ENV, fetchFn, "w1", log)).toBe("no review");
    expect(fetchFn.mock.calls.some(([u]) => String(u).includes("/insights?"))).toBe(false);
    expect(JSON.stringify(log.mock.calls)).not.toContain("or-key-123");
  });
});
