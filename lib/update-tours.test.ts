import { describe, expect, it } from "vitest";
import {
  NOVEMBER_UPDATE_PREVIEW,
  UPDATE_TOURS,
  nextUpdateTour,
  safeTourHref,
  tourIndex,
  updateTourHref,
  updateTourKey,
  validUpdateTour,
  type UpdateTour,
} from "./update-tours";
const now = new Date("2026-11-05T12:00:00Z");
const batch = (id: string, date = "2026-11-05"): UpdateTour => ({
  id,
  date,
  title: "Sample batch",
  steps: [
    {
      title: "Sample",
      body: "Sample",
      href: "/demo/progress?view=muscles",
      target: "main",
      changes: [],
      prs: [],
    },
  ],
});
describe("owner-controlled update tours", () => {
  it("announces only the approved batch on its release day, once per account", () => {
    // The rebuilt tour has a new id, so accounts that saw the old one see it again.
    expect(UPDATE_TOURS.map(tour => tour.id)).toEqual(["nov-3-5-2026-v2"]);
    expect(nextUpdateTour(UPDATE_TOURS, new Set([updateTourKey("nov-3-5-2026")]), null, new Date("2026-11-06T12:00:00Z"))?.id).toBe("nov-3-5-2026-v2");
    const tours = [NOVEMBER_UPDATE_PREVIEW];
    expect(nextUpdateTour(tours, new Set(), null, now)).toBeNull();
    const released = new Date("2026-11-05T18:30:00Z");
    expect(nextUpdateTour(tours, new Set(), null, released)?.id).toBe("nov-3-5-2026-v2");
    expect(nextUpdateTour(tours, new Set([updateTourKey("nov-3-5-2026-v2")]), null, released)).toBeNull();
    expect(validUpdateTour(NOVEMBER_UPDATE_PREVIEW)).toBe(true);
  });
  it("shows only unseen, released batches and uses the India joining day", () => {
    const tours = [
      batch("old", "2026-11-03"),
      batch("new"),
      batch("future", "2026-11-06"),
    ];
    expect(
      nextUpdateTour(tours, new Set(), "2026-11-03T18:31:00Z", now)?.id,
    ).toBe("new");
    expect(
      nextUpdateTour(
        tours,
        new Set([updateTourKey("new")]),
        "2026-11-03T18:31:00Z",
        now,
      ),
    ).toBeNull();
    expect(nextUpdateTour(tours, new Set(["new:new"]), null, now)?.id).toBe(
      "new",
    );
    expect(
      nextUpdateTour(
        [batch("older", "2026-11-04"), batch("new")],
        new Set([updateTourKey("new")]),
        null,
        now,
      ),
    ).toBeNull();
  });
  it("rejects external, authenticated and escaped destinations", () => {
    for (const href of [
      "https://example.com/demo",
      "//example.com/demo",
      "/settings",
      "/demolition",
      "/demo/../../settings",
      "/demo\\../settings",
    ])
      expect(safeTourHref(href)).toBe(false);
    expect(safeTourHref("/demo?finished=1")).toBe(true);
    expect(
      nextUpdateTour(
        [
          {
            ...batch("bad"),
            steps: [{ ...batch("x").steps[0], href: "/workout/real-id" }],
          },
        ],
        new Set(),
        null,
        now,
      ),
    ).toBeNull();
  });
  it("keeps step links local and retains the sample's own parameters", () => {
    const url = updateTourHref(batch("sample"), 0, true);
    expect(url).toBe(
      "/demo/progress?view=muscles&updateTour=sample&tourStep=0&tourPreview=1",
    );
    expect(() =>
      updateTourHref({ ...batch("bad"), id: "a".repeat(60) }),
    ).toThrow();
  });
  it("recovers from invalid and out-of-range step URLs", () => {
    for (const value of [null, "-1", "99", "1.5", "NaN"])
      expect(tourIndex(value, 3)).toBe(0);
    expect(tourIndex("2", 3)).toBe(2);
  });
  it("keeps the rebuilt tour short, pointed and free of em dashes", () => {
    // Aman (6 Nov): a short spotlight tour, not one step per merge.
    expect(NOVEMBER_UPDATE_PREVIEW.steps.length).toBeLessThanOrEqual(6);
    for (const step of NOVEMBER_UPDATE_PREVIEW.steps) {
      expect(step.target.trim()).not.toBe("");
      expect(step.title + step.body + step.changes.join(" ")).not.toMatch(/—/);
      expect(step.body.length).toBeLessThan(160);
    }
    expect(validUpdateTour({ ...NOVEMBER_UPDATE_PREVIEW, steps: [{ ...NOVEMBER_UPDATE_PREVIEW.steps[0], target: " " }] })).toBe(false);
  });
});
