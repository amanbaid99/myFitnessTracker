import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
describe("app update action", () => {
  it("allows the loading cue to paint before reloading and ignores repeated taps", async () => {
    const frames: FrameRequestCallback[] = [];
    const reload = vi.fn();
    vi.stubGlobal("window", {requestAnimationFrame: (fn: FrameRequestCallback) => frames.push(fn),location:{reload}});
    const {applyUpdate} = await import("./use-app-update");
    applyUpdate();applyUpdate();expect(frames).toHaveLength(1);expect(reload).not.toHaveBeenCalled();
    frames.shift()!(0);expect(reload).not.toHaveBeenCalled();expect(frames).toHaveLength(1);
    frames.shift()!(16);expect(reload).toHaveBeenCalledTimes(1);
    applyUpdate();expect(reload).toHaveBeenCalledTimes(1);expect(frames).toHaveLength(0);
  });
  it("allows retry if the browser rejects the reload", async () => {
    const frames: FrameRequestCallback[] = [];
    const reload = vi.fn().mockImplementationOnce(() => {throw new Error("blocked");});
    vi.stubGlobal("window", {requestAnimationFrame:(fn: FrameRequestCallback)=>frames.push(fn),location:{reload}});
    const {applyUpdate} = await import("./use-app-update");
    applyUpdate();frames.shift()!(0);frames.shift()!(16);
    applyUpdate();frames.shift()!(32);frames.shift()!(48);expect(reload).toHaveBeenCalledTimes(2);
  });
});
