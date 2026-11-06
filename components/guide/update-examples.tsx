"use client";
import { PlanDraftEditor } from "@/components/plan/plan-draft-editor";
import { buildTemplate } from "@/lib/templates";
import { DEMO_ROUTINES } from "@/lib/demo";

/** Read-only examples: no account forms, AI calls or preference writes. */
export function UpdateExamples({ kind }: { kind: "plans" | "settings" }) {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-5">
      <p className="mb-3 text-xs text-muted-foreground">
        Read-only examples · no saving or AI requests
      </p>
      {kind === "plans" ? (
        <>
          <h2 className="mb-3 text-xl font-semibold">Review a sample plan</h2>
          <fieldset disabled className="min-w-0">
            <PlanDraftEditor
              days={buildTemplate("upper_lower", 4)}
              onChange={() => {}}
              catalog={DEMO_ROUTINES.flatMap((day) =>
                day.exercises.map((item) => item.exercise),
              )}
            />
          </fieldset>
          <section className="mt-4 rounded-2xl border bg-card p-4">
            <h3 className="font-semibold">Exercise settings stay visible</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Previous records, sets and rest, exercise details, alternates and
              tracking are grouped in one scroll. Save stays at the bottom.
            </p>
          </section>
        </>
      ) : (
        <>
          <h2 className="mb-3 text-xl font-semibold">Settings at a glance</h2>
          <div className="space-y-3">
            {[
              [
                "Account and details",
                "Edit optional details, with Cancel to return without saving.",
              ],
              [
                "Training preferences",
                "One metric or imperial choice for weights and measurements. Change rest on an exercise.",
              ],
              [
                "Measurements and reminders",
                "Optional check-ins, trends and monthly reminders.",
              ],
              [
                "Appearance",
                "Light, dark or beige, with your chosen accent. Appearance is optional during onboarding.",
              ],
              [
                "App and installation",
                "Version and update timing, an Updating indicator, and installation instructions.",
              ],
              [
                "Help and feedback",
                "FAQ, feedback, update tours, tour replay and legal links.",
              ],
            ].map(([title, body]) => (
              <section key={title} className="rounded-2xl border bg-card p-4">
                <h3 className="font-medium">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
