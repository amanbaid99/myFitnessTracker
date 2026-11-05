"use client";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
  type CSSProperties,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NOVEMBER_UPDATE_PREVIEW,
  UPDATE_TOURS,
  tourIndex,
  updateTourHref,
} from "@/lib/update-tours";
import { track } from "@/lib/analytics";

/** Only explicit tour URLs enable this frame. All tour destinations use sample data. */
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
  const heading = useRef<HTMLHeadingElement>(null),
    footer = useRef<HTMLElement>(null);
  const [footerHeight, setFooterHeight] = useState(160);
  const [pending, startNavigation] = useTransition();
  useEffect(() => {
    if (!tour) return;
    const expected = new URL(
      updateTourHref(tour, index, preview),
      window.location.origin,
    );
    if (pathname !== expected.pathname) {
      router.replace(expected.pathname + expected.search);
      return;
    }
    heading.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [tour, index, pathname, router, preview]);
  useEffect(() => {
    const node = footer.current;
    if (!node || !tour) return;
    const observer = new ResizeObserver(() =>
      setFooterHeight(Math.ceil(node.getBoundingClientRect().height)),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [tour]);
  if (!tour || !step) return children;
  function go(next: number) {
    startNavigation(() => router.push(updateTourHref(tour!, next, preview)));
  }
  function finish(completed: boolean) {
    if (!preview)
      track("guide_tour_ended", { kind: "update", batch: tour!.id, completed });
    startNavigation(() => router.push(preview ? "/demo" : "/"));
  }
  return (
    <div
      style={
        {
          paddingBottom: footerHeight + 16,
          "--update-tour-footer": `${footerHeight}px`,
        } as CSSProperties
      }
    >
      <section
        aria-label="Update tour"
        className="mx-auto max-w-lg border-b bg-card px-4 py-4"
      >
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            Update tour · {index + 1} of {tour.steps.length}
          </span>
          <span>Sample data</span>
          {preview && (
            <span className="rounded-full bg-accent px-2 py-1 text-primary">
              Draft preview
            </span>
          )}
        </p>
        <h1
          ref={heading}
          tabIndex={-1}
          className="mt-2 break-words text-xl font-semibold tracking-tight outline-none"
        >
          {step.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed">{step.body}</p>
      </section>
      <div key={`${tour.id}:${index}`}>{children}</div>
      <section className="mx-auto w-full max-w-lg px-4 py-3">
        <details className="group mt-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-medium">
            Included changes
            <ChevronDown
              className="size-4 shrink-0 group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            {step.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </details>
      </section>
      <nav
        ref={footer}
        className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t bg-popover px-4 pt-3 pb-[calc(.75rem+env(safe-area-inset-bottom))]"
        aria-label="Tour navigation"
      >
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            className="h-auto min-h-11 whitespace-normal py-2"
            disabled={index === 0 || pending}
            onClick={() => go(index - 1)}
          >
            Previous
          </Button>
          <Button
            className="h-auto min-h-11 whitespace-normal py-2"
            disabled={pending}
            onClick={() =>
              index + 1 < tour.steps.length ? go(index + 1) : finish(true)
            }
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading…
              </>
            ) : index + 1 === tour.steps.length ? (
              "Finish tour"
            ) : (
              "Next"
            )}
          </Button>
        </div>
        <Button
          variant="ghost"
          className="mt-1 h-auto min-h-11 w-full whitespace-normal py-2"
          disabled={pending}
          onClick={() => finish(false)}
        >
          Skip tour
        </Button>
      </nav>
    </div>
  );
}
