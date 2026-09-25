"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** Submit button that shows a pending label while its form's action runs. */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? (pendingLabel ?? "Working…") : children}
    </Button>
  );
}
