"use client";
import { useState } from "react";
import { MappingDialog } from "@/components/anatomy/mapping-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseRestDuration } from "@/lib/rest-duration";
import { MASK } from "@/lib/mask";
const PRESETS = [30, 45, 60, 90, 120, 180, 240, 300];
const label = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
export function RestTimerSheet({
  exerciseName,
  seconds,
  description,
  onSave,
  onClose,
}: {
  exerciseName: string;
  seconds: number;
  description: string;
  onSave: (seconds: number) => Promise<void>;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState(!PRESETS.includes(seconds)),
    [minutes, setMinutes] = useState(String(Math.floor(seconds / 60))),
    [secs, setSecs] = useState(String(seconds % 60)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const parsed = parseRestDuration(minutes, secs);
  async function save(value: number) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onSave(value);
      onClose();
    } catch {
      setError("Could not save the rest timer. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <MappingDialog title="Rest timer" disabled={busy} onDismiss={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border bg-popover p-5"
      >
        <h2 className="text-lg font-semibold">Rest timer</h2>
        <p className={`mt-1 break-words text-sm text-muted-foreground ${MASK}`}>
          {exerciseName}
        </p>
        <p
          className={`mt-2 text-xs leading-relaxed text-muted-foreground ${MASK}`}
        >
          {description}
        </p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {PRESETS.map((value) => (
            <Button
              key={value}
              aria-label={`Rest ${label(value)}`}
              aria-pressed={seconds === value}
              variant={seconds === value ? "default" : "secondary"}
              disabled={busy}
              onClick={() => void save(value)}
            >
              {label(value)}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          className="mt-2 w-full"
          disabled={busy}
          aria-expanded={custom}
          onClick={() => setCustom(!custom)}
        >
          Custom duration
        </Button>
        {custom && (
          <form
            className="mt-2 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (parsed !== null) void save(parsed);
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                Minutes
                <Input
                  disabled={busy}
                  inputMode="numeric"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  aria-invalid={parsed === null}
                />
              </label>
              <label className="text-sm">
                Seconds
                <Input
                  disabled={busy}
                  inputMode="numeric"
                  value={secs}
                  onChange={(e) => setSecs(e.target.value)}
                  aria-invalid={parsed === null}
                />
              </label>
            </div>
            {parsed === null && (
              <p role="alert" className="text-xs text-destructive">
                Use whole minutes and 0–59 seconds, up to 60 minutes total.
              </p>
            )}
            <Button
              className="w-full"
              disabled={busy || parsed === null}
              type="submit"
            >
              {busy ? "Saving…" : "Save rest timer"}
            </Button>
          </form>
        )}
        {busy && (
          <p role="status" className="mt-2 text-xs text-muted-foreground">
            Saving rest timer…
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          variant="ghost"
          className="mt-2 w-full"
          disabled={busy}
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </MappingDialog>
  );
}
