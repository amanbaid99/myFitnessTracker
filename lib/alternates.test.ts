import { describe, expect, it } from "vitest";
import type { Exercise } from "./data";
import { chooseOption, lastDoneOption, nextOption, parseChoices, serializeChoices, usableOptions, withOption } from "./alternates";

const ex = (id: string): Exercise => ({
  id,
  name: id,
  equipment: "cable",
  muscleGroups: [],
  machineSetting: null,
  perHand: false,
  warmupEnabled: true,
  warmupTemplate: null,
  weightStepKg: 2.5,
  tracking: "reps",
});

describe("nextOption", () => {
  it("starts with the slot's own exercise", () => {
    expect(nextOption(["pulldown", "pullup"], null)).toBe("pulldown");
  });
  it("takes turns: the one after last time's, wrapping round", () => {
    expect(nextOption(["pulldown", "pullup"], "pulldown")).toBe("pullup");
    expect(nextOption(["pulldown", "pullup"], "pullup")).toBe("pulldown");
    expect(nextOption(["a", "b", "c"], "b")).toBe("c");
  });
  it("ignores a last exercise that is no longer an option", () => {
    expect(nextOption(["pulldown", "pullup"], "row")).toBe("pulldown");
  });
});

describe("chooseOption", () => {
  const optionIds = ["pulldown", "pullup"];
  it("rotates when nothing is logged or picked", () => {
    expect(chooseOption({ optionIds, loggedIds: new Set(), pickedId: null, lastDoneId: "pulldown" })).toBe("pullup");
  });
  it("keeps the one switched to during the workout", () => {
    expect(chooseOption({ optionIds, loggedIds: new Set(), pickedId: "pulldown", lastDoneId: "pulldown" })).toBe("pulldown");
  });
  it("shows the one with sets logged today, whatever was picked", () => {
    expect(chooseOption({ optionIds, loggedIds: new Set(["pulldown"]), pickedId: "pullup", lastDoneId: "pulldown" })).toBe("pulldown");
    expect(chooseOption({ optionIds, loggedIds: new Set(["pulldown", "pullup"]), pickedId: "pullup", lastDoneId: null })).toBe("pullup");
  });
  it("ignores a pick that is not an option", () => {
    expect(chooseOption({ optionIds, loggedIds: new Set(), pickedId: "row", lastDoneId: null })).toBe("pulldown");
  });
});

describe("lastDoneOption", () => {
  const recent = [
    { exerciseId: "pulldown", routineId: "upper1" },
    { exerciseId: "pullup", routineId: "upper2" },
    { exerciseId: "pulldown", routineId: "upper2" },
  ];
  it("looks at this day first", () => {
    expect(lastDoneOption(["pulldown", "pullup"], recent, "upper2")).toBe("pullup");
  });
  it("falls back to any day, then to none", () => {
    expect(lastDoneOption(["pulldown", "pullup"], recent, "new-day")).toBe("pulldown");
    expect(lastDoneOption(["chinup"], recent, "upper2")).toBeNull();
  });
});

describe("usableOptions and withOption", () => {
  const slot = { id: "s1", exercise: ex("pulldown"), alternates: [ex("pullup"), ex("row")] };
  const day = [slot, { id: "s2", exercise: ex("row") }];
  it("leaves out an alternate another slot of the day already does", () => {
    expect(usableOptions(slot, day).map((e) => e.id)).toEqual(["pulldown", "pullup"]);
  });
  it("does the slot as an option, keeping everything else", () => {
    const done = withOption({ ...slot, targetSets: 3 }, "pullup");
    expect(done.exercise.id).toBe("pullup");
    expect(done.targetSets).toBe(3);
    expect(withOption(slot, "unknown").exercise.id).toBe("pulldown");
  });
});

describe("choices cookie", () => {
  it("round-trips", () => {
    const c = { s1: "pullup", s2: "row" };
    expect(parseChoices(encodeURIComponent(serializeChoices(c)))).toEqual(c);
    expect(parseChoices(undefined)).toEqual({});
    expect(parseChoices("junk")).toEqual({});
  });
});
