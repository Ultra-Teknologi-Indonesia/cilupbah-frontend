"use client";

import * as React from "react";
import Image from "next/image";
import {
  CheckIcon,
  ChevronsUpDownIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { LookupOption } from "@/types/common";

export type ComboboxOption = LookupOption;

interface ComboboxBaseProps {
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  id?: string;
  invalid?: boolean;
  className?: string;
  onCreateOption?: (query: string) => void;
  createLabel?: (query: string) => string;

  onQueryChange?: (query: string) => void;
  loading?: boolean;

  /** Lets consumers defer remote data loading until this menu is opened. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  wrap?: boolean;

  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

interface SingleComboboxProps extends ComboboxBaseProps {
  multiple?: false;
  value?: string | null;
  onChange: (value: string | null) => void;
  maxVisible?: never;
}

interface MultiComboboxProps extends ComboboxBaseProps {
  multiple: true;
  value?: string[];
  onChange: (value: string[]) => void;
  maxVisible?: number;
}

type ComboboxProps = SingleComboboxProps | MultiComboboxProps;

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Pilih…",
  searchPlaceholder = "Cari item",
  emptyText = "Tidak ditemukan.",
  disabled,
  id,
  invalid,
  className,
  onCreateOption,
  createLabel = (q) => `Buat "${q}"`,
  onQueryChange,
  loading,
  open: controlledOpen,
  onOpenChange,
  wrap,
  onLoadMore,
  hasMore,
  loadingMore,
  multiple,
  maxVisible = 2,
}: ComboboxProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLLIElement>(null);

  const isMulti = multiple === true;
  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (controlledOpen === undefined) setUncontrolledOpen(nextOpen);
      if (nextOpen) {
        setQuery("");
        onQueryChange?.("");
      }
      onOpenChange?.(nextOpen);
    },
    [controlledOpen, onOpenChange, onQueryChange],
  );
  const selectedValues: string[] = isMulti
    ? ((value as string[]) ?? [])
    : (value as string | null | undefined)
      ? [value as string]
      : [];

  const selected = isMulti
    ? null
    : (options.find((o) => o.value === (value as string | null)) ?? null);

  const trimmed = query.trim();
  const filtered = onQueryChange
    ? options
    : trimmed
      ? options.filter((o) =>
          o.label.toLowerCase().includes(trimmed.toLowerCase()),
        )
      : options;
  const showCreate = onCreateOption && trimmed;
  const exactMatch = options.some(
    (o) => o.label.toLowerCase() === trimmed.toLowerCase(),
  );

  function isSelected(optValue: string) {
    return selectedValues.includes(optValue);
  }

  function handleSelect(optValue: string) {
    if (isMulti) {
      const multiOnChange = onChange as (value: string[]) => void;
      if (isSelected(optValue)) {
        multiOnChange(selectedValues.filter((v) => v !== optValue));
      } else {
        multiOnChange([...selectedValues, optValue]);
      }
    } else {
      const singleOnChange = onChange as (value: string | null) => void;
      singleOnChange(isSelected(optValue) ? null : optValue);
      setOpen(false);
    }
  }

  function handleRemove(optValue: string, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (isMulti) {
      const multiOnChange = onChange as (value: string[]) => void;
      multiOnChange(selectedValues.filter((v) => v !== optValue));
    }
  }

  React.useEffect(() => {
    if (!open || !onLoadMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          onLoadMore();
        }
      },
      { root: scrollRef.current, rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [open, onLoadMore, hasMore, loadingMore, filtered.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!onLoadMore || !hasMore || loadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight <= 150) {
      onLoadMore();
    }
  };

  const visibleBadges = wrap
    ? selectedValues
    : selectedValues.slice(0, maxVisible);
  const hiddenCount = wrap ? 0 : selectedValues.length - maxVisible;

  return (
    <Popover modal={true} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between gap-2 border border-border bg-background px-3 text-sm outline-none transition-[color,box-shadow]",
            wrap ? "min-h-10 rounded-3xl py-1.5" : "h-10 rounded-full",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            invalid && "border-destructive ring-3 ring-destructive/20",
            className,
          )}
        >
          {isMulti && selectedValues.length > 0 ? (
            <div
              className={cn(
                "flex min-w-0 flex-1 gap-1.5",
                wrap
                  ? "flex-wrap items-center"
                  : "items-center overflow-hidden",
              )}
            >
              {visibleBadges.map((val) => {
                const opt = options.find((o) => o.value === val);
                return (
                  <Badge
                    key={val}
                    variant="secondary"
                    className={cn(
                      "gap-1",
                      wrap
                        ? "max-w-full whitespace-normal break-all text-left"
                        : "shrink-0 capitalize",
                    )}
                  >
                    {opt?.badgeLabel ?? opt?.label ?? val}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleRemove(val, e)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleRemove(val, e as unknown as React.MouseEvent);
                        }
                      }}
                      className="ml-0.5 shrink-0 cursor-pointer rounded-full hover:bg-muted"
                    >
                      <XIcon className="size-3" />
                    </span>
                  </Badge>
                );
              })}
              {hiddenCount > 0 && (
                <Badge variant="outline" className="shrink-0">
                  +{hiddenCount}
                </Badge>
              )}
            </div>
          ) : (
            <span
              className={cn("truncate", !selected && "text-muted-foreground")}
            >
              {!isMulti && selected ? selected.label : placeholder}
            </span>
          )}
          <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={16}
        className="flex w-(--radix-popover-trigger-width) max-h-[min(24rem,var(--radix-popover-content-available-height))] flex-col gap-0 overflow-hidden p-0"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onQueryChange?.(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && onCreateOption && trimmed) {
                e.preventDefault();
                if (!exactMatch) {
                  onCreateOption(trimmed);
                } else {
                  const match = options.find(
                    (o) => o.label.toLowerCase() === trimmed.toLowerCase(),
                  );
                  if (match) handleSelect(match.value);
                }
                setQuery("");
                if (!isMulti) setOpen(false);
              }
            }}
            placeholder={searchPlaceholder}
            className="h-10 border-0 bg-transparent px-0 focus-visible:ring-0"
          />
        </div>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <ul className="p-1.5">
            {loading && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                Memuat…
              </li>
            )}
            {!loading && filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </li>
            )}
            {filtered.map((opt) => {
              const active = isSelected(opt.value);
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "flex w-full gap-2 px-2.5 py-2 text-left text-sm transition-colors",
                      wrap
                        ? "items-start rounded-2xl"
                        : "items-center justify-between rounded-full",
                      active
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/60",
                    )}
                  >
                    {wrap ? (
                      <>
                        <CheckIcon
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            active ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {opt.imageUrl && (
                          <Image
                            src={opt.imageUrl}
                            alt=""
                            width={28}
                            height={28}
                            unoptimized
                            className="mt-0.5 size-7 shrink-0 rounded-md border border-border/60 object-cover"
                          />
                        )}
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="break-words whitespace-normal leading-snug">
                            {opt.label}
                          </span>
                          {opt.hint && (
                            <span className="truncate text-xs text-muted-foreground">
                              {opt.hint}
                            </span>
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="flex min-w-0 items-center gap-2">
                          <CheckIcon
                            className={cn(
                              "size-4 shrink-0",
                              active ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {opt.imageUrl && (
                            <Image
                              src={opt.imageUrl}
                              alt=""
                              width={28}
                              height={28}
                              unoptimized
                              className="size-7 shrink-0 rounded-md border border-border/60 object-cover"
                            />
                          )}
                          <span className="truncate">{opt.label}</span>
                        </span>
                        {opt.hint && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {opt.hint}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                </li>
              );
            })}
            {onLoadMore && (
              <li ref={sentinelRef} aria-hidden className="h-px" />
            )}
            {loadingMore && (
              <li className="px-3 py-2 text-center text-xs text-muted-foreground">
                Memuat…
              </li>
            )}
            {showCreate && !exactMatch && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onCreateOption!(trimmed);
                    setQuery("");
                    if (!isMulti) setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-full px-2.5 py-2 text-left text-sm text-primary transition-colors hover:bg-primary/10"
                >
                  <PlusIcon className="size-4" />
                  <span>{createLabel(trimmed)}</span>
                </button>
              </li>
            )}
            {onCreateOption && !trimmed && (
              <li className="border-t border-border/60 mt-1 pt-1">
                <div className="px-2.5 py-2 text-xs text-muted-foreground">
                  Ketik nama lalu tekan Enter untuk membuat jenis varian baru
                </div>
              </li>
            )}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
