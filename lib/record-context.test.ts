import { describe, expect, it } from "vitest";
import { recordContext } from "./record-context";
const id = "11111111-1111-4111-8111-111111111111";
describe("previous record entry context", () => {
  it("returns to the ongoing workout, the chosen plan, or optional plan setup", () => {
    expect(recordContext({ exercise: id, workout: id })).toMatchObject({ exercise: id, returnTo: `/workout/${id}` });
    expect(recordContext({ plan: id })).toMatchObject({ plan: id, returnTo: `/plans/${id}` });
    expect(recordContext({ setup: "1" })).toMatchObject({ returnTo: "/", returnLabel: "Skip for now" });
  });
  it("rejects malformed ids and does not accept arbitrary navigation URLs", () => {
    expect(recordContext({ workout: "javascript:alert(1)", plan: "//external.example", exercise: [id] })).toMatchObject({ exercise: null, plan: null, returnTo: "/routines" });
  });
});
