import { describe, expect, it } from "vitest";
import { searchLibrary } from "./exercise-search";

const lib = [
  { id: "lp", name: "Lat Pulldown" },
  { id: "pu", name: "Pull-Up" },
  { id: "row", name: "Seated Cable Row" },
];

describe("searchLibrary", () => {
  it("matches every typed word in any order", () => {
    expect(searchLibrary(lib, "Lat pull").map((e) => e.id)).toEqual(["lp"]);
    expect(searchLibrary(lib, "pulldown lat").map((e) => e.id)).toEqual(["lp"]);
    expect(searchLibrary(lib, "pull").map((e) => e.id)).toEqual(["lp", "pu"]);
  });
  it("keeps exercises already in the workout, listed last", () => {
    expect(searchLibrary(lib, "pull", { inWorkout: ["lp"] }).map((e) => e.id)).toEqual(["pu", "lp"]);
  });
  it("leaves out hidden exercises", () => {
    expect(searchLibrary(lib, "pull", { hidden: ["lp"] }).map((e) => e.id)).toEqual(["pu"]);
  });
});
