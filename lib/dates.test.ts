import { expect,it } from "vitest";
import { calendarDateLabel } from "./dates";
it.each(["America/Los_Angeles","Asia/Kolkata","UTC"])("retains the stored measurement date in %s",zone=>{const previous=process.env.TZ;try{process.env.TZ=zone;expect(calendarDateLabel("2026-11-02")).toBe("2 Nov 2026");expect(calendarDateLabel("")).toBe("Choose a date");}finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}});
