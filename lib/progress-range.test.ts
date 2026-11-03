import { describe, expect, it } from "vitest";
import { sessionsInRange, sessionChange } from "./progress-range";
const now = new Date(2026,10,3,12);
describe("Progress comparison periods",()=>{
  it("keeps session order, includes the boundary day and excludes future/invalid sessions",()=>{
    const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-28);
    const rows=[{startedAt:now.toISOString(),e1rmKg:70},{startedAt:start.toISOString(),e1rmKg:60},{startedAt:new Date(start.getTime()-1).toISOString(),e1rmKg:50},{startedAt:new Date(now.getTime()+1).toISOString(),e1rmKg:80},{startedAt:"invalid",e1rmKg:100}];
    const result=sessionsInRange(rows,"4",now);expect(result.map(r=>r.e1rmKg)).toEqual([60,70]);expect(sessionChange(result)).toBe(10);expect(rows[0].e1rmKg).toBe(70);
    expect(sessionsInRange(rows,"all",now).map(r=>r.e1rmKg)).toEqual([50,60,70]);
  });
  it("distinguishes a single session, steady and declining trends",()=>{
    expect(sessionChange([])).toBeNull();expect(sessionChange([{e1rmKg:20}])).toBeNull();expect(sessionChange([{e1rmKg:20},{e1rmKg:20}])).toBe(0);expect(sessionChange([{e1rmKg:30},{e1rmKg:25}])).toBe(-5);
  });
});
