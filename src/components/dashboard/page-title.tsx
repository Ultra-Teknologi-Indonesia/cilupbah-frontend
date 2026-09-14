"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface BreadcrumbEntry {
  label: string;
  href?: string;
}

interface PageTitleProps {
  title: string;
  description?: string;
  breadcrumb?: BreadcrumbEntry[];
  actions?: React.ReactNode;
  backHref?: string;
  backMode?: "history" | "href";
  sticky?: boolean;
  className?: string;
}

let appNavigated = false;

if (typeof window !== "undefined") {
  const originalPushState = window.history.pushState;
  window.history.pushState = function (...args) {
    appNavigated = true;
    return originalPushState.apply(window.history, args);
  };
}

function canGoBack(): boolean {
  if (typeof window === "undefined") return false;
  if (appNavigated && window.history.length > 1) return true;
  if (
    typeof document !== "undefined" &&
    document.referrer &&
    document.referrer.startsWith(window.location.origin) &&
    window.history.length > 1
  ) {
    return true;
  }
  return false;
}

export function PageTitle({
  title,
  description,
  breadcrumb,
  actions,
  backHref,
  backMode = "history",
  sticky,
  className,
}: PageTitleProps) {
  const router = useRouter();

  const onBackClick = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        e.defaultPrevented ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.button === 1
      ) {
        return;
      }

      if (backMode === "history" && canGoBack()) {
        e.preventDefault();
        router.back();
      }
    },
    [backMode, router],
  );

  return (
    <div className={cn(sticky && "sticky top-0 z-30")}>
      {backHref && (
        <Link
          href={backHref}
          onClick={onBackClick}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Kembali
        </Link>
      )}

      <LiquidGlass
        radius={24}
        intensity="default"
        className={cn("bg-white/40 dark:bg-white/[0.06]", className)}
      >
        <div className="px-5 py-4 sm:px-6 sm:py-5">
          {breadcrumb && breadcrumb.length > 0 && (
            <Breadcrumb className="mb-1.5">
              <BreadcrumbList>
                {breadcrumb.map((item, i) => {
                  const isLast = i === breadcrumb.length - 1;
                  return (
                    <React.Fragment key={`${item.label}-${i}`}>
                      <BreadcrumbItem>
                        {item.href && !isLast ? (
                          <BreadcrumbLink asChild>
                            <Link href={item.href}>{item.label}</Link>
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage>{item.label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      {!isLast && <BreadcrumbSeparator />}
                    </React.Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight">
                {title}
              </h1>
              {description && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2">{actions}</div>
            )}
          </div>
        </div>
      </LiquidGlass>
    </div>
  );
}
