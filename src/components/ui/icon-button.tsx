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
        variant === "ghost" &&
          "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100",
        variant === "danger" &&
          "hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400",
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
