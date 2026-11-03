import { describe, expect, it } from "vitest";
import { ATLAS_MUSCLES, ATLAS_URL, heatLink, MUSCLE_INFO, musclesLink, workoutMuscles, workoutWorkload, workoutBodyLink, rankedWorkload, workloadOrSets, topMusclesText } from "./anatomy";
import { MUSCLE_GROUPS } from "./muscles";

// Ids from the atlas's src/anatomy/muscles.js that the mapping uses.
const ATLAS_IDS = new Set([
  "pectoralis-major", "pectoralis-minor", "deltoid-anterior", "deltoid-lateral", "deltoid-posterior",
  "trapezius-upper", "trapezius-middle", "trapezius-lower", "rhomboid-major", "rhomboid-minor",
  "infraspinatus", "teres-minor", "teres-major", "latissimus-dorsi", "biceps-long", "biceps-short",
  "brachialis", "triceps-long", "triceps-lateral", "triceps-medial", "rectus-femoris", "vastus-lateralis",
  "vastus-medialis", "vastus-intermedius", "biceps-femoris-long", "biceps-femoris-short", "semitendinosus",
  "semimembranosus", "gluteus-maximus", "gluteus-medius", "gluteus-minimus", "tensor-fasciae-latae",
  "adductor-longus", "adductor-magnus", "gracilis", "pectineus", "gastrocnemius-medial",
  "gastrocnemius-lateral", "soleus", "rectus-abdominis", "external-oblique", "internal-oblique",
]);

describe("anatomy mapping", () => {
  it("covers every muscle group with known atlas muscles and a description", () => {
    for (const g of MUSCLE_GROUPS) {
      expect(ATLAS_MUSCLES[g].length).toBeGreaterThan(0);
      for (const id of ATLAS_MUSCLES[g]) expect(ATLAS_IDS.has(id)).toBe(true);
      expect(MUSCLE_INFO[g]).not.toMatch(/—/);
    }
  });
});

describe("musclesLink", () => {
  it("puts the main muscle first and skips unknown groups", () => {
    const url = musclesLink(["lats", "biceps", "made up"], "dark")!;
    expect(url.startsWith(`${ATLAS_URL}?muscles=latissimus-dorsi,biceps-long,biceps-short,brachialis`)).toBe(true);
    expect(url).toContain("theme=dark");
    expect(url).toContain("embed=1");
    expect(musclesLink(["made up"], "light")).toBeNull();
  });
});

describe("heatLink", () => {
  it("scales sets to 0..1 with 10 sets fully hot and leaves untrained groups out", () => {
    const url = heatLink({ chest: 12, lats: 5, quads: 0 }, "light")!;
    expect(url).toContain("pectoralis-major:1");
    expect(url).toContain("latissimus-dorsi:0.5");
    expect(url).not.toContain("vastus");
    expect(heatLink({ quads: 0 }, "light")).toBeNull();
  });
});

describe("workoutMuscles", () => {
  it("uses the session's SQL contributions and orders the biggest groups first", () => {
    expect(workoutMuscles([{ muscle: "triceps", sets: 1.5 }, { muscle: "chest", sets: 3 }, { muscle: "triceps", sets: 0.5 }])).toEqual([
      { muscle: "chest", sets: 3 }, { muscle: "triceps", sets: 2 },
    ]);
  });
  it("ignores missing, unknown or invalid group data rather than inventing muscles", () => {
    expect(workoutMuscles([{ muscle: "unknown", sets: 3 }, { muscle: "toString", sets: 2 }, { muscle: "chest", sets: 0 }, { muscle: "lats", sets: NaN }, { muscle: "quads", sets: -1 }])).toEqual([]);
    expect(workoutMuscles([])).toEqual([]);
  });
  it("highlights only the trained session groups in the atlas", () => {
    const groups = workoutMuscles([{ muscle: "lats", sets: 2 }, { muscle: "biceps", sets: 1 }]);
    const url = musclesLink(groups.map((r) => r.muscle), "light")!;
    expect(url).toContain("latissimus-dorsi");
    expect(url).toContain("biceps-long");
    expect(url).not.toContain("pectoralis");
    expect(url).not.toContain("vastus");
  });
});

describe("workout workload shading", () => {
  const ex = [{ id: "chest", muscleGroups: ["chest", "triceps"] }, { id: "glutes", muscleGroups: ["glutes"] }];
  const set = (exerciseId: string, reps: number | null, durationSec: number | null = null) => ({ exerciseId, reps, durationSec, setType: "working" });
  it("makes two chest sets lighter than eight glute sets, against the most worked muscle", () => {
    const work = workoutWorkload([...Array.from({length:2},()=>set("chest",10)),...Array.from({length:8},()=>set("glutes",12))],ex);
    expect(work.chest).toBe(2);
    expect(work.triceps).toBe(1);
    expect(work.glutes).toBeCloseTo(9.6);
    const url = new URL(workoutBodyLink(work,"dark"));
    expect(url.searchParams.get("heat")).toContain("pectoralis-major:0.21");
    expect(url.searchParams.get("heat")).toContain("gluteus-maximus:1");
    expect(url.searchParams.get("view")).toBe("back");
  });
  it("excludes warmups and deleted sets, and keeps unmapped work out", () => {
    const work = workoutWorkload([{...set("chest",100),setType:"warmup"},{...set("chest",50),deletedAt:"now"},set("unknown",100)],ex);
    expect(work).toEqual({});
    expect(new URL(workoutBodyLink(work,"light")).searchParams.has("heat")).toBe(false);
  });
  it("supports timed holds and shades the atlas against the top muscle without weight assumptions", () => {
    const work = workoutWorkload([set("chest",null,60),set("glutes",120)],ex);
    expect(work.chest).toBe(2);
    const heat = new URL(workoutBodyLink(work,"dark")).searchParams.get("heat");
    expect(heat).toContain("gluteus-maximus:1");
    expect(heat).toContain("pectoralis-major:0.17");
  });
});

describe("ranked workload", () => {
  it("puts the most worked muscle first with the full share and drops invalid values", () => {
    expect(rankedWorkload({ quads: 8, glutes: 4, calves: 0, biceps: NaN, wings: 9, hamstrings: 4 })).toEqual([
      { muscle: "quads", units: 8, share: 1 },
      { muscle: "glutes", units: 4, share: 0.5 },
      { muscle: "hamstrings", units: 4, share: 0.5 },
    ]);
    expect(rankedWorkload({})).toEqual([]);
  });
  it("names the top three in plain English", () => {
    expect(topMusclesText({ quads: 8, glutes: 4, hamstrings: 5, calves: 1 })).toBe("Quads, hamstrings and glutes");
    expect(topMusclesText({ chest: 3, triceps: 2 })).toBe("Chest and triceps");
    expect(topMusclesText({ lats: 1 })).toBe("Lats");
    expect(topMusclesText({})).toBe("");
  });
  it("falls back to set totals when there is no workload", () => {
    expect(workloadOrSets([{ muscle: "chest", sets: 3 }, { muscle: "chest", sets: 2 }])).toEqual({ chest: 5 });
    expect(workloadOrSets([{ muscle: "chest", sets: 3 }], { quads: 1 })).toEqual({ quads: 1 });
  });
});
