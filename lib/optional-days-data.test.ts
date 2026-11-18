import { it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("./supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@supabase/supabase-js";
import { getRoutines, getRecentWorkouts } from "./data";
const row = {
  id: "day",
  plan_id: "plan",
  name: "Extra",
  sort_order: 1,
  warmup: null,
  cooldown: null,
  routine_exercises: [],
};
it("reads optional metadata and falls back independently from missing alternates in the old schema", async () => {
  for (const order of ["optional-first", "alternates-first"]) {
    const urls: string[] = [];
    const db = createClient("https://local.example", "synthetic-only", {
      auth: { persistSession: false },
      global: {
        fetch: async (input) => {
          const url = decodeURIComponent(String(input));
          urls.push(url);
          const hasOptional = url.includes("is_optional"),
            hasAlternates = url.includes("routine_exercise_alternates");
          if (order === "alternates-first" && hasAlternates)
            return Response.json(
              {
                code: "PGRST200",
                message: "routine_exercise_alternates missing",
              },
              { status: 400 },
            );
          if (hasOptional)
            return Response.json(
              { code: "42703", message: "is_optional missing" },
              { status: 400 },
            );
          if (hasAlternates)
            return Response.json(
              {
                code: "PGRST200",
                message: "routine_exercise_alternates missing",
              },
              { status: 400 },
            );
          return Response.json([row]);
        },
      },
    });
    expect((await getRoutines(db, "plan"))[0].isOptional).toBe(false);
    expect(urls).toHaveLength(3);
    expect(urls.every((u) => u.includes("plan_id=eq.plan"))).toBe(true);
  }
});
it("keeps optional days in plan reads and start-time snapshot flags in workout history", async () => {
  const db = createClient("https://local.example", "synthetic-only", {
    auth: { persistSession: false },
    global: {
      fetch: async (input) =>
        String(input).includes("/routines?")
          ? Response.json([{ ...row, is_optional: true }])
          : Response.json([
              {
                id: "old",
                routine_id: "day",
                started_at: "2026-11-17",
                ended_at: "2026-11-17",
                source: "app",
              },
              {
                id: "new",
                routine_id: "day",
                started_at: "2026-11-18",
                ended_at: "2026-11-18",
                source: "app",
                counts_for_rotation: false,
              },
              {
                id: "cancelled",
                cancelled_at: "2026-11-18",
                counts_for_rotation: false,
              },
            ]),
    },
  });
  expect((await getRoutines(db, "plan"))[0].isOptional).toBe(true);
  expect((await getRecentWorkouts(db)).map((w) => w.countsForRotation)).toEqual(
    [true, false],
  );
});
it("does not hide permission errors as an old-schema fallback", async () => {
  let calls = 0;
  const db = createClient("https://local.example", "synthetic-only", {
    auth: { persistSession: false },
    global: {
      fetch: async () => {
        calls++;
        return Response.json(
          { code: "42501", message: "permission denied" },
          { status: 403 },
        );
      },
    },
  });
  await expect(getRoutines(db, "plan")).rejects.toThrow("permission denied");
  expect(calls).toBe(1);
});

import { getRotationWorkouts } from "./data";
it("looks up the regular anchor outside the recent-history limit and falls back on old schemas", async () => {
  const urls: string[] = [];
  const db = createClient("https://local.example", "synthetic-only", {
    auth: { persistSession: false },
    global: {
      fetch: async (input) => {
        const url = decodeURIComponent(String(input));
        urls.push(url);
        return url.includes("counts_for_rotation")
          ? Response.json(
              { code: "42703", message: "counts_for_rotation missing" },
              { status: 400 },
            )
          : Response.json([
              { routine_id: "regular", started_at: "2026-01-01" },
            ]);
      },
    },
  });
  expect(await getRotationWorkouts(db, ["regular"])).toEqual([
    { routineId: "regular", startedAt: "2026-01-01" },
  ]);
  expect(urls).toHaveLength(2);
  expect(urls[0]).toContain("routine_id=in.(regular)");
  expect(urls[0]).toContain("counts_for_rotation=eq.true");
  expect(urls[0]).toContain("limit=1");
  expect(urls[0]).toContain("ended_at=not.is.null");
  expect(urls[0]).toContain("cancelled_at=is.null");
  expect(urls[0]).toContain("source=eq.app");
  expect(await getRotationWorkouts(db, [])).toEqual([]);
  expect(urls).toHaveLength(2);
});
