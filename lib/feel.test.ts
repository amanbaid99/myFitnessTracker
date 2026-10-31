import { describe, expect, it } from "vitest";
import { colorAt, positionOf, rpeAt, stepRpe } from "./feel";
import { feelFromRpe } from "./progression";

describe("feel slider", () => {
  it("puts each feel on its stop", () => {
    expect([0, 1 / 3, 2 / 3, 1].map(rpeAt)).toEqual([6, 7.5, 9, 10]);
    expect([6, 7.5, 9, 10].map(positionOf)).toEqual([0, 1 / 3, 2 / 3, 1]);
  });
  it("allows points in between, in half steps", () => {
    expect(rpeAt(0.5)).toBe(8.5); // halfway between Good and Hard (8.25) rounds to 8.5
    expect(rpeAt(0.45)).toBe(8);
    expect(rpeAt(0.55)).toBe(8.5);
    expect(feelFromRpe(rpeAt(0.45))).toBe("good");
    expect(feelFromRpe(rpeAt(0.55))).toBe("hard");
  });
  it("round-trips an RPE through its position", () => {
    for (const rpe of [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]) expect(rpeAt(positionOf(rpe))).toBe(rpe);
  });
  it("keeps old or odd values on the track", () => {
    expect(positionOf(4)).toBe(0);
    expect(rpeAt(-1)).toBe(6);
    expect(rpeAt(2)).toBe(10);
  });
  it("steps half an RPE with the keys, within Easy and Max", () => {
    expect(stepRpe(8, 1)).toBe(8.5);
    expect(stepRpe(6, -1)).toBe(6);
    expect(stepRpe(10, 1)).toBe(10);
  });
  it("blends the colour between stops", () => {
    const c = ["a", "b", "c", "d"];
    expect(colorAt(0, c)).toBe("a");
    expect(colorAt(1, c)).toBe("d");
    expect(colorAt(0.5, c)).toBe("color-mix(in oklab, b 50%, c)");
  });
});
