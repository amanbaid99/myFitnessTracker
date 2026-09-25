import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "muted",
  ...props
}: React.ComponentProps<"span"> & { variant?: "muted" | "accent" | "outline" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap",
        variant === "muted" && "bg-secondary text-secondary-foreground",
        variant === "accent" && "bg-accent text-accent-foreground",
        variant === "outline" && "border text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
