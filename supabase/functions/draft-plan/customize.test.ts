import { describe, expect, it, vi } from "vitest";
import { handle } from "./handler";
import {
  customizationContext,
  toCustomRequest,
  toCustomizedDraft,
  type CustomRequest,
  type ContextPlan,
} from "./customize";
const P = "77777777-0000-0000-0000-000000000001",
  R = "77777777-0000-0000-0000-000000000002",
  E = "77777777-0000-0000-0000-000000000003",
  W = "77777777-0000-0000-0000-000000000004";
const request: CustomRequest = {
  sourcePlanId: P,
  sourceRoutineId: R,
  lockedIds: [],
  preferences: {
    scope: "day",
    equipment: "dumbbell",
    focus: "same",
    duration: "30",
    instructions: "Keep it simple",
  },
};
const ex = {
  id: E,
  name: "Floor Press",
  equipment: "dumbbell",
  tracking: "reps",
  per_hand: true,
  muscle_groups: ["chest"],
};
const plan: ContextPlan = {
  id: P,
  name: "My plan",
  routines: [
    {
      id: R,
      name: "Upper",
      sort_order: 0,
      routine_exercises: [
        {
          sort_order: 0,
          target_sets: 3,
          target_reps: 10,
          rest_sec: 90,
          exercises: ex,
        },
      ],
    },
  ],
};
const draft = {
  name: "Upper today",
  summary: "Keeps the pressing focus using dumbbells.",
  days: [
    {
      name: "Upper with dumbbells",
      exercises: [
        {
          name: "Floor Press",
          equipment: "dumbbell",
          muscleGroups: ["chest"],
          tracking: "reps",
          perHand: true,
          sets: 3,
          reps: 10,
          restSec: 90,
        },
      ],
    },
  ],
};
describe("custom workout context and validation", () => {
  it("requires validated source IDs and choices", () => {
    expect(toCustomRequest(request)).toEqual(request);
    expect(
      toCustomRequest({ ...request, sourcePlanId: "arbitrary URL" }),
    ).toBeNull();
    expect(
      toCustomRequest({
        ...request,
        preferences: { ...request.preferences, equipment: "any" },
      }),
    ).toBeNull();
  });
  it("uses the actual plan and excludes logged exercises in remaining-work mode", () => {
    expect(
      customizationContext(plan, request, [ex], [])?.days[0]?.exercises[0],
    ).toMatchObject({ name: "Floor Press", sets: 3, reps: 10, restSec: 90 });
    expect(
      customizationContext(plan, { ...request, workoutId: W }, [ex], [E]),
    ).toBeNull();
    expect(
      customizationContext(plan, { ...request, sourceRoutineId: W }, [ex], []),
    ).toBeNull();
  });
  it("validates all days without truncating or guessing targets", () => {
    expect(
      toCustomizedDraft(draft, request, ["dumbbell"], [ex], 1),
    ).toMatchObject({ name: "Upper today" });
    expect(toCustomizedDraft(draft, request, ["dumbbell"], [ex], 2)).toBeNull();
    const changed = (change: Record<string, unknown>) => ({
      ...draft,
      days: [
        {
          ...draft.days[0],
          exercises: [{ ...draft.days[0].exercises[0], ...change }],
        },
      ],
    });
    expect(
      toCustomizedDraft(changed({ equipment: "machine" }), request, [], [], 1),
    ).toBeNull();
    expect(
      toCustomizedDraft(
        changed({ tracking: "time", reps: 30 }),
        request,
        [],
        [ex],
        1,
      ),
    ).toBeNull();
    expect(
      toCustomizedDraft(changed({ sets: 100 }), request, [], [], 1),
    ).toBeNull();
    expect(
      toCustomizedDraft(
        draft,
        {
          ...request,
          preferences: { ...request.preferences, focus: "full_body" },
        },
        [],
        [],
        1,
      ),
    ).toBeNull();
    expect(
      toCustomizedDraft(draft, { ...request, lockedIds: [E] }, [], [ex], 1),
    ).toBeNull();
  });
});
const ENV = {
  SUPABASE_URL: "https://db.example",
  SUPABASE_ANON_KEY: "anon-fixture",
  OPENROUTER_API_KEY: "model-fixture",
};
function mock({ found = true, asked = 0, auth = true } = {}) {
  return vi.fn<typeof fetch>(async (input, init) => {
    const u = String(input),
      ok = (v: unknown) => new Response(JSON.stringify(v));
    if (u.endsWith("/auth/v1/user"))
      return auth
        ? ok({ id: "synthetic-user" })
        : new Response("denied", { status: 401 });
    if (u.includes("coach_usage?")) return ok([{ questions: asked }]);
    if (u.includes("/plans?")) return ok(found ? [plan] : []);
    if (u.includes("/exercises?")) return ok([ex]);
    if (u.includes("openrouter.ai"))
      return ok({ choices: [{ message: { content: JSON.stringify(draft) } }] });
    if (u.includes("count_coach_question")) return ok(asked + 1);
    throw new Error(`Unexpected request ${u} ${init?.method}`);
  });
}
const req = (custom: CustomRequest = request) =>
  new Request("https://fn.example/draft-plan", {
    method: "POST",
    headers: { authorization: "Bearer owner-fixture" },
    body: JSON.stringify({ mode: "customize", customization: custom }),
  });
describe("custom workout edge request", () => {
  it("authenticates, reads RLS-scoped source context and returns a review, with no plan/workout writes", async () => {
    const fetch = mock();
    const response = await handle(req(), ENV, fetch, () => {});
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      customized: { name: "Upper today" },
      remaining: 19,
    });
    const model = fetch.mock.calls.find(([url]) =>
      String(url).includes("openrouter.ai"),
    )!;
    expect(JSON.parse(model[1]!.body as string).messages[1].content).toContain(
      "My plan",
    );
    for (const [url, init] of fetch.mock.calls.filter(([url]) =>
      String(url).startsWith(ENV.SUPABASE_URL),
    )) {
      expect((init?.headers as Record<string, string>).Authorization).toBe(
        "Bearer owner-fixture",
      );
      if (init?.method === "POST")
        expect(String(url)).toContain("count_coach_question");
    }
  });
  it("does not send a provider request for a missing/foreign source, unauthenticated caller or exhausted quota", async () => {
    for (const [options, status] of [
      [{ found: false }, 404],
      [{ auth: false }, 401],
      [{ asked: 20 }, 429],
    ] as const) {
      const fetch = mock(options);
      expect((await handle(req(), ENV, fetch, () => {})).status).toBe(status);
      expect(
        fetch.mock.calls.some(([u]) => String(u).includes("openrouter.ai")),
      ).toBe(false);
    }
  });
  it("redacts contact details from custom instructions before the provider sees them", async () => {
    const fetch = mock();
    await handle(
      req({
        ...request,
        preferences: {
          ...request.preferences,
          instructions: "Contact me at test@example.com",
        },
      }),
      ENV,
      fetch,
      () => {},
    );
    const call = fetch.mock.calls.find(([u]) =>
      String(u).includes("openrouter.ai"),
    )!;
    expect(String(call[1]?.body)).not.toContain("test@example.com");
  });
});

it("uses the rest of the source plan as background without drafting extra days", () => {
  const lower = { ...plan.routines[0], id: W, name: "Lower", sort_order: 1 };
  const context = customizationContext(
    { ...plan, routines: [plan.routines[0], lower] },
    request,
    [ex],
    [],
  )!;
  expect(context.days).toHaveLength(1);
  expect(context.planContext?.map((d) => d.name)).toEqual(["Upper", "Lower"]);
});
