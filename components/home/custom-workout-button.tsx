"use client";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { customPayload, type CustomSource } from "@/lib/custom-workout";
import type { Exercise } from "@/lib/data";
const Sheet = dynamic(() =>
  import("@/components/custom-workout-sheet").then((m) => m.CustomWorkoutSheet),
);
export function CustomWorkoutButton({
  source,
  library,
}: {
  source: CustomSource;
  library: Exercise[];
}) {
  const [open, setOpen] = useState(false);
  const request = useRef<string | null>(null);
  const router = useRouter();
  return (
    <>
      <Button
        variant="ghost"
        className="mt-1 h-auto min-h-11 w-full whitespace-normal py-2 text-sm"
        onClick={() => {
          request.current = null;
          setOpen(true);
        }}
      >
        <Sparkles className="size-4 shrink-0" />
        Custom workout today
      </Button>
      {open && (
        <Sheet
          source={source}
          library={library}
          onClose={() => setOpen(false)}
          onSaved={() => router.refresh()}
          onUse={async (day, sourceRoutineId) => {
            if (!navigator.onLine)
              throw new Error(
                "Connect to start this custom workout. Your review is still here.",
              );
            request.current ??= crypto.randomUUID();
            const { data, error } = await createClient().rpc(
              "use_custom_workout",
              {
                p_workout: request.current,
                p_start: true,
                p_revision: 0,
                p_name: day.name,
                p_items: customPayload(day),
                p_source_routine: sourceRoutineId,
              },
            );
            if (error)
              throw new Error(
                error.message.includes("open workout")
                  ? "You have an open workout. Close this review and resume or discard it first."
                  : error.message.includes("different equipment")
                    ? error.message
                    : "Could not start the workout. Your review is still here. Try again.",
              );
            router.push(`/workout/${data}`);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
