import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: "ghost" | "danger";
}

export function IconButton({
  icon,
  label,
  variant = "ghost",
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer",
        variant === "ghost" && "hover:bg-sunken text-fg-3 hover:text-fg-1",
        variant === "danger" &&
          "hover:bg-[var(--danger-soft)] text-fg-3 hover:text-[var(--danger)]",
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
