"use client";

import * as React from "react";
import {
  FilterIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FilterToolbar({
  search,
  onSearchChange,
  onSearch,
  searchPlaceholder = "Cari…",
  onReset,
  hasFilter,
  activeCount = 0,
  align = "start",
  leading,
  trailing,
  onRefresh,
  isRefreshing = false,
  gridCols = 3,
  sortControl,
  children,
  className,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  onSearch?: (value?: string) => void;
  searchPlaceholder?: string;
  onReset?: () => void;
  hasFilter?: boolean;
  activeCount?: number;
  align?: "start" | "end";
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  gridCols?: 1 | 2 | 3 | 4;
  sortControl?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const hasChildren = React.Children.count(children) > 0;
  const filterCount = activeCount > 0 ? activeCount : undefined;

  return (
    <div className={cn("border-b border-border/40", className)}>
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 sm:px-5">
        {leading}
        {align === "end" && <div className="flex-1" />}
        {onSearchChange != null && (
          <div
            className={cn(
              "relative",
              align === "end"
                ? "min-w-[220px]"
                : "w-full sm:w-auto sm:min-w-[200px]",
            )}
          >
            {isRefreshing ? (
              <Loader2Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />
            ) : (
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            )}
            <Input
              value={search ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (onSearch || onRefresh)) {
                  e.preventDefault();
                  if (onSearch) onSearch();
                  else onRefresh?.();
                }
              }}
              placeholder={searchPlaceholder}
              className="h-9 rounded-full bg-background pl-9 pr-8 transition-colors focus:border-primary"
            />
            {(search?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange("");
                  onSearch?.("");
                }}
                aria-label="Bersihkan pencarian"
                className="absolute right-2.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>
        )}

        {onSearch && (
          <Button
            type="button"
            size="sm"
            onClick={() => onSearch()}
            disabled={isRefreshing}
            className="h-9 gap-1.5 rounded-full"
          >
            <SearchIcon className="size-4" />
            Cari
          </Button>
        )}

        {onRefresh && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Muat ulang data"
            title="Muat ulang data"
            className="h-9 w-9 shrink-0 rounded-full p-0"
          >
            <RefreshCwIcon
              className={cn("size-4", isRefreshing && "animate-spin")}
            />
          </Button>
        )}

        {hasChildren && (
          <Button
            variant={open ? "secondary" : "outline"}
            size="sm"
            className={cn(
              "h-9 gap-2 rounded-full transition-colors",
              open && "bg-primary/10 text-primary hover:bg-primary/15",
              !open && filterCount && "border-primary/40 text-primary",
            )}
            onClick={() => setOpen(!open)}
          >
            <FilterIcon className="size-4" />
            Filter
            {filterCount && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-2xs font-semibold text-primary-foreground">
                {filterCount}
              </span>
            )}
          </Button>
        )}

        {sortControl}

        {hasFilter && onReset && (
          <button
            type="button"
            onClick={() => {
              onReset();
              setOpen(false);
            }}
            className="flex items-center gap-1 text-sm font-medium text-destructive transition-colors hover:text-destructive/80"
          >
            <XIcon className="size-3.5" />
            Reset
          </button>
        )}

        {trailing}
      </div>

      {hasChildren && (
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className="px-4 pb-4 pt-1 sm:px-5">
              <div
                className={cn(
                  "grid grid-cols-1 gap-x-4 gap-y-3",
                  gridCols === 2 && "sm:grid-cols-2",
                  gridCols === 3 && "sm:grid-cols-2 lg:grid-cols-3",
                  gridCols === 4 && "sm:grid-cols-2 lg:grid-cols-4",
                )}
              >
                {children}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
