import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { addPlanDay, setRoutineOptional } from "./optional-days";
function db(reply: unknown = [{ id: "day" }], status = 200) {
  const calls: { url: string; body: unknown }[] = [];
  return {
    calls,
    client: createClient("https://local.example", "synthetic-only", {
      auth: { persistSession: false },
      global: {
        fetch: async (input, init) => {
          calls.push({
            url: String(input),
            body: JSON.parse(String(init?.body ?? "{}")),
          });
          return Response.json(reply, { status });
        },
      },
    }),
  };
}
it("adds an optional day without changing plan targets or order of existing days", async () => {
  const { calls, client } = db({ id: "day" });
  expect(
    (await addPlanDay(client, "p", "  Bodyweight  ", 4, true)).error,
  ).toBeNull();
  expect(calls).toHaveLength(1);
  expect(calls[0].body).toEqual({
    plan_id: "p",
    name: "Bodyweight",
    sort_order: 4,
    is_optional: true,
  });
});
it("regular additions still work with the previous schema", async () => {
  const { calls, client } = db({ id: "day" });
  await addPlanDay(client, "p", "Day", 4, false);
  expect(calls[0].body).not.toHaveProperty("is_optional");
});
it("optional toggles update one day and report a missing installation clearly", async () => {
  const { calls, client } = db(
    { code: "PGRST204", message: "is_optional missing" },
    400,
  );
  expect(
    (await setRoutineOptional(client, "day", true)).error?.message,
  ).toMatch(/still being installed/);
  expect(calls[0].url).toContain("id=eq.day");
  expect(calls[0].body).toEqual({ is_optional: true });
});
it("rejects empty or excessive names before writing", async () => {
  const { calls, client } = db();
  for (const name of [" ", "a".repeat(81)])
    expect((await addPlanDay(client, "p", name, 4, true)).error).toBeTruthy();
  expect(calls).toHaveLength(0);
});
