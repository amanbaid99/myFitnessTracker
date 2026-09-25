import { BottomNav } from "@/components/bottom-nav";

/** Tabbed screens. The workout logger lives outside this group, full screen. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="mx-auto w-full max-w-lg px-4 pt-safe pb-[calc(3.5rem+env(safe-area-inset-bottom)+1.5rem)]">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
