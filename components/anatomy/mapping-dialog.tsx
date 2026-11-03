"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** A bottom sheet in a modal dialog; tapping outside or Escape closes it unless disabled. */
export function MappingDialog({ title, disabled, onDismiss, children }: { title: string; disabled: boolean; onDismiss: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} aria-label={title} className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0 text-foreground backdrop:bg-background/80" onCancel={(event) => { event.preventDefault(); if (!disabled) onDismiss(); }}>
    <div className="flex h-full items-end" onClick={() => !disabled && onDismiss()}>{children}</div>
  </dialog>;
}
