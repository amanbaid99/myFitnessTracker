"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Exercise } from "@/lib/data";
import { EQUIPMENT } from "@/lib/muscles";

export interface ExercisePick {
  exerciseId: string | null;
  name: string;
  equipment: string;
}

/** Search the exercise library, or type a new exercise. Used to add or swap. */
export function AddExercise({
  library,
  existingIds,
  onAdd,
  onCancel,
}: {
  library: Exercise[];
  existingIds: string[];
  onAdd: (pick: ExercisePick) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [equipment, setEquipment] = useState<string>("machine");
  const q = query.trim().toLowerCase();
  const matches = library
    .filter((e) => !existingIds.includes(e.id) && (!q || e.name.toLowerCase().includes(q)))
    .slice(0, 6);
  const exact = library.find((e) => e.name.toLowerCase() === q);

  return (
    <div className="space-y-2 p-2">
      <Input autoFocus placeholder="Search or type a new exercise" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul className="divide-y rounded-xl border">
        {matches.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between px-3 text-left text-sm active:bg-muted"
              onClick={() => onAdd({ exerciseId: e.id, name: e.name, equipment: e.equipment })}
            >
              <span>{e.name}</span>
              <span className="text-xs text-muted-foreground">{e.equipment}</span>
            </button>
          </li>
        ))}
        {q && !exact && (
          <li className="space-y-2 p-3">
            <p className="text-sm">
              New exercise: <span className="font-medium">{query.trim()}</span>
            </p>
            <select
              aria-label="Equipment"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="h-11 w-full rounded-xl border bg-card px-3 text-base capitalize"
            >
              {EQUIPMENT.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
            <Button className="w-full" onClick={() => onAdd({ exerciseId: null, name: query.trim(), equipment })}>
              <Plus /> Add new exercise
            </Button>
          </li>
        )}
      </ul>
      <Button variant="ghost" className="w-full" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
