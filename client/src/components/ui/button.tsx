import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-transparent shadow-xs hover:bg-accent dark:bg-transparent dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        goldPlaque:
          "relative font-serif font-black uppercase tracking-wider text-[#241703] bg-gradient-to-b from-[#FFF2B2] via-[#E2BE58] via-[#C59B2E] to-[#8C6212] border border-[#5E420C] ring-1 ring-[#FFEAA3]/60 shadow-[0_4px_12px_rgba(0,0,0,0.85),0_1px_2px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.9),inset_0_-2px_2px_rgba(70,45,10,0.7)] hover:brightness-110 hover:shadow-[0_0_16px_rgba(229,193,117,0.65),0_4px_14px_rgba(0,0,0,0.9)] active:scale-[0.98] active:translate-y-[1px]",
        waypointPill:
          "font-serif font-bold tracking-wide rounded-2xl border border-[#E5C175] bg-gradient-to-b from-[#142B49] via-[#0E2038] to-[#081527] text-[#FFF4DD] shadow-[0_0_14px_rgba(229,193,117,0.35),inset_0_1px_1px_rgba(255,255,255,0.2),0_2px_6px_rgba(0,0,0,0.7)] hover:brightness-110 hover:shadow-[0_0_18px_rgba(229,193,117,0.5)] active:scale-[0.98]",
        waypointOutline:
          "font-serif font-medium tracking-wide rounded-2xl border border-[#23354E] hover:border-[#D4B886]/70 bg-[#061220]/90 hover:bg-[#0B1E34] text-[#D8CABA] hover:text-[#FFF4DD] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04),0_2px_4px_rgba(0,0,0,0.5)] active:scale-[0.98]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
