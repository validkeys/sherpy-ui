import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  "inline-flex h-5 shrink-0 items-center justify-center gap-1 rounded-pill border px-2 text-xs font-medium whitespace-nowrap transition-all [&>svg]:pointer-events-none [&>svg]:size-3 focus-visible:outline-none focus-visible:shadow-focus",
  {
    variants: {
      variant: {
        neutral: "",
        accent: "",
        success: "",
        warning: "",
        danger: "",
      },
      soft: {
        false: "",
        true: "",
      },
    },
    compoundVariants: [
      {
        variant: "neutral",
        soft: false,
        class: "border-transparent bg-inverse text-fg-on-inverse",
      },
      {
        variant: "neutral",
        soft: true,
        class: "border-border-1 bg-sunken text-fg-2",
      },
      {
        variant: "accent",
        soft: false,
        class: "border-transparent bg-accent text-white",
      },
      {
        variant: "accent",
        soft: true,
        class: "border-transparent bg-accent-soft text-accent",
      },
      {
        variant: "success",
        soft: false,
        class: "border-transparent bg-success text-white",
      },
      {
        variant: "success",
        soft: true,
        class: "border-transparent bg-success-soft text-success",
      },
      {
        variant: "warning",
        soft: false,
        class: "border-transparent bg-warning text-white",
      },
      {
        variant: "warning",
        soft: true,
        class: "border-transparent bg-warning-soft text-warning",
      },
      {
        variant: "danger",
        soft: false,
        class: "border-transparent bg-danger text-white",
      },
      {
        variant: "danger",
        soft: true,
        class: "border-transparent bg-danger-soft text-danger",
      },
    ],
    defaultVariants: {
      variant: "neutral",
      soft: true,
    },
  },
);
