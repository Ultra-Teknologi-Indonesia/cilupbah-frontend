"use client";

import * as React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MaximizeIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface PreviewToolbarProps {
  pageNumber: number;
  numPages: number;
  scale: number;
  onPageChange: (n: number) => void;
  onScaleChange: (s: number) => void;
  onFit: () => void;
  onSearch?: () => void;
  searchDisabled?: boolean;
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

function clampScale(s: number) {
  return Math.min(3, Math.max(0.25, s));
}

export function PreviewToolbar({
  pageNumber,
  numPages,
  scale,
  onPageChange,
  onScaleChange,
  onFit,
  onSearch,
  searchDisabled = false,
}: PreviewToolbarProps) {
  const canPrev = pageNumber > 1;
  const canNext = pageNumber < numPages;
  const pageInputRef = React.useRef<HTMLInputElement>(null);

  const handleInputSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInputRef.current?.value ?? "", 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= numPages) {
      onPageChange(parsed);
    } else if (pageInputRef.current) {
      pageInputRef.current.value = String(pageNumber);
    }
  };

  const zoomOut = () => {
    const below = [...ZOOM_STEPS].reverse().find((z) => z < scale - 0.001);
    onScaleChange(clampScale(below ?? scale - 0.25));
  };
  const zoomIn = () => {
    const above = ZOOM_STEPS.find((z) => z > scale + 0.001);
    onScaleChange(clampScale(above ?? scale + 0.25));
  };

  return (
    <div
      className={cn(
        "sticky top-[64px] z-30 flex flex-wrap items-center justify-center gap-3 border-b border-border/60",
        "bg-background/80 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      )}
    >
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!canPrev}
          onClick={() => onPageChange(pageNumber - 1)}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <form
          onSubmit={handleInputSubmit}
          className="flex items-center gap-1 text-xs font-medium tabular-nums text-muted-foreground"
        >
          <span>Hal.</span>
          <input
            key={pageNumber}
            ref={pageInputRef}
            type="number"
            min={1}
            max={numPages || 1}
            defaultValue={pageNumber}
            onBlur={handleInputSubmit}
            aria-label="Nomor Halaman"
            className="h-6 w-11 rounded border border-input bg-background/90 px-1 text-center text-xs font-semibold tabular-nums text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span>/ {numPages || "—"}</span>
        </form>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!canNext}
          onClick={() => onPageChange(pageNumber + 1)}
          aria-label="Halaman berikutnya"
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>

      <div className="hidden h-5 w-px bg-border sm:block" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={zoomOut}
          aria-label="Perkecil"
          disabled={scale <= 0.25}
        >
          <MinusIcon className="size-4" />
        </Button>
        <div className="min-w-[52px] text-center text-xs font-medium tabular-nums text-muted-foreground">
          {Math.round(scale * 100)}%
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={zoomIn}
          aria-label="Perbesar"
          disabled={scale >= 3}
        >
          <PlusIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onFit}
          aria-label="Pas ke layar"
        >
          <MaximizeIcon className="size-3.5" />
          Fit
        </Button>
      </div>

      {onSearch && (
        <>
          <div className="hidden h-5 w-px bg-border sm:block" />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onSearch}
            disabled={searchDisabled}
          >
            <SearchIcon className="size-4" />
            <span className="hidden sm:inline">Cari</span>
          </Button>
        </>
      )}
    </div>
  );
}
