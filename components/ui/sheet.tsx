"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

/** Native modal focus trapping, Escape and focus restoration for short editors. */
export function Sheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={dialog} aria-labelledby={heading} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }} className="fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border bg-card p-5 text-foreground shadow-xl backdrop:bg-black/60">
    <div className="mb-4 flex items-start gap-3"><h2 id={heading} className="min-w-0 flex-1 break-words text-xl font-semibold">{title}</h2><Button size="icon" variant="ghost" className="h-[44px] w-[44px] shrink-0" aria-label="Close" onClick={onClose}><X /></Button></div>
    {children}
  </dialog>;
}
