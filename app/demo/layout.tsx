import { Suspense } from "react";
import { UpdateTourFrame } from "@/components/guide/update-tour-frame";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={children}><UpdateTourFrame>{children}</UpdateTourFrame></Suspense>;
}
