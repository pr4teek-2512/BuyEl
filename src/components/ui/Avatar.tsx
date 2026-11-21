import { cn } from "@/lib/cn";

/**
 * Anonymous identity badge. The PRD allows only the two initials of the other
 * party, never their name or any other detail.
 */
export function Avatar({
  initials,
  size = "md",
  className,
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "size-8 text-xs",
    md: "size-10 text-sm",
    lg: "size-12 text-base",
  } as const;

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand",
        sizes[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}
