"use client";

import {
  Toaster as Sonner,
  toast,
  type ToasterProps,
  type ExternalToast,
} from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-center"
      closeButton
      icons={{
        success: (
          <CircleCheckIcon className="size-5 text-emerald-600 dark:text-emerald-400" />
        ),
        info: <InfoIcon className="size-5 text-primary" />,
        warning: (
          <TriangleAlertIcon className="size-5 text-amber-600 dark:text-amber-400" />
        ),
        error: <OctagonXIcon className="size-5 text-destructive" />,
        loading: (
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "transparent",
          "--border-radius": "var(--radius-xl)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast !grid !grid-cols-[auto_minmax(0,1fr)_auto] !items-start !gap-x-3 !gap-y-3 p-5 w-[400px] max-w-[90vw] shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10 backdrop-blur-xl backdrop-saturate-150",
          title: "text-base font-semibold",
          description: "text-sm opacity-90",
          icon: "flex items-center",
          content: "gap-0.5",
          actionButton:
            "!col-start-2 !col-end-4 !justify-self-start bg-primary! text-primary-foreground! rounded-full! px-3! text-xs! font-medium!",
          cancelButton:
            "!col-start-2 !col-end-4 !justify-self-start bg-muted! text-muted-foreground! rounded-full! px-3! text-xs! font-medium! hover:bg-muted/70!",
          closeButton:
            "bg-background/80! text-foreground! border-border! backdrop-blur! hover:bg-muted!",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
export type { ExternalToast };
