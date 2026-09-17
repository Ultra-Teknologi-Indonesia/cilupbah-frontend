"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: "subtle" | "default" | "strong";
  radius?: number;
  showGlow?: boolean;
  showShadow?: boolean;
  reactive?: boolean;
}

const LiquidGlass = React.forwardRef<HTMLDivElement, LiquidGlassProps>(
  (
    {
      intensity: _intensity,
      radius = 16,
      showGlow: _showGlow,
      showShadow: _showShadow,
      reactive: _reactive,
      className,
      children,
      style,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border border-border bg-card text-card-foreground shadow-xs",
          className,
        )}
        style={{
          borderRadius: radius,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  },
);

LiquidGlass.displayName = "LiquidGlass";

export { LiquidGlass };
export type { LiquidGlassProps };
