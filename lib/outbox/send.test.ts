import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendOp } from "./send";
describe("workout rest sync", () => {
  it("updates only the selected routine slot and is safe to retry", async () => {
    const single = vi.fn().mockResolvedValue({ error: null, status: 200 });
    const select = vi.fn(() => ({ single })),
      eq = vi.fn(() => ({ select })),
      update = vi.fn(() => ({ eq })),
      from = vi.fn(() => ({ update }));
    const client = { from } as unknown as SupabaseClient;
    const op = {
      kind: "setRest" as const,
      routineExerciseId: "slot",
      restSec: 245,
    };
    expect(await sendOp(client, op)).toEqual({ ok: true });
    expect(await sendOp(client, op)).toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith("routine_exercises");
    expect(update).toHaveBeenCalledWith({ rest_sec: 245 });
    expect(eq).toHaveBeenCalledWith("id", "slot");
    expect(single).toHaveBeenCalledTimes(2);
  });
  it("does not report success when RLS or a deleted slot prevents a write", async () => {
    const client = {
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({
                error: { message: "No visible row", code: "PGRST116" },
                status: 406,
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    expect(
      await sendOp(client, {
        kind: "setRest",
        routineExerciseId: "foreign",
        restSec: 60,
      }),
    ).toMatchObject({ ok: false, transient: false });
  });
});
