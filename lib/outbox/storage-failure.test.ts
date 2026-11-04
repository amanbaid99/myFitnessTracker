import { expect, it, vi } from "vitest";
vi.mock("dexie", () => ({ default: class { constructor() { throw new Error("Storage unavailable"); } } }));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
import { enqueue, pendingCount, pendingRestoreCount } from "./store";

it("rejects storage failures asynchronously so the logger can retain inputs and show an error", async () => {
  await expect(pendingCount("workout")).rejects.toThrow("Storage unavailable");
  await expect(pendingRestoreCount("workout", Date.now())).rejects.toThrow("Storage unavailable");
  await expect(enqueue("workout", { kind: "deleteSet", id: "set", deletedAt: new Date().toISOString() })).rejects.toThrow("Storage unavailable");
});
