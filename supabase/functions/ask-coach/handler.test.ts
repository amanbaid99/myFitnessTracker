import { describe, expect, it, vi } from "vitest";
import { buildContext, cleanReply, DAILY_LIMIT, handle, MODELS, readMessages, type CoachData } from "./handler";

const ENV = { SUPABASE_URL: "https://db.example", SUPABASE_ANON_KEY: "anon-123", OPENROUTER_API_KEY: "or-key-123" };
const NOW = () => new Date("2026-10-14T10:00:00Z");
const W1 = "11111111-2222-3333-4444-555555555555";

describe("readMessages", () => {
  it("keeps the last 8 messages, trimmed, ending with the user's", () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: ` m${i} ` }));
    const out = readMessages({ messages: many })!;
    expect(out).toHaveLength(8);
    expect(out[0]).toEqual({ role: "assistant", content: "m3" });
    expect(out[7]).toEqual({ role: "user", content: "m10" });
  });
  it("strips contact details from what the user typed", () => {
    expect(readMessages({ messages: [{ role: "user", content: "email me at a@b.com" }] })).toEqual([
      { role: "user", content: "email me at [email]" },
    ]);
  });
    it("rejects anything else", () => {
    expect(readMessages({})).toBeNull();
    expect(readMessages({ messages: [] })).toBeNull();
    expect(readMessages({ messages: [{ role: "system", content: "x" }] })).toBeNull();
    expect(readMessages({ messages: [{ role: "user", content: "  " }] })).toBeNull();
    expect(readMessages({ messages: [{ role: "user", content: "hi" }, { role: "assistant", content: "yo" }] })).toBeNull();
  });
});

const DATA: CoachData = {
  units: "kg",
  experience: "beginner",
  setup: "gym",
  plan: [{ day: "Upper 1", exercises: ["Lat Pulldown 3x10", "Dumbbell Shoulder Press 3x10"] }],
  sessions: [{ date: "2026-10-13", day: "Upper 2", best: ["Lat Pulldown 47x9"] }],
  musclesPerWeek: { lats: 6, shoulders: 9.5 },
  analyses: [{ date: "2026-10-13", title: "Shoulders up", summary: "Press went to 12.5kg.", workoutId: W1 }],
  focusWorkoutId: W1,
};

describe("buildContext", () => {
  it("summarises plan, sessions, muscles and analyses, marking the one asked about", () => {
    expect(buildContext(DATA)).toBe(
      [
        "Athlete: beginner lifter, trains with: gym, prefers kg.",
        "",
        "Current plan:",
        "- Upper 1: Lat Pulldown 3x10, Dumbbell Shoulder Press 3x10",
        "",
        "Sessions in the last 4 weeks (best set per exercise, weight in kg x reps):",
        "- 2026-10-13 Upper 2: Lat Pulldown 47x9",
        "",
        "Average working sets per week by muscle:",
        "- shoulders 9.5, lats 6",
        "",
        "Recent post-workout analyses:",
        "- 2026-10-13 (the session they are asking about): Shoulders up. Press went to 12.5kg.",
      ].join("\n"),
    );
  });
});

describe("buildContext with recent workouts", () => {
  it("lists every set of the latest workouts when asked about them", () => {
    const text = buildContext({
      ...DATA,
      analyses: [],
      recent: [{ date: "2026-10-13", day: "Upper 2", exercises: ["Lat Pulldown: 23.5kgx9 (hard), 47kgx9 (hard)"] }],
    });
    expect(text).toContain(
      [
        "Their last 1 workouts in detail (they want to talk about these; feel is how the set felt):",
        "- 2026-10-13 Upper 2:",
        "  - Lat Pulldown: 23.5kgx9 (hard), 47kgx9 (hard)",
      ].join("\n"),
    );
  });
});

describe("cleanReply", () => {
  it("drops thinking and em dashes, and empty replies", () => {
    expect(cleanReply("<think>hmm</think> Add a set — easy.")).toBe("Add a set, easy.");
    expect(cleanReply("<think>only thinking</think>")).toBeNull();
    expect(cleanReply(null)).toBeNull();
  });
});

/** A fake PostgREST plus OpenRouter. */
function fakeFetch({ asked = 0, models = [] as (Response | Error)[] } = {}) {
  const replies = [...models];
  return vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
    if (url.startsWith("https://openrouter.ai")) {
      const next = replies.shift() ?? new Response("down", { status: 503 });
      if (next instanceof Error) throw next;
      return next;
    }
    if (url.includes("/coach_usage?")) return json(asked ? [{ questions: asked }] : []);
    if (url.includes("/rpc/count_coach_question")) return json(asked + 1);
    if (url.includes("/profiles?")) return json([{ units: "kg", experience: null, training_setup: "gym" }]);
    if (url.includes("/routines?")) return json([]);
    if (url.includes("/workouts?") && url.includes("limit=3")) {
      return json([{ id: W1, started_at: "2026-10-13T04:00:00Z", routines: { name: "Upper 2" } }]);
    }
    if (url.includes("/sets?workout_id=in.")) {
      return json([
        { workout_id: W1, weight_kg: "23.50", added_kg: "0", reps: 9, rpe: "9", exercises: { name: "Lat Pulldown" } },
        { workout_id: W1, weight_kg: "47.00", added_kg: "0", reps: 9, rpe: null, exercises: { name: "Lat Pulldown" } },
      ]);
    }
    if (url.includes("/workouts?")) return json([{ id: W1, started_at: "2026-10-13T04:00:00Z", routines: { name: "Upper 2" } }]);
    if (url.includes("/exercise_session_best?")) return json([{ workout_id: W1, exercise_id: "e1", weight_kg: "47.00", added_kg: "0", reps: 9 }]);
    if (url.includes("/exercises?")) return json([{ id: "e1", name: "Lat Pulldown" }]);
    if (url.includes("/workout_muscle_sets?")) return json([{ muscle: "lats", sets: "4" }]);
    if (url.includes("/insights?")) return json([]);
    return new Response("not found", { status: 404 });
  });
}

const ask = (body: unknown, token: string | null = "Bearer user-jwt") =>
  new Request("https://fn.example/ask-coach", {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: token } : {}) },
    body: JSON.stringify(body),
  });

const modelOk = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
const question = { messages: [{ role: "user", content: "Am I training lats enough?" }] };

describe("handle", () => {
  it("answers with the user's own data and counts the question", async () => {
    const fetchFn = fakeFetch({ asked: 2, models: [modelOk("About 1 set a week of lats. Add a row.")] });
    const res = await handle(ask(question), ENV, fetchFn, () => {}, NOW);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reply: "About 1 set a week of lats. Add a row.", remaining: DAILY_LIMIT - 3 });

    // Database reads carry the user's token, never a service key.
    const dbCalls = fetchFn.mock.calls.filter(([u]) => String(u).startsWith("https://db.example"));
    expect(dbCalls.every(([, init]) => (init?.headers as Record<string, string>).Authorization === "Bearer user-jwt")).toBe(true);
    expect(String(dbCalls.find(([u]) => String(u).includes("coach_usage"))![0])).toContain("day=eq.2026-10-14");

    const sent = JSON.parse(String(fetchFn.mock.calls.find(([u]) => String(u).startsWith("https://openrouter.ai"))![1]?.body));
    expect(sent.model).toBe(MODELS[0]);
    expect(sent.messages[0].content).toContain("- 2026-10-13 Upper 2: Lat Pulldown 47x9");
    expect(sent.messages[0].content).toContain("lats 1");
    expect(sent.messages.slice(1)).toEqual(question.messages);
  });

  it("adds every set of the last 3 workouts when the scope is recent", async () => {
    const fetchFn = fakeFetch({ models: [modelOk("Good week.")] });
    const res = await handle(ask({ ...question, scope: "recent" }), ENV, fetchFn, () => {}, NOW);
    expect(res.status).toBe(200);
    const sent = JSON.parse(String(fetchFn.mock.calls.find(([u]) => String(u).startsWith("https://openrouter.ai"))![1]?.body));
    expect(sent.messages[0].content).toContain("  - Lat Pulldown: 23.5kgx9 (hard), 47kgx9");
  });

  it("leaves the detail out otherwise", async () => {
    const fetchFn = fakeFetch({ models: [modelOk("Ok.")] });
    await handle(ask(question), ENV, fetchFn, () => {}, NOW);
    expect(fetchFn.mock.calls.some(([u]) => String(u).includes("/sets?workout_id=in."))).toBe(false);
  });

  it("stops at the daily limit without asking a model", async () => {
    const fetchFn = fakeFetch({ asked: DAILY_LIMIT });
    const res = await handle(ask(question), ENV, fetchFn, () => {}, NOW);
    expect(res.status).toBe(429);
    expect(fetchFn.mock.calls.some(([u]) => String(u).startsWith("https://openrouter.ai"))).toBe(false);
  });

  it("falls back across models, and does not count a question nobody answered", async () => {
    const fetchFn = fakeFetch({ models: [new Response("busy", { status: 429 }), modelOk("<think>x</think>"), new TypeError("or-key-123")] });
    const log = vi.fn();
    const res = await handle(ask(question), ENV, fetchFn, log, NOW);
    expect(res.status).toBe(503);
    expect(fetchFn.mock.calls.some(([u]) => String(u).includes("count_coach_question"))).toBe(false);
    expect(JSON.stringify(log.mock.calls)).not.toContain("or-key-123");
  });

  it("needs a signed-in user and a question; answers CORS preflight", async () => {
    expect((await handle(ask(question, null), ENV, fakeFetch(), () => {}, NOW)).status).toBe(401);
    expect((await handle(ask({ messages: [] }), ENV, fakeFetch(), () => {}, NOW)).status).toBe(400);
    const pre = await handle(new Request("https://fn.example", { method: "OPTIONS" }), ENV, fakeFetch(), () => {}, NOW);
    expect(pre.status).toBe(200);
    expect(pre.headers.get("access-control-allow-origin")).toBe("*");
  });
});
