import { describe, expect, it } from "vitest";
import { checkSupabaseEnv, cleanEnvValue } from "./env";

const URL_OK = "https://qoeyskhsjvlolbvlvypm.supabase.co";

describe("cleanEnvValue", () => {
  it("strips spaces, newlines and quotes", () => {
    expect(cleanEnvValue(`  "${URL_OK}"\n`)).toBe(URL_OK);
    expect(cleanEnvValue(`'${URL_OK}'`)).toBe(URL_OK);
    expect(cleanEnvValue(undefined)).toBe("");
  });
});

describe("checkSupabaseEnv", () => {
  it("accepts a clean URL and key", () => {
    expect(checkSupabaseEnv(URL_OK, "key")).toEqual({ ok: true, url: URL_OK, anonKey: "key" });
  });

  it("repairs common paste mistakes", () => {
    expect(checkSupabaseEnv(` "${URL_OK}/" `, " key\n")).toEqual({ ok: true, url: URL_OK, anonKey: "key" });
  });

  it("explains a missing value", () => {
    const env = checkSupabaseEnv("", "key");
    expect(env.ok).toBe(false);
    if (!env.ok) expect(env.error).toMatch(/missing/);
  });

  it.each([
    "qoeyskhsjvlolbvlvypm.supabase.co",
    "qoeyskhsjvlolbvlvypm",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.x",
    "postgresql://postgres:pw@db.x.supabase.co:5432/postgres",
  ])("rejects %s with a readable message", (value) => {
    const env = checkSupabaseEnv(value, "key");
    expect(env.ok).toBe(false);
    if (!env.ok) expect(env.error).toMatch(/not a web address/);
  });
});
