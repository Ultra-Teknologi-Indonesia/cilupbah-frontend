"use client";

import { CalendarIcon, ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const PERIOD_OPTIONS = [
  { value: "7", label: "7 hari" },
  { value: "30", label: "30 hari" },
  { value: "90", label: "90 hari" },
] as const;

export type PeriodValue = (typeof PERIOD_OPTIONS)[number]["value"];

interface DashboardControlsProps {
  period: PeriodValue;
  onPeriodChange: (value: PeriodValue) => void;
}

export function DashboardControls({
  period,
  onPeriodChange,
}: DashboardControlsProps) {
  const periodLabel =
    PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? "30 hari";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <CalendarIcon className="size-4 text-muted-foreground" />
            {periodLabel}
            <ChevronDownIcon className="size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuLabel>Periode</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={period}
            onValueChange={(v) => onPeriodChange(v as PeriodValue)}
          >
            {PERIOD_OPTIONS.map((opt) => (
              <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                {opt.label} terakhir
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

    </div>
  );
}
