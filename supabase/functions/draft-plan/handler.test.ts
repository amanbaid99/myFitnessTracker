import { describe, expect, it, vi } from "vitest";
import { DAILY_LIMIT, DRAFT_MODELS, handle, lastJson, MODELS, PAID_MODEL, prepMessage, toMuscleSuggestion, toMuscleBatch, toMuscleBatchSuggestion, MAX_BATCH, race, toDraft, toLines, toPrep, toPrepDay } from "./handler";
import { MUSCLE_GROUPS, EQUIPMENT } from "../../../lib/muscles";
import { MUSCLES, EQUIPMENT as FN_EQUIPMENT } from "./handler";

const ENV = { SUPABASE_URL: "https://db.example", SUPABASE_ANON_KEY: "anon-123", OPENROUTER_API_KEY: "or-key-123" };
const NOW = () => new Date("2026-10-19T10:00:00Z");

describe("vocabulary", () => {
  it("matches the app's muscles and equipment", () => {
    expect([...MUSCLES].sort()).toEqual([...MUSCLE_GROUPS].sort());
    expect([...FN_EQUIPMENT].sort()).toEqual([...EQUIPMENT].sort());
  });
});

describe("toDraft", () => {
  it("keeps the plan, cleaning names, equipment, muscles and numbers", () => {
    const draft = toDraft(
      {
        name: "Riya — full body",
        days: [
          {
            name: "Day 1",
            exercises: [
              { name: " goblet squat ", equipment: "Dumbbell", muscles: ["Quads", "glutes", "wings"], sets: 3, reps: 10 },
              { name: "Lat pulldown", equipment: "rope", muscles: ["lats"], sets: 40, reps: 0 },
              { name: "Goblet squat", equipment: "dumbbell", muscles: [], sets: 3, reps: 10 },
              { name: "", equipment: "cable" },
            ],
          },
          { name: "", exercises: [{ name: "Face Pull", equipment: "cable", muscles: ["rear delts"], sets: "3", reps: "12" }] },
          { name: "Rest", exercises: [] },
        ],
      },
      ["Lat Pulldown"],
    );
    expect(draft).toEqual({
      name: "Riya - full body",
      days: [
        {
          name: "Day 1",
          exercises: [
            { name: "goblet squat", equipment: "dumbbell", muscle_groups: ["quads", "glutes"], per_hand: true, sets: 3, reps: 10 },
            { name: "Lat Pulldown", equipment: "other", muscle_groups: ["lats"], per_hand: false, sets: 10, reps: 1 },
          ],
        },
        { name: "Day 2", exercises: [{ name: "Face Pull", equipment: "cable", muscle_groups: ["rear delts"], per_hand: false, sets: 3, reps: 12 }] },
      ],
    });
  });
  it("gives up when nothing usable is left", () => {
    expect(toDraft(null)).toBeNull();
    expect(toDraft({ days: [] })).toBeNull();
    expect(toDraft({ days: [{ name: "Day 1", exercises: [{ name: "" }] }] })).toBeNull();
  });
  it("caps days and exercises", () => {
    const many = { days: Array.from({ length: 9 }, () => ({ exercises: Array.from({ length: 15 }, (_, i) => ({ name: `Ex ${i}` })) })) };
    const draft = toDraft(many)!;
    expect(draft.days).toHaveLength(7);
    expect(draft.days[0].exercises).toHaveLength(12);
  });
});

describe("lastJson", () => {
  it("finds the plan after thinking that quotes the format", () => {
    expect(lastJson('Format: {"name": "x", "days": []}. Ok. {"name":"Plan","days":[{"name":"A","exercises":[]}]}')).toEqual({
      name: "Plan",
      days: [{ name: "A", exercises: [] }],
    });
    expect(lastJson("no json")).toBeNull();
  });
});

function fakeFetch({ asked = 0, models = [] as (Response | Error)[] } = {}) {
  const replies = [...models];
  return vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    const ok = (b: unknown) => new Response(JSON.stringify(b), { status: 200 });
    if (url.startsWith("https://openrouter.ai")) {
      const next = replies.shift() ?? new Response("down", { status: 503 });
      if (next instanceof Error) throw next;
      return next;
    }
    if (url.endsWith("/auth/v1/user")) return ok({ id: "user-id" });
    if (url.includes("/coach_usage?")) return ok(asked ? [{ questions: asked }] : []);
    if (url.includes("/exercises?")) return ok([{ name: "Lat Pulldown" }]);
    if (url.includes("/rpc/count_coach_question")) return ok(asked + 1);
    return new Response("nf", { status: 404 });
  });
}
const req = (body: unknown, token: string | null = "Bearer user-jwt") =>
  new Request("https://fn.example/draft-plan", {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: token } : {}) },
    body: JSON.stringify(body),
  });
const reply = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
const PLAN = '{"name":"Full body","days":[{"name":"Day 1","exercises":[{"name":"lat pulldown","equipment":"cable","muscles":["lats"],"sets":3,"reps":10}]}]}';

describe("handle", () => {
  it("drafts a plan from the description, with the user's names, and counts it", async () => {
    const fetchFn = fakeFetch({ asked: 1, models: [reply(PLAN)] });
    const res = await handle(req({ description: "Day 1: lat pulldowns. Email me at a@b.com", setup: "gym" }), ENV, fetchFn, () => {}, NOW);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.remaining).toBe(DAILY_LIMIT - 2);
    expect(body.draft.days[0].exercises[0].name).toBe("Lat Pulldown");
    const sent = JSON.parse(String(fetchFn.mock.calls.find(([u]) => String(u).startsWith("https://openrouter.ai"))![1]?.body));
    // A plan is drafted by the paid model first.
    expect(sent.model).toBe(PAID_MODEL);
    expect(DRAFT_MODELS[0]).toBe(PAID_MODEL);
    expect(sent.messages[1].content).toBe("Day 1: lat pulldowns. Email me at [email]");
    expect(sent.messages[0].content).toContain("use exactly these names when one matches: Lat Pulldown");
    expect(sent.messages[0].content).toContain("Their equipment: gym.");
  });

  it("falls back across models and does not count a failure", async () => {
    const fetchFn = fakeFetch({ models: [new Response("busy", { status: 429 }), reply("sorry, no"), new TypeError("or-key-123")] });
    const log = vi.fn();
    const res = await handle(req({ description: "three full body days please" }), ENV, fetchFn, log, NOW);
    expect(res.status).toBe(503);
    expect(fetchFn.mock.calls.some(([u]) => String(u).includes("count_coach_question"))).toBe(false);
    expect(JSON.stringify(log.mock.calls)).not.toContain("or-key-123");
  });

  it("refuses at the daily limit, a short description, or no sign-in", async () => {
    expect((await handle(req({ description: "three full body days" }), ENV, fakeFetch({ asked: DAILY_LIMIT }), () => {}, NOW)).status).toBe(429);
    expect((await handle(req({ description: "legs" }), ENV, fakeFetch(), () => {}, NOW)).status).toBe(400);
    expect((await handle(req({ description: "three full body days" }, null), ENV, fakeFetch(), () => {}, NOW)).status).toBe(401);
  });
});

describe("race", () => {
  const wait = (ms: number, value: string | null, log: string[], name: string) => (signal: AbortSignal) =>
    new Promise<string | null>((resolve) => {
      log.push(`start ${name}`);
      const t = setTimeout(() => resolve(value), ms);
      signal.addEventListener("abort", () => {
        clearTimeout(t);
        log.push(`abort ${name}`);
        resolve(null);
      });
    });

  it("lets a later, faster attempt win and aborts the slow one", async () => {
    const log: string[] = [];
    const out = await race([wait(300, "slow", log, "a"), wait(20, "fast", log, "b")], 30, 1000);
    expect(out).toBe("fast");
    expect(log).toEqual(["start a", "start b", "abort a", "abort b"]);
  });
  it("starts the next attempt at once when one fails", async () => {
    const log: string[] = [];
    const t0 = Date.now();
    expect(await race([wait(5, null, log, "a"), wait(5, "ok", log, "b")], 5000, 1000)).toBe("ok");
    expect(Date.now() - t0).toBeLessThan(500);
  });
  it("gives up at the deadline or when all fail", async () => {
    expect(await race([wait(500, "late", [], "a")], 1000, 40)).toBeNull();
    expect(await race([wait(5, null, [], "a"), wait(5, null, [], "b")], 1, 1000)).toBeNull();
  });
});

describe("warm-up and cool-down", () => {
  it("keeps a described warm-up on a drafted day, and leaves it out otherwise", () => {
    const draft = toDraft({
      days: [
        { name: "Day 1", warmup: ["10 min treadmill", " ", "- Hip circles"], cooldown: [], exercises: [{ name: "Squat" }] },
        { name: "Day 2", exercises: [{ name: "Row" }] },
      ],
    })!;
    expect(draft.days[0].warmup).toEqual(["10 min treadmill", "Hip circles"]);
    expect(draft.days[0].cooldown).toBeUndefined();
    expect("warmup" in draft.days[1]).toBe(false);
  });
  it("cleans lines: bullets and numbers off, dashes tidied, capped at 12 of 200 characters", () => {
    expect(toLines(["1. Bike — easy", "2) Arm circles", { text: "Band pull-aparts" }, 5, ""])).toEqual([
      "Bike - easy",
      "Arm circles",
      "Band pull-aparts",
    ]);
    expect(toLines(Array.from({ length: 20 }, () => "x".repeat(300)))).toHaveLength(12);
    expect(toLines(["x".repeat(300)])[0]).toHaveLength(200);
  });
  it("needs both lists from the model", () => {
    expect(toPrep({ warmup: ["Bike"], cooldown: ["Stretch"] })).toEqual({ warmup: ["Bike"], cooldown: ["Stretch"] });
    expect(toPrep({ warmup: ["Bike"], cooldown: [] })).toBeNull();
    expect(toPrep(null)).toBeNull();
  });
  it("checks the day the app sends", () => {
    expect(toPrepDay({ name: "Push", exercises: [{ name: "Bench Press", muscles: ["chest", "wings", "triceps"] }, { name: "" }] })).toEqual({
      name: "Push",
      exercises: [{ name: "Bench Press", muscles: ["chest", "triceps"] }],
    });
    expect(toPrepDay({ name: "Push", exercises: [] })).toBeNull();
    expect(prepMessage({ name: "Push", exercises: [{ name: "Bench Press", muscles: ["chest"] }] })).toBe("Day: Push\n1. Bench Press (chest)");
  });
  it("writes a day's warm-up and cool-down and counts it", async () => {
    const fetchFn = fakeFetch({
      asked: 2,
      models: [reply('Thinking about {"warmup": ["..."]}. {"warmup":["5 min rower","Arm circles"],"cooldown":["Chest stretch, 30 s"]}')],
    });
    const res = await handle(
      req({ mode: "prep", day: { name: "Push", exercises: [{ name: "Bench Press", muscles: ["chest"] }] }, setup: "gym" }),
      ENV,
      fetchFn,
      () => {},
      NOW,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.prep).toEqual({ warmup: ["5 min rower", "Arm circles"], cooldown: ["Chest stretch, 30 s"] });
    expect(body.remaining).toBe(DAILY_LIMIT - 3);
    const sent = JSON.parse(String(fetchFn.mock.calls.find(([u]) => String(u).startsWith("https://openrouter.ai"))![1]?.body));
    expect(sent.messages[0].content).toContain("warm-up and cool-down");
    // Warm-ups start with a free model.
    expect(sent.model).toBe(MODELS[0]);
    expect(MODELS[0]).not.toBe(PAID_MODEL);
    expect(sent.messages[1].content).toBe("Day: Push\n1. Bench Press (chest)");
  });
  it("refuses a day with no exercises", async () => {
    expect((await handle(req({ mode: "prep", day: { name: "Push", exercises: [] } }), ENV, fakeFetch(), () => {}, NOW)).status).toBe(400);
  });
});


describe("muscle suggestions", () => {
  it("returns known ordered groups only, and handles ambiguous exercises", () => {
    expect(toMuscleSuggestion({groups:["Glutes","quads","glutes","unknown"],explanation:"Works the hip."})).toEqual({groups:["glutes","quads"],explanation:"Works the hip."});
    expect(toMuscleSuggestion({groups:[],explanation:"Which movement?"})?.groups).toEqual([]);
    expect(toMuscleSuggestion({groups:"chest"})).toBeNull();
  });
  it("returns a suggestion without writing exercise metadata or sending the library", async () => {
    const fetchFn = fakeFetch({models:[reply('{"groups":["glutes","hamstrings"],"explanation":"Hip extension."}')]});
    const res = await handle(req({mode:"muscles",exercise:{name:"Hip thrust",equipment:"barbell"}}),ENV,fetchFn,()=>{},NOW);
    expect(res.status).toBe(200);
    expect((await res.json()).muscles.groups).toEqual(["glutes","hamstrings"]);
    expect(fetchFn.mock.calls.some(([u])=>String(u).includes("/exercises?"))).toBe(false);
    expect(fetchFn.mock.calls.filter(([,options])=>options?.method==='POST')).toHaveLength(2);
  });
  it("requires an authenticated user and honours the existing daily quota", async () => {
    expect((await handle(req({mode:"muscles",exercise:{name:"Squat"}},null),ENV,fakeFetch(),()=>{},NOW)).status).toBe(401);
    const base=fakeFetch();
    const denied=vi.fn<typeof fetch>(async(url,init)=>String(url).endsWith('/auth/v1/user')?new Response('no',{status:401}):base(url,init));
    expect((await handle(req({mode:"muscles",exercise:{name:"Squat"}}),ENV,denied,()=>{},NOW)).status).toBe(401);
    expect(base).not.toHaveBeenCalled();
    const limited=fakeFetch({asked:DAILY_LIMIT});
    expect((await handle(req({mode:"muscles",exercise:{name:"Squat"}}),ENV,limited,()=>{},NOW)).status).toBe(429);
    expect(limited.mock.calls.some(([u])=>String(u).startsWith('https://openrouter.ai'))).toBe(false);
  });
});

describe("batch muscle suggestions", () => {
  it("checks the list sent by the app", () => {
    expect(toMuscleBatch([{ name: " Cable crunch ", equipment: "cable" }, { name: "Farmer carry", equipment: "kettlebell?" }])).toEqual([
      { name: "Cable crunch", equipment: "cable" }, { name: "Farmer carry", equipment: "other" },
    ]);
    expect(toMuscleBatch([])).toBeNull();
    expect(toMuscleBatch([{ name: "x" }])).toBeNull();
    expect(toMuscleBatch(Array.from({ length: MAX_BATCH + 1 }, () => ({ name: "Squat" })))).toBeNull();
  });
  it("keeps one known suggestion per exercise in order, empty when unsure", () => {
    expect(toMuscleBatchSuggestion({ items: [{ index: 1, groups: ["Core", "wings"] }, { index: 0, groups: ["glutes"] }, { index: 9, groups: ["chest"] }] }, 3)).toEqual([
      { groups: ["glutes"] }, { groups: ["core"] }, { groups: [] },
    ]);
    expect(toMuscleBatchSuggestion({ groups: [] }, 2)).toBeNull();
  });
  it("answers a whole batch with one AI request, counted once, after checking the user", async () => {
    const fetchFn = fakeFetch({ models: [reply('{"items":[{"index":0,"groups":["core"]},{"index":1,"groups":["traps","core"]}]}')] });
    const res = await handle(req({ mode: "muscles_batch", exercises: [{ name: "Cable crunch", equipment: "cable" }, { name: "Farmer carry", equipment: "dumbbell" }] }), ENV, fetchFn, () => {}, NOW);
    expect(res.status).toBe(200);
    expect((await res.json()).suggestions).toEqual([{ groups: ["core"] }, { groups: ["traps", "core"] }]);
    expect(fetchFn.mock.calls.filter(([u]) => String(u).startsWith("https://openrouter.ai"))).toHaveLength(1);
    expect(fetchFn.mock.calls.filter(([u]) => String(u).includes("count_coach_question"))).toHaveLength(1);
    expect(fetchFn.mock.calls.some(([u]) => String(u).endsWith("/auth/v1/user"))).toBe(true);
    expect((await handle(req({ mode: "muscles_batch", exercises: [] }), ENV, fakeFetch(), () => {}, NOW)).status).toBe(400);
    expect((await handle(req({ mode: "muscles_batch", exercises: [{ name: "Squat" }] }, null), ENV, fakeFetch(), () => {}, NOW)).status).toBe(401);
  });
});
