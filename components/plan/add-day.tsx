"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddDayForm({
  name: initialName,
  onAdd,
}: {
  name: string;
  onAdd: (name: string, optional: boolean) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false),
    [name, setName] = useState(initialName),
    [optional, setOptional] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState<string | null>(null);
  if (!open)
    return (
      <Button
        variant="outline"
        size="lg"
        className="mt-5 w-full"
        onClick={() => {
          setName(initialName);
          setOptional(false);
          setError(null);
          setOpen(true);
        }}
      >
        <Plus />
        Add a day
      </Button>
    );
  return (
    <form
      aria-label="Add a day"
      className="mt-5 space-y-3 rounded-2xl border bg-card p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
          const message = await onAdd(name, optional);
          setError(message);
          if (!message) setOpen(false);
        } catch {
          setError("Could not add the day. Your entries are kept. Try again.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <h2 className="font-semibold">Add a day</h2>
      <label className="block text-sm">
        Day name
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={saving}
          required
          maxLength={80}
          autoFocus
        />
      </label>
      <label className="flex min-h-11 items-start gap-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={optional}
          onChange={(e) => setOptional(e.target.checked)}
          disabled={saving}
          className="mt-1 size-5 shrink-0 accent-[var(--primary)]"
        />
        <span>
          <span className="block font-medium">Optional day</span>
          <span className="block text-xs text-muted-foreground">
            For extras such as bodyweight or cardio. Start manually without
            changing your next regular workout.
          </span>
        </span>
      </label>
      <p className="text-xs text-muted-foreground">
        {optional
          ? "This day stays out of your rotation. Your weekly goal stays the same."
          : "This day joins your regular rotation."}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={saving}>
        {saving ? "Adding…" : "Add day"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={saving}
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
    </form>
  );
}
