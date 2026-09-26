/**
 * Short beeps for the rest timer, made with Web Audio (no sound files).
 * Browsers only allow sound after a tap, so the first tick of a set
 * unlocks it; later beeps (rest over) then play without a tap. Nothing
 * plays while the phone is locked or the app is in the background, and
 * iPhones in silent mode stay silent.
 */

export const SOUND_KEY = "wt-sound-off";

/** One tone: pitch in Hz, start offset and length in ms. */
export interface Tone {
  hz: number;
  at: number;
  ms: number;
}

export const REST_START: Tone[] = [{ hz: 880, at: 0, ms: 120 }];
export const REST_END: Tone[] = [
  { hz: 1320, at: 0, ms: 150 },
  { hz: 1320, at: 250, ms: 150 },
];

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  // Resuming inside a tap is what unlocks audio on iOS.
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function soundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "1";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    if (on) localStorage.removeItem(SOUND_KEY);
    else localStorage.setItem(SOUND_KEY, "1");
  } catch {
    // Storage unavailable: the choice lasts for this page only.
  }
}

export function beep(tones: Tone[]) {
  if (!soundOn()) return;
  const ac = context();
  if (!ac) return;
  const start = ac.currentTime + 0.01;
  for (const t of tones) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const from = start + t.at / 1000;
    const to = from + t.ms / 1000;
    osc.type = "sine";
    osc.frequency.value = t.hz;
    // Quick fade in and out so it does not click.
    gain.gain.setValueAtTime(0, from);
    gain.gain.linearRampToValueAtTime(0.25, from + 0.01);
    gain.gain.linearRampToValueAtTime(0, to);
    osc.connect(gain).connect(ac.destination);
    osc.start(from);
    osc.stop(to + 0.02);
  }
}
