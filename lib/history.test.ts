import { describe, expect, it } from "vitest";
import { activeFilterSummary, filterHistory, groupHistory, historyDay, historyName, recapStatus, type HistoryItem } from "./history";
const row = (id: string, startedAt: string, extra: Partial<HistoryItem> = {}): HistoryItem => ({ id, startedAt, endedAt: startedAt, routineName: "Lower 1", source: "app", workingSets: 18, recapReady: true, ...extra });
const rows = [row("a", "2026-11-02T00:00:00+05:30"), row("b", "2026-11-01T20:00:00Z"), row("c", "2026-10-31T07:00:00Z"), row("d", "2026-10-20T07:00:00Z")];
describe("History timeline", () => {
  it("groups Monday boundaries in the viewer timezone, newest first", () => {
    const groups = groupHistory(rows, "2026-11-03T12:00:00Z", "Asia/Kolkata");
    expect(groups.map(g => g.label)).toEqual(["This week", "Last week", "October 2026"]);
    expect(groups[0].rows.map(w => w.id)).toEqual(["b", "a"]);
    expect(historyDay(rows[0].startedAt, "UTC")).toBe("2026-11-01");
  });
  it("handles year changes and DST without assuming seven 24-hour local days", () => {
    expect(groupHistory([row("a", "2025-12-31T12:00:00Z")], "2026-01-02T12:00:00Z", "America/New_York")[0].label).toBe("This week");
    expect(groupHistory([row("a", "2026-11-01T23:00:00-05:00")], "2026-11-02T12:00:00Z", "America/New_York")[0].label).toBe("Last week");
  });
  it("combines trimmed name, inclusive local dates and source filters", () => {
    const data = [...rows, row("import", rows[0].startedAt, {source:"sheet_import"}), row("base", rows[0].startedAt, {source:"baseline"})];
    expect(filterHistory(data, {search:" LOWER ",source:"app",from:"2026-11-02",to:"2026-11-02"}, "Asia/Kolkata").map(w=>w.id)).toEqual(["a","b"]);
    expect(filterHistory(data, {search:"starting",source:"baseline",from:"",to:""}, "Asia/Kolkata").map(w=>w.id)).toEqual(["base"]);
    expect(historyName(row("x", rows[0].startedAt, {routineName:null}))).toBe("Workout");
    expect(filterHistory(data, {search:"missing",source:"all",from:"",to:""}, "UTC")).toEqual([]);
  });
});

describe("History recap status", () => {
  const now = Date.parse("2026-11-04T12:00:00Z");
  it("uses one set of labels", () => {
    expect(recapStatus({ source: "app", recapReady: true, endedAt: "2026-11-01T10:00:00Z" }, now)).toBe("ready");
    expect(recapStatus({ source: "app", recapReady: false, endedAt: "2026-11-04T11:55:00Z" }, now)).toBe("pending");
    expect(recapStatus({ source: "app", recapReady: false, endedAt: "2026-11-04T11:00:00Z" }, now)).toBe("none");
  });
  it("shows nothing when the status is unknown or not a logged workout", () => {
    expect(recapStatus({ source: "app", recapReady: null, endedAt: "2026-11-04T11:55:00Z" }, now)).toBeNull();
    expect(recapStatus({ source: "baseline", recapReady: false, endedAt: "2026-11-04T11:55:00Z" }, now)).toBeNull();
  });
});

describe("History active filters", () => {
  it("names each filter in use", () => {
    expect(activeFilterSummary({ search: " push ", source: "sheet_import", from: "2026-11-01", to: "2026-11-04" })).toEqual(['"push"', "Imported workouts", "1 Nov to 4 Nov"]);
    expect(activeFilterSummary({ search: "", source: "all", from: "2026-10-01", to: "" })).toEqual(["From 1 Oct"]);
    expect(activeFilterSummary({ search: "", source: "all", from: "", to: "" })).toEqual([]);
  });
});
