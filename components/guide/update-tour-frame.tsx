"use client";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Spotlight } from "./guide-provider";
import {
  NOVEMBER_UPDATE_PREVIEW,
  UPDATE_TOURS,
  tourIndex,
  updateTourHref,
} from "@/lib/update-tours";
import { track } from "@/lib/analytics";

/**
 * Only explicit tour URLs enable this. The sample page stays as it is and
 * each step dims it and points at one element, like the intro tour.
 */
export function UpdateTourFrame({ children }: { children: ReactNode }) {
  const query = useSearchParams(),
    pathname = usePathname(),
    router = useRouter();
  const preview = query.get("tourPreview") === "1";
  const id = query.get("updateTour");
  const tour =
    UPDATE_TOURS.find((tour) => tour.id === id) ??
    (preview && id === NOVEMBER_UPDATE_PREVIEW.id
      ? NOVEMBER_UPDATE_PREVIEW
      : null);
  const index = tourIndex(query.get("tourStep"), tour?.steps.length ?? 0);
  const step = tour?.steps[index];
  const [pending, startNavigation] = useTransition();
  // Steps whose element could not be found point at the page heading instead.
  const [missing, setMissing] = useState<string | null>(null);
  const onPage = tour
    ? new URL(updateTourHref(tour, index, preview), "https://repd.invalid").pathname === pathname
    : false;
  useEffect(() => {
    if (!tour || onPage) return;
    router.replace(updateTourHref(tour, index, preview));
  }, [tour, index, onPage, router, preview]);
  if (!tour || !step) return children;
  const key = `${tour.id}:${index}`;
  function go(next: number) {
    startNavigation(() => router.push(updateTourHref(tour!, next, preview)));
  }
  function finish(completed: boolean) {
    if (!preview)
      track("guide_tour_ended", { kind: "update", batch: tour!.id, completed });
    startNavigation(() => router.push(preview ? "/demo" : "/"));
  }
  return (
    <>
      {children}
      {onPage && (
        <Spotlight
          key={`${key}:${missing === key ? "fallback" : "target"}`}
          step={{ target: `update-${index}`, title: step.title, body: step.body }}
          selector={missing === key ? "main h1, main h2, main" : step.target}
          label={preview ? "What's new · Preview" : "What's new"}
          index={index}
          total={tour.steps.length}
          busy={pending}
          onNext={() => (index + 1 < tour.steps.length ? go(index + 1) : finish(true))}
          onPrevious={() => go(Math.max(0, index - 1))}
          onSkip={() => finish(false)}
          onMissing={() => setMissing(key)}
        />
      )}
    </>
  );
}
