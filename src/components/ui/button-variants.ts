import { cva } from "class-variance-authority"

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-all select-none disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-focus [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:   "bg-inverse text-fg-on-inverse hover:opacity-90",
        secondary: "border border-border-2 bg-surface text-fg-1 shadow-xs hover:border-border-emph",
        ghost:     "text-fg-2 hover:bg-sunken hover:text-fg-1",
        accent:    "bg-accent text-white hover:opacity-90",
      },
      size: {
        default: "h-8 rounded-md px-3 text-sm",
        sm:      "h-7 rounded-md px-2.5 text-[0.8rem]",
        lg:      "h-9 rounded-md px-4 text-sm",
        pill:    "h-8 rounded-pill px-4 text-sm",
        icon:    "size-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
