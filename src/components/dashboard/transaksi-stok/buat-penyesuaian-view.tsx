"use client";
import Image from "next/image";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2Icon,
  PackageSearchIcon,
  PlusIcon,
  ScanBarcodeIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { PageTitle } from "@/components/dashboard/page-title";
import { FormFooter } from "@/components/dashboard/shared/form-footer";
import { UserSelect } from "@/components/dashboard/shared/user-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SimplePagination,
  TABLE_PAGE_SIZES,
} from "@/components/ui/simple-pagination";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import { useLocationBinsInfinite } from "@/hooks/manajemen-rak/use-location-bins";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  useCreateStockAdjustment,
  usePatchStockAdjustment,
  useStockAdjustmentDetail,
  useStockAdjustmentItems,
} from "@/hooks/transaksi-stok/use-stock-adjustments";
import type {
  StockAdjustmentFormData,
  StockAdjustmentPatchData,
  StockAdjustmentItem,
} from "@/types/transaksi-stok/stock-adjustment";
import {
  StockedProductPickerDialog,
  type StockedPickedProduct,
} from "@/components/dashboard/transaksi-stok/stocked-product-picker-dialog";

// eslint-disable-next-line no-restricted-imports
import { InventoryStockService } from "@/services/persediaan/inventory.service";
import { cn } from "@/lib/utils";
import { playScanFeedback } from "@/lib/scan-feedback";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { FormErrorAlert } from "@/components/dashboard/shared/form-error-alert";

const LIST_HREF = "/dashboard/transaksi-stok?tab=penyesuaian";
const EDIT_ITEMS_PER_PAGE = 20;

interface LineBin {
  id: string;
  code: string;
  onHand: number;
  avgCost?: number;
}

interface LineDraft {
  lineId: string;
  adjustmentItemId?: string;
  itemId: string;
  sku: string;
  name: string;
  variantLabel: string;
  thumbnail: string | null;
  binId: string;
  binCode: string;
  binOnHand: number;
  binAvgCost: number;
  delta: string;
  unitCost: string;
  notes: string;
  availableBins: LineBin[];
}

let lineIdSequence = 0;

function makeLineId(itemId: string): string {
  lineIdSequence += 1;
  return `${itemId}-${Date.now()}-${lineIdSequence}`;
}

function saveErrorBanner(error: unknown): {
  title: string;
  message: string;
  issues: Array<{ label: string; message: string }>;
} | null {
  if (!error || typeof error !== "object") return null;

  const response = error as {
    title?: unknown;
    message?: unknown;
    errors?: unknown;
  };
  const text = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim() ? value.trim() : undefined;
  const errors =
    response.errors && typeof response.errors === "object"
      ? (response.errors as { issues?: unknown })
      : null;
  const issues = Array.isArray(errors?.issues)
    ? errors.issues.flatMap((issue) => {
        if (!issue || typeof issue !== "object") return [];
        const message = text((issue as { message?: unknown }).message);
        return message ? [{ label: "", message }] : [];
      })
    : [];

  return {
    title: text(response.title) ?? "Perubahan stok tidak dapat diproses",
    message: text(response.message) ?? "Perubahan stok tidak dapat disimpan.",
    issues,
  };
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isAdjustableBinCode(code: string | null | undefined): boolean {
  return Boolean(code && code.trim().toUpperCase() !== "DEFAULT");
}

function toAdjustableLineBins(
  bins: Array<{
    id: string;
    code: string;
    on_hand: number;
    avg_cost?: number;
  }>,
): LineBin[] {
  return bins
    .filter((bin) => isAdjustableBinCode(bin.code))
    .map((bin) => ({
      id: bin.id,
      code: bin.code,
      onHand: bin.on_hand,
      avgCost: bin.avg_cost,
    }));
}

function mergeLineBins(...binLists: LineBin[][]): LineBin[] {
  const byId = new Map<string, LineBin>();

  for (const bins of binLists) {
    for (const bin of bins) {
      if (isAdjustableBinCode(bin.code)) byId.set(bin.id, bin);
    }
  }

  return [...byId.values()];
}

function lineFromAdjustmentItem(item: StockAdjustmentItem): LineDraft {
  const product = item.product;
  const sku = product?.sku ?? "";
  const binCode = item.bin?.bin_final_code ?? "";
  const binId = isAdjustableBinCode(binCode)
    ? (item.bin_id ?? item.bin?.id ?? "")
    : "";
  const systemQty = item.system_qty ?? 0;
  const actualQty = item.actual_qty ?? 0;

  return {
    lineId: `adjustment-item-${item.id}`,
    adjustmentItemId: item.id,
    itemId: item.item_id,
    sku,
    name: (product?.product?.name ?? sku) || "—",
    variantLabel: sku,
    thumbnail:
      product?.media?.[0]?.url || product?.product?.media?.[0]?.url || null,
    binId,
    binCode,
    binOnHand: systemQty,
    binAvgCost: item.unit_cost != null ? Number(item.unit_cost) : 0,
    delta: String(actualQty - systemQty),
    unitCost: item.unit_cost != null ? String(item.unit_cost) : "",
    notes: item.notes ?? "",
    availableBins: binId
      ? [
          {
            id: binId,
            code: binCode,
            onHand: systemQty,
            avgCost: Number(item.unit_cost ?? 0),
          },
        ]
      : [],
  };
}

function AdjustmentBinCombobox({
  locationId,
  availableBins,
  value,
  onChange,
  disabled,
}: {
  locationId: string;
  availableBins: LineBin[];
  value: string;
  onChange: (
    binId: string,
    binCode: string,
    onHand: number,
    avgCost?: number,
  ) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useLocationBinsInfinite(locationId || undefined, {
      search: debouncedSearch.trim() || undefined,
      perPage: 30,
      sort: "bin_final_code",
      filter: { is_inbound: false },
    });

  const { options, binMap } = useMemo(() => {
    const opts: ComboboxOption[] = [];
    const addedIds = new Set<string>();
    const nextBinMap = new Map<
      string,
      { code: string; onHand: number; avgCost?: number }
    >();

    const term = debouncedSearch.trim().toLowerCase();
    for (const b of availableBins) {
      if (!isAdjustableBinCode(b.code)) continue;
      nextBinMap.set(b.id, {
        code: b.code,
        onHand: b.onHand,
        avgCost: b.avgCost,
      });
      if (!term || b.code.toLowerCase().includes(term)) {
        opts.push({
          value: b.id,
          label: `${b.code} · ${b.onHand} stok`,
        });
        addedIds.add(b.id);
      }
    }

    const rawItems = data?.pages.flatMap((p) => p.items) ?? [];
    for (const lb of rawItems) {
      if (lb.isInbound || !isAdjustableBinCode(lb.binFinalCode)) continue;
      if (!nextBinMap.has(lb.id)) {
        nextBinMap.set(lb.id, { code: lb.binFinalCode, onHand: 0 });
      }
      if (!addedIds.has(lb.id)) {
        opts.push({
          value: lb.id,
          label: `${lb.binFinalCode} · 0 stok`,
        });
        addedIds.add(lb.id);
      }
    }

    if (
      value &&
      !opts.some((o) => o.value === value) &&
      nextBinMap.has(value)
    ) {
      const info = nextBinMap.get(value)!;
      opts.unshift({
        value,
        label: `${info.code} · ${info.onHand} stok`,
      });
    }

    return { options: opts, binMap: nextBinMap };
  }, [availableBins, data, debouncedSearch, value]);

  return (
    <Combobox
      options={options}
      value={value || null}
      onChange={(v) => {
        if (!v) {
          onChange("", "", 0);
          return;
        }
        const info = binMap.get(v);
        onChange(v, info?.code ?? "", info?.onHand ?? 0, info?.avgCost);
      }}
      onQueryChange={setSearch}
      loading={isLoading}
      onLoadMore={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }}
      hasMore={hasNextPage}
      loadingMore={isFetchingNextPage}
      placeholder="Scan / pilih rak"
      searchPlaceholder="Scan / cari rak…"
      emptyText={isLoading ? "Mencari rak…" : "Tidak ada rak di lokasi ini"}
      disabled={disabled || !locationId}
      className="h-9 min-w-[160px]"
    />
  );
}

export interface PenyesuaianFormPageProps {
  mode?: "create" | "edit";
  id?: string;
}

export function PenyesuaianFormPage({
  mode = "create",
  id,
}: PenyesuaianFormPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = usePermissions();

  const isEdit = mode === "edit" && Boolean(id);
  const canMutate = can(
    isEdit ? "edit-penyesuaian-stok" : "create-penyesuaian-stok",
  );
  const [editPage, setEditPage] = useState(1);
  const [editPerPage, setEditPerPage] = useState(EDIT_ITEMS_PER_PAGE);

  // Edit queries
  const { data: editDetail, isLoading: isLoadingDetail } =
    useStockAdjustmentDetail(isEdit ? id! : "");
  const {
    data: editItemsData,
    isLoading: isLoadingItems,
    isFetching: isFetchingItems,
  } = useStockAdjustmentItems(isEdit ? id! : "", {
    page: editPage,
    per_page: editPerPage,
    sort: "-created_at,-id",
  });

  const [locationId, setLocationId] = useState(
    () => searchParams.get("location_id") ?? "",
  );
  const [transactionDate, setTransactionDate] = useState(todayStr);
  const [adjustmentNo, setAdjustmentNo] = useState("[auto]");
  const [notes, setNotes] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [editOverrides, setEditOverrides] = useState<Record<string, LineDraft>>(
    {},
  );
  const [removedAdjustmentItemIds, setRemovedAdjustmentItemIds] = useState<
    Set<string>
  >(new Set());
  const [addedEditLines, setAddedEditLines] = useState<LineDraft[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState<string | undefined>(
    undefined,
  );
  const [scanCode, setScanCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanFlash, setScanFlash] = useState<"ok" | "err" | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const visibleLineIdentity = lines.map((line) => line.lineId).join("|");

  const { data: locData } = useLocations({ perPage: 100 });
  const createMut = useCreateStockAdjustment();
  const patchMut = usePatchStockAdjustment();
  const saveError = saveErrorBanner(patchMut.error ?? createMut.error);

  const locationOptions = useMemo(
    () =>
      (locData?.items ?? []).map((l) => ({
        value: l.id,
        label: l.locationName,
      })),
    [locData],
  );

  // Populate document metadata only once. Item rows are deliberately loaded
  // page-by-page below, so opening a large adjustment remains fast.
  const editMetadataPopulatedRef = useRef(false);
  useEffect(() => {
    if (!isEdit || editMetadataPopulatedRef.current || !editDetail) return;

    editMetadataPopulatedRef.current = true;
    setLocationId(editDetail.location_id ?? editDetail.location?.id ?? "");
    setTransactionDate(
      editDetail.transaction_date
        ? editDetail.transaction_date.slice(0, 10)
        : todayStr(),
    );
    setAdjustmentNo(editDetail.adjustment_no ?? "[auto]");
    setNotes(editDetail.notes ?? "");
    setCreatedBy(editDetail.created_by ?? "");
  }, [isEdit, editDetail]);

  useEffect(() => {
    if (!isEdit || !editItemsData) return;

    const pageLines = editItemsData.items
      .filter((item) => !removedAdjustmentItemIds.has(item.id))
      .map((item) => {
        const initial = lineFromAdjustmentItem(item);
        const override = editOverrides[item.id];

        return override
          ? {
              ...initial,
              ...override,
              availableBins: mergeLineBins(
                initial.availableBins,
                override.availableBins,
              ),
            }
          : initial;
      });

    // New items have no persisted page yet. Keep them visible at the start of
    // the editor and merge them into the full payload only when saving.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Mirrors the requested server page into the transient editor draft.
    setLines(editPage === 1 ? [...pageLines, ...addedEditLines] : pageLines);
  }, [
    isEdit,
    editItemsData,
    editPage,
    editOverrides,
    removedAdjustmentItemIds,
    addedEditLines,
  ]);

  useEffect(() => {
    if (!isEdit || !locationId || lines.length === 0) return;

    let cancelled = false;
    void Promise.all(
      lines.map(async (line) => {
        if (!line.sku) return null;
        try {
          const response = await InventoryStockService.bySku(
            line.sku,
            locationId,
          );
          return {
            lineId: line.lineId,
            bins: toAdjustableLineBins(response.data.available_bins ?? []),
          };
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const binsByLine = new Map(
        results
          .filter(
            (result): result is { lineId: string; bins: LineBin[] } =>
              result !== null,
          )
          .map((result) => [result.lineId, result.bins]),
      );

      setLines((current) =>
        current.map((line) => ({
          ...line,
          // Preserve the historical bin even when it currently has zero stock
          // or is absent from the live SKU lookup.
          availableBins: mergeLineBins(
            line.availableBins,
            binsByLine.get(line.lineId) ?? [],
          ),
        })),
      );
    });

    return () => {
      cancelled = true;
    };
    // `lines` is intentionally not a dependency: updating enriched bin options
    // would otherwise immediately refetch the same SKU lookups.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, locationId, editPage, editItemsData, visibleLineIdentity]);

  useEffect(() => {
    if (locationId) scanRef.current?.focus();
  }, [locationId]);

  const prefillAppliedRef = useRef(false);

  useEffect(() => {
    if (isEdit || prefillAppliedRef.current) return;
    const itemsParam = searchParams.get("items");
    const locParam = searchParams.get("location_id");
    if (!itemsParam || !locParam) return;
    prefillAppliedRef.current = true;

    let entries: { sku: string; qty: number; binId: string }[] = [];
    try {
      entries = JSON.parse(itemsParam);
    } catch {
      return;
    }
    if (!Array.isArray(entries) || entries.length === 0) return;

    (async () => {
      const results = await Promise.all(
        entries.map((e) =>
          InventoryStockService.bySku(e.sku, locParam).catch(() => null),
        ),
      );

      setLines((prev) => {
        const existing = new Set(prev.map((l) => `${l.itemId}|${l.binId}`));
        const fresh: LineDraft[] = [];

        results.forEach((res, i) => {
          const variant = res?.data;
          if (!variant || existing.has(variant.id)) return;
          const entry = entries[i];
          const bins = toAdjustableLineBins(variant.available_bins);
          const bin = bins.find((b) => b.id === entry.binId) ?? null;
          const pairKey = `${variant.id}|${bin?.id ?? ""}`;

          if (!bin || existing.has(pairKey)) return;
          existing.add(pairKey);

          fresh.push({
            lineId: makeLineId(variant.id),
            itemId: variant.id,
            sku: variant.sku,
            name: variant.product_name ?? variant.sku,
            variantLabel: variant.variant_label,
            thumbnail: variant.thumbnail_url,
            binId: bin?.id ?? "",
            binCode: bin?.code ?? "",
            binOnHand: bin?.onHand ?? 0,
            binAvgCost: bin?.avgCost ?? variant.avg_cost ?? 0,
            delta: String(-entry.qty),
            unitCost: bin?.avgCost != null ? String(bin.avgCost) : "",
            notes: "Selisih penempatan (stok fiktif)",
            availableBins: bins,
          });
        });

        return [...prev, ...fresh];
      });
    })();
  }, [isEdit, searchParams]);

  const addLinesFromPicker = async (picked: StockedPickedProduct[]) => {
    for (const p of picked) {
      try {
        const res = await InventoryStockService.bySku(p.sku, locationId);
        const variant = res.data;
        const bins = toAdjustableLineBins(variant.available_bins ?? []);
        const primary =
          bins.find((bin) => bin.id === variant.primary_bin?.id) ?? bins[0];

        const line: LineDraft = {
          lineId: makeLineId(variant.id),
          itemId: variant.id,
          sku: variant.sku,
          name: variant.product_name ?? variant.sku,
          variantLabel: variant.variant_label ?? p.variantLabel ?? "",
          thumbnail: variant.thumbnail_url ?? p.thumbnail ?? null,
          binId: primary?.id ?? "",
          binCode: primary?.code ?? "",
          binOnHand: primary?.onHand ?? 0,
          binAvgCost: primary?.avgCost ?? variant.avg_cost ?? 0,
          delta: "",
          unitCost:
            (primary?.avgCost ?? variant.avg_cost) != null
              ? String(primary?.avgCost ?? variant.avg_cost)
              : "",
          notes: "",
          availableBins: bins,
        };
        appendLine(line);
      } catch {
        appendLine({
          lineId: makeLineId(p.itemId),
          itemId: p.itemId,
          sku: p.sku,
          name: p.name,
          variantLabel: p.variantLabel ?? "",
          thumbnail: p.thumbnail ?? null,
          binId: "",
          binCode: "",
          binOnHand: 0,
          binAvgCost: 0,
          delta: "",
          unitCost: "",
          notes: "",
          availableBins: [],
        });
      }
    }
  };

  const appendLine = (line: LineDraft) => {
    if (isEdit) {
      setAddedEditLines((current) => [...current, line]);
      setEditPage(1);
      return;
    }

    setLines((current) => [...current, line]);
  };

  const updateLine = (lineId: string, patch: Partial<LineDraft>) => {
    const currentLine = lines.find((line) => line.lineId === lineId);
    if (isEdit && currentLine?.adjustmentItemId) {
      setEditOverrides((current) => ({
        ...current,
        [currentLine.adjustmentItemId!]: {
          ...(current[currentLine.adjustmentItemId!] ?? currentLine),
          ...patch,
        },
      }));
    } else if (isEdit && currentLine) {
      setAddedEditLines((current) =>
        current.map((line) =>
          line.lineId === lineId ? { ...line, ...patch } : line,
        ),
      );
    }

    setLines((prev) =>
      prev.map((l) => (l.lineId === lineId ? { ...l, ...patch } : l)),
    );
  };

  const removeLine = (lineId: string) => {
    const currentLine = lines.find((line) => line.lineId === lineId);
    if (isEdit && currentLine?.adjustmentItemId) {
      setRemovedAdjustmentItemIds((current) => {
        const next = new Set(current);
        next.add(currentLine.adjustmentItemId!);
        return next;
      });
    } else if (isEdit) {
      setAddedEditLines((current) =>
        current.filter((line) => line.lineId !== lineId),
      );
    }

    setLines((prev) => prev.filter((l) => l.lineId !== lineId));
  };

  const flash = (type: "ok" | "err") => {
    setScanFlash(type);
    playScanFeedback(type === "ok" ? "ok" : "error");
    setTimeout(() => setScanFlash(null), 350);
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = scanCode.trim();
    if (!q || scanning) return;

    setScanning(true);
    try {
      const res = await InventoryStockService.bySku(q, locationId);
      const variant = res.data;
      const bins = toAdjustableLineBins(variant.available_bins ?? []);
      const primary =
        bins.find((bin) => bin.id === variant.primary_bin?.id) ?? bins[0];

      appendLine({
        lineId: makeLineId(variant.id),
        itemId: variant.id,
        sku: variant.sku,
        name: variant.product_name ?? variant.sku,
        variantLabel: variant.variant_label,
        thumbnail: variant.thumbnail_url,
        binId: primary?.id ?? "",
        binCode: primary?.code ?? "",
        binOnHand: primary?.onHand ?? 0,
        binAvgCost: primary?.avgCost ?? variant.avg_cost ?? 0,
        delta: "",
        unitCost:
          primary?.avgCost != null
            ? String(primary.avgCost)
            : variant.avg_cost != null
              ? String(variant.avg_cost)
              : "",
        notes: "",
        availableBins: bins,
      });
      flash("ok");
    } catch {
      flash("err");
    } finally {
      setScanning(false);
      setScanCode("");
    }
  };

  const isValidLine = (line: LineDraft) => {
    const delta = Number(line.delta);
    return (
      line.delta !== "" && !Number.isNaN(delta) && delta !== 0 && !!line.binId
    );
  };

  const validLines = lines.filter((l) => {
    const d = Number(l.delta);
    return l.delta !== "" && !Number.isNaN(d) && d !== 0 && !!l.binId;
  });

  const hasDuplicateItemBin =
    new Set(validLines.map((l) => `${l.itemId}|${l.binId}`)).size !==
    validLines.length;

  const totalLineCount = isEdit
    ? Math.max(
        0,
        (editItemsData?.meta.total ?? 0) -
          removedAdjustmentItemIds.size +
          addedEditLines.length,
      )
    : lines.length;

  const changedEditLines = [
    ...Object.values(editOverrides),
    ...addedEditLines,
  ];
  const canSubmit = isEdit
    ? canMutate &&
      !!locationId &&
      !!transactionDate &&
      totalLineCount > 0 &&
      changedEditLines.every(isValidLine)
    : canMutate &&
      !!locationId &&
      !!transactionDate &&
      totalLineCount > 0 &&
      validLines.length === lines.length &&
      !hasDuplicateItemBin;

  const isSaving = createMut.isPending || patchMut.isPending;

  const lineToInput = (line: LineDraft) => ({
    item_id: line.itemId,
    bin_id: line.binId || undefined,
    mode: "DELTA" as const,
    input_value: Number(line.delta),
    unit_cost: line.unitCost ? Number(line.unitCost) : undefined,
    notes: line.notes.trim() || undefined,
  });

  const makePayload = (payloadLines: LineDraft[]): StockAdjustmentFormData => ({
    transaction_date: transactionDate,
    location_id: locationId,
    adjustment_no:
      adjustmentNo.trim() === "" || adjustmentNo.trim() === "[auto]"
        ? undefined
        : adjustmentNo.trim(),
    notes: notes.trim() || undefined,
    created_by: createdBy.trim(),
    items: payloadLines.map(lineToInput),
  });

  const makePatchPayload = (): StockAdjustmentPatchData => ({
    transaction_date: transactionDate,
    notes: notes.trim() || null,
    changes: {
      create: addedEditLines.map(lineToInput),
      update: Object.values(editOverrides).map((line) => ({
        id: line.adjustmentItemId!,
        bin_id: line.binId || undefined,
        mode: "DELTA" as const,
        input_value: Number(line.delta),
        unit_cost: line.unitCost ? Number(line.unitCost) : undefined,
        notes: line.notes.trim() || undefined,
      })),
      delete_ids: [...removedAdjustmentItemIds],
    },
  });

  const handleSubmit = async () => {
    if (!canSubmit || isSaving) return;

    if (isEdit && id) {
      // Send only the user's create/update/delete changes. The server locks the
      // full document and validates the resulting document atomically, so unseen
      // pages stay untouched without the browser downloading every one of them.
      patchMut.mutate(
        { id, data: makePatchPayload() },
        {
          onSuccess: () =>
            router.push(`/dashboard/transaksi-stok/penyesuaian/${id}`),
        },
      );

      return;
    }

    const payload = makePayload(lines);
    if (!isEdit) {
      createMut.mutate(payload, {
        onSuccess: () => router.push(LIST_HREF),
      });
    }
  };

  if (isEdit && (isLoadingDetail || isLoadingItems)) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const backHref = isEdit
    ? `/dashboard/transaksi-stok/penyesuaian/${id}`
    : LIST_HREF;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title={
          isEdit
            ? `Ubah Penyesuaian Stok: ${adjustmentNo}`
            : "Buat Penyesuaian Stok"
        }
        description={
          isEdit
            ? "Perbarui rincian, tambah/hapus item, atau sesuaikan stok fisik."
            : "Koreksi jumlah stok riil gudang terhadap data sistem (+ / -)."
        }
        backHref={backHref}
        breadcrumb={[
          { label: "Persediaan" },
          { label: "Transaksi Stok", href: LIST_HREF },
          ...(isEdit
            ? [
                {
                  label: adjustmentNo,
                  href: `/dashboard/transaksi-stok/penyesuaian/${id}`,
                },
                { label: "Ubah" },
              ]
            : [{ label: "Buat Penyesuaian" }]),
        ]}
      />

      {saveError && (
        <FormErrorAlert
          title={saveError.title}
          description={saveError.message}
          items={saveError.issues}
          onDismiss={() => {
            patchMut.reset();
            createMut.reset();
          }}
        />
      )}

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="flex flex-col gap-4 px-5 py-5">
          <p className="text-sm font-semibold">Informasi Penyesuaian</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                No. Penyesuaian
              </Label>
              <Input
                value={adjustmentNo}
                onChange={(e) => setAdjustmentNo(e.target.value)}
                placeholder="[auto]"
                disabled
                className="h-9 font-mono text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Lokasi / Gudang <span className="text-destructive">*</span>
              </Label>
              <Combobox
                options={locationOptions}
                value={locationId}
                onChange={(v) => {
                  setLocationId(v ?? "");
                  setLines([]);
                }}
                disabled={isEdit}
                placeholder="Pilih lokasi…"
                searchPlaceholder="Cari lokasi…"
                className="h-9"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Tanggal Penyesuaian <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Dibuat Oleh
              </Label>
              <UserSelect
                value={createdBy}
                onChange={setCreatedBy}
                placeholder="Pilih pengguna…"
                disabled={isEdit}
                className="h-9"
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-4">
              <Label className="text-xs text-muted-foreground">Catatan</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Stok opname bulanan, barang rusak, dsb."
                className="resize-none text-xs"
              />
            </div>
          </div>
        </div>
      </LiquidGlass>

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="flex flex-col gap-4 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Daftar Item Penyesuaian</p>
              <p className="text-xs text-muted-foreground">
                {totalLineCount} baris dipilih • Masukkan selisih (+ / -) untuk
                setiap rak
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Isi jumlah perubahan stok, bukan stok akhir. Pilih beberapa SKU
                sekaligus; setiap baris dapat menggunakan rak berbeda.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPickerOpen(true)}
                disabled={!canMutate || !locationId}
                className="gap-1.5"
              >
                <PlusIcon className="size-4" /> Tambah Item
              </Button>
            </div>
          </div>

          <form onSubmit={handleScanSubmit} className="flex gap-2">
            <div
              className={cn(
                "relative flex-1 rounded-md transition-all duration-300",
                scanFlash === "ok" &&
                  "ring-2 ring-emerald-500 bg-emerald-500/10",
                scanFlash === "err" && "ring-2 ring-rose-500 bg-rose-500/10",
              )}
            >
              <ScanBarcodeIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                ref={scanRef}
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                placeholder={
                  locationId
                    ? "Scan barcode / SKU lalu Enter…"
                    : "Pilih lokasi gudang terlebih dahulu…"
                }
                disabled={!canMutate || !locationId || scanning}
                className="h-10 pl-9 font-mono text-sm"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={
                !canMutate || !locationId || !scanCode.trim() || scanning
              }
            >
              {scanning ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                "Scan"
              )}
            </Button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="min-w-[220px]">Produk / SKU</TableHead>
                <TableHead className="min-w-[180px]">Rak Penyesuaian</TableHead>
                <TableHead className="w-32 text-right">
                  Selisih (+ / -)
                </TableHead>
                <TableHead className="w-24 text-right">Stok Sistem</TableHead>
                <TableHead className="w-24 text-right">Stok Fisik</TableHead>
                <TableHead className="min-w-[180px]">Catatan Baris</TableHead>
                <TableHead className="w-12 text-center"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <PackageSearchIcon className="size-8 text-muted-foreground/50" />
                      <p className="text-sm">Belum ada item yang ditambahkan</p>
                      <p className="text-xs">
                        Gunakan tombol <strong>+ Tambah Item</strong> atau scan
                        barcode produk untuk mulai menyesuaikan stok.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((l, index) => {
                  const d = Number(l.delta);
                  const isInvalid =
                    l.delta !== "" && (Number.isNaN(d) || d === 0);
                  const qtyAkhir =
                    l.delta === "" || Number.isNaN(d) ? "—" : l.binOnHand + d;

                  return (
                    <TableRow key={l.lineId}>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground align-top pt-3.5">
                        {isEdit
                          ? ((editItemsData?.meta.current_page ?? 1) - 1) *
                              (editItemsData?.meta.per_page ?? editPerPage) +
                            index +
                            1
                          : index + 1}
                      </TableCell>

                      <TableCell className="align-top py-2.5">
                        <div className="flex items-center gap-3">
                          {l.thumbnail ? (
                            <Image
                              src={l.thumbnail}
                              alt={l.name}
                              width={40}
                              height={40}
                              className="size-10 rounded-lg object-cover border border-border/40 shrink-0"
                            />
                          ) : (
                            <div className="size-10 rounded-lg bg-muted/50 border border-border/40 shrink-0 flex items-center justify-center text-xs font-mono text-muted-foreground">
                              SKU
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm truncate max-w-[220px]">
                              {l.name}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {l.sku}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="align-top py-2.5">
                        <AdjustmentBinCombobox
                          locationId={locationId}
                          availableBins={l.availableBins}
                          value={l.binId}
                          onChange={(binId, binCode, onHand, avgCost) => {
                            const effectiveAvgCost =
                              avgCost ?? l.binAvgCost ?? 0;
                            updateLine(l.lineId, {
                              binId,
                              binCode,
                              binOnHand: onHand,
                              binAvgCost: effectiveAvgCost,
                              unitCost:
                                effectiveAvgCost != null
                                  ? String(effectiveAvgCost)
                                  : l.unitCost,
                            });
                          }}
                        />
                      </TableCell>

                      <TableCell className="align-top py-2.5 text-right">
                        <Input
                          type="number"
                          value={l.delta}
                          onChange={(e) =>
                            updateLine(l.lineId, { delta: e.target.value })
                          }
                          placeholder="+/-"
                          className={cn(
                            "h-9 w-24 text-right font-mono text-xs",
                            isInvalid &&
                              "border-destructive focus-visible:ring-destructive",
                          )}
                        />
                      </TableCell>

                      <TableCell className="align-top py-2.5 text-right font-mono text-xs text-muted-foreground pt-3.5">
                        {l.binOnHand}
                      </TableCell>

                      <TableCell className="align-top py-2.5 text-right font-mono text-xs font-semibold pt-3.5">
                        {qtyAkhir}
                      </TableCell>

                      <TableCell className="align-top py-2.5">
                        <Input
                          value={l.notes}
                          onChange={(e) =>
                            updateLine(l.lineId, { notes: e.target.value })
                          }
                          placeholder="Alasan selisih…"
                          className="h-9 text-xs"
                        />
                      </TableCell>

                      <TableCell className="align-top py-2.5 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(l.lineId)}
                          disabled={!canMutate}
                          className="size-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {isEdit && editItemsData?.meta && (
            <SimplePagination
              page={editItemsData.meta.current_page}
              lastPage={editItemsData.meta.last_page}
              onPageChange={setEditPage}
              perPage={editItemsData.meta.per_page}
              onPerPageChange={(perPage) => {
                setEditPerPage(perPage);
                setEditPage(1);
              }}
              pageSizeOptions={TABLE_PAGE_SIZES}
              isFetching={isFetchingItems}
              total={totalLineCount}
              label="baris"
            />
          )}

          {hasDuplicateItemBin && (
            <p className="text-xs text-destructive">
              SKU yang sama boleh memakai rak berbeda, tetapi tidak boleh
              dicantumkan dua kali pada rak yang sama.
            </p>
          )}

          {lines.length > 0 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPickerOpen(true)}
                disabled={!canMutate || !locationId}
                className="gap-1.5"
              >
                <PlusIcon className="size-4" /> Tambah Item Lainnya
              </Button>
            </div>
          )}
        </div>
      </LiquidGlass>

      <FormFooter>
        <Button variant="outline" onClick={() => router.push(backHref)}>
          Batal
        </Button>
        {canMutate && (
          <Button onClick={handleSubmit} disabled={!canSubmit || isSaving}>
            {isSaving && <Loader2Icon className="mr-2 size-4 animate-spin" />}
            {isEdit ? "Simpan Perubahan" : "Simpan Penyesuaian"}
          </Button>
        )}
      </FormFooter>

      <StockedProductPickerDialog
        open={pickerOpen}
        onOpenChange={(v) => {
          setPickerOpen(v);
          if (!v) setPickerSearch(undefined);
        }}
        onPick={addLinesFromPicker}
        locationId={locationId}
        includeZero={true}
        initialSearch={pickerSearch}
      />
    </div>
  );
}

export function BuatPenyesuaianView() {
  return <PenyesuaianFormPage mode="create" />;
}
