"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiError } from "@/lib/toast";
import {
  CopyPlusIcon,
  Loader2Icon,
  PackageSearchIcon,
  PlusIcon,
  SaveIcon,
  ScanBarcodeIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
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
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import {
  StockedProductPickerDialog,
  type StockedPickedProduct,
} from "@/components/dashboard/transaksi-stok/stocked-product-picker-dialog";

// eslint-disable-next-line no-restricted-imports
import { InventoryStockService } from "@/services/persediaan/inventory.service";

// eslint-disable-next-line no-restricted-imports
import { OutboundTransferService } from "@/services/barang-keluar/outbound-transfer.service";
import { cn } from "@/lib/utils";
import { playScanFeedback } from "@/lib/scan-feedback";
import { useAuthStore } from "@/store/use-auth-store";

const LIST_HREF = "/dashboard/barang-keluar?tab=transfer";

interface LineBin {
  id: string;
  code: string;
  onHand: number;
}

interface LineDraft {
  rowId: string;
  serverItemId?: string;
  itemId: string;
  sku: string;
  name: string;
  variantLabel: string;
  thumbnail: string | null;
  binId: string;
  binOnHand: number;
  qty: string;
  notes: string;
  availableBins: LineBin[];
  origBinId: string;
  origQty: number;
}

interface TransferKeluarFormPageProps {
  mode: "create" | "edit";
  id?: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function newRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `row_${Math.random().toString(36).slice(2)}${Date.now()}`;
}

export function TransferKeluarFormPage({
  mode,
  id,
}: TransferKeluarFormPageProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isAdminOrOwner = Boolean(
    currentUser?.roles?.some((r) =>
      ["owner", "admin", "adm", "administrator"].includes(r.toLowerCase()),
    ) ||
    currentUser?.permissions?.includes("edit-transfer-keluar") ||
    currentUser?.permissions?.includes("edit-barang-keluar"),
  );

  const [transferNo, setTransferNo] = useState("[auto]");
  const [transferDate, setTransferDate] = useState(todayStr);
  const [sourceLocationId, setSourceLocationId] = useState("");
  const [destLocationId, setDestLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState<string | undefined>(
    undefined,
  );
  const [scanCode, setScanCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanFlash, setScanFlash] = useState<"ok" | "err" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(mode === "edit");
  const scanRef = useRef<HTMLInputElement>(null);
  const editLoadedRef = useRef(false);
  const originalItemIdsRef = useRef<string[]>([]);

  const { data: locData } = useLocations({ perPage: 100 });

  const locationOptions = useMemo(
    () =>
      (locData?.items ?? []).map((l) => ({
        value: l.id,
        label: l.locationName,
      })),
    [locData],
  );

  const destOptions = locationOptions;

  useEffect(() => {
    if (sourceLocationId && mode === "create") scanRef.current?.focus();
  }, [sourceLocationId, mode]);

  useEffect(() => {
    if (mode !== "edit" || !id || editLoadedRef.current) return;
    editLoadedRef.current = true;

    (async () => {
      setLoadingEdit(true);
      try {
        let detail = await OutboundTransferService.getById(id);
        if (detail && detail.status !== "DRAFT") {
          detail = await OutboundTransferService.revertToDraft(id);
          qc.invalidateQueries({ queryKey: ["outbound-transfer"] });
          toast.info("Transfer dikembalikan ke Baru Dibuat untuk diedit");
        }
        if (!detail) {
          toast.error("Transfer tidak ditemukan");
          return;
        }

        setTransferNo(detail.transfer_number);
        setSourceLocationId(detail.source_location_id);
        setDestLocationId(detail.destination_location_id);
        setNotes(detail.notes ?? "");
        originalItemIdsRef.current = detail.items.map((it) => it.id);

        const srcLoc = detail.source_location_id;
        const uniqueSkus = Array.from(
          new Set(
            detail.items
              .map((it) => it.product?.sku)
              .filter(Boolean) as string[],
          ),
        );
        const stockBySku = new Map<
          string,
          { available_bins: { id: string; code: string; on_hand: number }[] }
        >();
        const bulkStock = await InventoryStockService.bulkBySku(uniqueSkus, srcLoc, {
          strategy: "fifo",
        });
        bulkStock.results.forEach((result) => {
          if (result.status === "success") {
            stockBySku.set(result.sku, {
              available_bins: result.data?.available_bins ?? [],
            });
          }
        });

        const builtLines: LineDraft[] = detail.items.map((it) => {
          const sku = it.product?.sku ?? "";
          const stock = stockBySku.get(sku);
          const bins: LineBin[] = (stock?.available_bins ?? []).map((b) => ({
            id: b.id,
            code: b.code,
            onHand: b.on_hand,
          }));
          if (
            it.source_bin?.id &&
            !bins.some((b) => b.id === it.source_bin!.id)
          ) {
            bins.unshift({
              id: it.source_bin.id,
              code: it.source_bin.bin_final_code,
              // rak lama bisa sudah kosong atau stoknya sudah berpindah,
              // jadi qty transfer tidak boleh dipakai sebagai stok rak.
              onHand: 0,
            });
          }
          const curBin = bins.find((b) => b.id === it.source_bin?.id);
          const fifoFallback = it.source_bin?.id ? undefined : bins[0];
          const variantOptions = (it.product?.options ?? [])
            .map((o) => o.value)
            .filter(Boolean)
            .join(", ");
          return {
            rowId: newRowId(),
            serverItemId: it.id,
            itemId: it.item_id,
            sku,
            name: it.product?.product?.name ?? sku,
            variantLabel: variantOptions,
            thumbnail:
              it.product?.media?.[0]?.url ??
              it.product?.product?.media?.[0]?.url ??
              null,
            binId: it.source_bin?.id ?? fifoFallback?.id ?? "",
            binOnHand: curBin?.onHand ?? fifoFallback?.onHand ?? 0,
            qty: String(it.qty),
            notes: "",
            availableBins: bins,
            origBinId: it.source_bin?.id ?? "",
            origQty: it.qty,
          };
        });
        setLines(builtLines);
      } catch (err) {
        apiError(err, "Gagal memuat transfer untuk diedit");
      } finally {
        setLoadingEdit(false);
      }
    })();
  }, [mode, id, qc]);

  const flash = (state: "ok" | "err") => {
    setScanFlash(state);
    playScanFeedback(state === "ok" ? "ok" : "error");
    setTimeout(() => setScanFlash(null), 350);
  };

  const updateLine = (rowId: string, patch: Partial<LineDraft>) =>
    setLines((prev) =>
      prev.map((l) => (l.rowId === rowId ? { ...l, ...patch } : l)),
    );
  const removeLine = (rowId: string) =>
    setLines((prev) => prev.filter((l) => l.rowId !== rowId));

  const addRakRow = (rowId: string) =>
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.rowId === rowId);
      if (idx === -1) return prev;
      const src = prev[idx];
      const usedBinIds = new Set(
        prev.filter((l) => l.itemId === src.itemId).map((l) => l.binId),
      );
      const nextBin = src.availableBins.find((b) => !usedBinIds.has(b.id));
      const clone: LineDraft = {
        ...src,
        rowId: newRowId(),
        serverItemId: undefined,
        binId: nextBin?.id ?? "",
        binOnHand: nextBin?.onHand ?? 0,
        qty: nextBin ? "1" : "",
        notes: "",
        origBinId: "",
        origQty: 0,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });

  const buildLineFromStock = (stock: {
    id: string;
    sku: string;
    product_name: string | null;
    variant_label: string;
    thumbnail_url: string | null;
    primary_bin: { id: string; code: string; on_hand: number } | null;
    available_bins: { id: string; code: string; on_hand: number }[];
  }): LineDraft => {
    const bins: LineBin[] = (stock.available_bins ?? []).map((b) => ({
      id: b.id,
      code: b.code,
      onHand: b.on_hand,
    }));
    const chosen = bins[0];
    return {
      rowId: newRowId(),
      serverItemId: undefined,
      itemId: stock.id,
      sku: stock.sku,
      name: stock.product_name ?? stock.sku,
      variantLabel: stock.variant_label,
      thumbnail: stock.thumbnail_url,
      binId: chosen?.id ?? "",
      binOnHand: chosen?.onHand ?? 0,
      qty: chosen ? "1" : "",
      notes: "",
      availableBins: bins,
      origBinId: "",
      origQty: 0,
    };
  };

  const handleScan = async () => {
    const q = scanCode.trim();
    if (!q || scanning || !sourceLocationId) return;

    setScanning(true);
    try {
      const res = await InventoryStockService.bySku(q, sourceLocationId, {
        strategy: "fifo",
      });
      const stock = res.data;

      const existing = lines.find((l) => l.itemId === stock.id);
      if (existing) {
        const cur = Number(existing.qty) || 0;
        if (cur < existing.binOnHand) {
          updateLine(existing.rowId, { qty: String(cur + 1) });
          flash("ok");
        } else {
          flash("err");
        }
        return;
      }

      if (!res.data.available_bins || res.data.available_bins.length === 0) {
        toast.warning(`SKU ${stock.sku} tidak punya stok di lokasi asal`);
        flash("err");
        return;
      }

      setLines((prev) => [...prev, buildLineFromStock(stock)]);
      flash("ok");
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        setPickerSearch(q);
        setPickerOpen(true);
      } else {
        flash("err");
      }
    } finally {
      setScanning(false);
      setScanCode("");
      setTimeout(() => scanRef.current?.focus(), 100);
    }
  };

  const handlePicked = async (products: StockedPickedProduct[]) => {
    setPickerOpen(false);
    setPickerSearch(undefined);
    const existing = new Set(lines.map((l) => l.itemId));
    const fresh = products.filter((p) => !existing.has(p.itemId));
    if (fresh.length === 0) return;

    const bulk = await InventoryStockService.bulkBySku(
      fresh.map((product) => product.sku),
      sourceLocationId,
      { strategy: "fifo" },
    );

    const newLines: LineDraft[] = [];
    let skippedNoStock = 0;
    bulk.results.forEach((result, i) => {
      if (result.status !== "success" || !result.data) return;
      const stock = result.data;
      if (!stock.available_bins || stock.available_bins.length === 0) {
        skippedNoStock += 1;
        return;
      }
      if (newLines.some((l) => l.itemId === stock.id)) return;
      newLines.push(buildLineFromStock(stock));
      void i;
    });

    if (newLines.length > 0) {
      setLines((prev) => [...prev, ...newLines]);
    }
    if (skippedNoStock > 0) {
      toast.warning(
        `${skippedNoStock} produk dilewati karena tidak punya stok di lokasi asal`,
      );
    }
    setTimeout(() => scanRef.current?.focus(), 250);
  };

  const validLines = lines.filter((l) => {
    const q = Number(l.qty);
    return (
      !!l.binId &&
      l.qty !== "" &&
      !Number.isNaN(q) &&
      q >= 1 &&
      q <= l.binOnHand
    );
  });

  const hasDuplicateBin = useMemo(() => {
    const seen = new Set<string>();
    for (const l of lines) {
      if (!l.binId) continue;
      const key = `${l.itemId}::${l.binId}`;
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  }, [lines]);

  const baseValid =
    !!sourceLocationId &&
    !!destLocationId &&
    validLines.length === lines.length &&
    lines.length > 0 &&
    !hasDuplicateBin &&
    !submitting &&
    !loadingEdit;

  const canSubmit =
    mode === "create" ? baseValid && !!createdBy.trim() : baseValid;

  const detailHref = id ? `${LIST_HREF}/transfer/${id}` : LIST_HREF;
  const cancelHref = mode === "edit" ? detailHref : LIST_HREF;

  const handleCreateSubmit = async () => {
    const manualNo =
      transferNo.trim() === "" || transferNo.trim() === "[auto]"
        ? undefined
        : transferNo.trim();

    const draft = await OutboundTransferService.createDraft({
      source_location_id: sourceLocationId,
      destination_location_id: destLocationId,
      notes: notes.trim() || undefined,
      created_by: createdBy.trim(),
      transfer_number: manualNo,
    });

    const failedSkus: string[] = [];
    for (const l of validLines) {
      try {
        await OutboundTransferService.addItem(draft.id, {
          item_id: l.itemId,
          qty: Number(l.qty),
          source_bin_id: l.binId,
        });
      } catch {
        failedSkus.push(l.sku);
      }
    }

    qc.invalidateQueries({ queryKey: ["outbound-transfer"] });

    if (failedSkus.length > 0) {
      toast.error(
        `Draft dibuat, tapi ${failedSkus.length} item gagal ditambahkan: ${failedSkus.join(", ")}`,
      );
    } else {
      toast.success("Transfer keluar berhasil dibuat");
    }
    router.push(LIST_HREF);
  };

  const handleEditSubmit = async () => {
    if (!id) return;

    await OutboundTransferService.updateDraft(id, {
      transfer_number:
        transferNo.trim() && transferNo.trim() !== "[auto]"
          ? transferNo.trim()
          : undefined,
      destination_location_id: destLocationId,
      notes: notes.trim() || undefined,
    });

    const keptServerIds = new Set(
      validLines.map((l) => l.serverItemId).filter(Boolean) as string[],
    );
    for (const oid of originalItemIdsRef.current) {
      if (!keptServerIds.has(oid)) {
        try {
          await OutboundTransferService.removeItem(id, oid);
        } catch {}
      }
    }

    const failedSkus: string[] = [];
    for (const l of validLines) {
      try {
        if (!l.serverItemId) {
          await OutboundTransferService.addItem(id, {
            item_id: l.itemId,
            qty: Number(l.qty),
            source_bin_id: l.binId,
          });
        } else if (l.binId !== l.origBinId || Number(l.qty) !== l.origQty) {
          await OutboundTransferService.updateItem(id, l.serverItemId, {
            qty: Number(l.qty),
            source_bin_id: l.binId,
          });
        }
      } catch {
        failedSkus.push(l.sku);
      }
    }

    qc.invalidateQueries({ queryKey: ["outbound-transfer"] });

    if (failedSkus.length > 0) {
      toast.error(
        `${failedSkus.length} item gagal diperbarui: ${failedSkus.join(", ")}`,
      );
    } else {
      toast.success("Transfer keluar berhasil diperbarui");
    }
    router.push(detailHref);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (mode === "edit") {
        await handleEditSubmit();
      } else {
        await handleCreateSubmit();
      }
    } catch (err) {
      apiError(
        err,
        mode === "edit"
          ? "Gagal memperbarui transfer keluar"
          : "Gagal membuat transfer keluar",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        title={
          mode === "edit" ? "Ubah Transfer Keluar" : "Tambah Transfer Keluar"
        }
        backHref={cancelHref}
        breadcrumb={[
          { label: "Gudang" },
          { label: "Barang Keluar", href: LIST_HREF },
          { label: mode === "edit" ? "Ubah" : "Tambah" },
        ]}
      />

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="flex flex-col gap-4 px-5 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">No. Transfer</Label>
              <Input
                value={transferNo}
                onChange={(e) => setTransferNo(e.target.value)}
                onFocus={(e) => {
                  if (e.target.value === "[auto]") setTransferNo("");
                }}
                onBlur={(e) => {
                  if (e.target.value.trim() === "") setTransferNo("[auto]");
                }}
                placeholder="[auto]"
                disabled={mode === "edit" && !isAdminOrOwner}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">
                Tanggal <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">
                Lokasi Asal <span className="text-destructive">*</span>
              </Label>
              <Combobox
                options={locationOptions}
                value={sourceLocationId}
                onChange={(v) => {
                  setSourceLocationId(v ?? "");
                  setLines([]);
                }}
                placeholder="Pilih lokasi asal…"
                searchPlaceholder="Cari lokasi…"
                disabled={mode === "edit"}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">
                Lokasi Tujuan <span className="text-destructive">*</span>
              </Label>
              <Combobox
                options={destOptions}
                value={destLocationId}
                onChange={(v) => setDestLocationId(v ?? "")}
                placeholder="Pilih lokasi tujuan…"
                searchPlaceholder="Cari lokasi…"
                emptyText="Pilih lokasi asal dulu"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">Keterangan</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan transfer (opsional)"
              rows={3}
            />
          </div>
        </div>
      </LiquidGlass>

      {mode === "create" && (
        <div className="sr-only" aria-hidden="true">
          <UserSelect
            value={createdBy}
            onChange={setCreatedBy}
            defaultToSelf
            placeholder="Petugas"
          />
        </div>
      )}

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="flex flex-col gap-4 px-5 py-5">
          <Label className="text-sm font-medium">
            Item Transfer <span className="text-destructive">*</span>
          </Label>

          <div className="flex flex-col gap-1.5">
            <div className="relative">
              {scanning ? (
                <Loader2Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />
              ) : (
                <ScanBarcodeIcon
                  className={cn(
                    "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 transition-colors",
                    scanFlash === "ok"
                      ? "text-success"
                      : scanFlash === "err"
                        ? "text-destructive"
                        : "text-muted-foreground",
                  )}
                />
              )}
              <Input
                ref={scanRef}
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleScan();
                  }
                }}
                placeholder={
                  sourceLocationId
                    ? "Scan / ketik SKU lalu Enter…"
                    : "Pilih lokasi asal dulu untuk mulai scan…"
                }
                disabled={!sourceLocationId || scanning}
                className={cn(
                  "h-10 pl-9 text-base transition-colors",
                  scanFlash === "ok" && "border-success ring-2 ring-success/30",
                  scanFlash === "err" &&
                    "border-destructive ring-2 ring-destructive/30",
                )}
                autoComplete="off"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              SKU exact match langsung tambah + rak utama auto-terisi. Scan
              ulang untuk menambah qty. Pakai “Tambah rak” untuk mengambil 1 SKU
              dari beberapa rak.
            </p>
          </div>

          <Table containerClassName="rounded-lg border border-border">
            <TableHeader className="bg-muted/40 text-xs uppercase tracking-wider">
              <TableRow>
                <TableHead className="px-3 py-2.5 text-muted-foreground">
                  Produk
                </TableHead>
                <TableHead className="px-3 py-2.5 text-muted-foreground">
                  Kode Rak
                </TableHead>
                <TableHead className="px-3 py-2.5 text-right text-muted-foreground">
                  Qty
                </TableHead>
                <TableHead className="px-3 py-2.5 text-right text-muted-foreground">
                  Qty Transfer
                </TableHead>
                <TableHead className="px-3 py-2.5 text-muted-foreground">
                  Keterangan
                </TableHead>
                <TableHead className="px-3 py-2.5" />
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="px-3 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      {loadingEdit ? (
                        <>
                          <Loader2Icon className="size-7 animate-spin opacity-40" />
                          <p className="text-sm">Memuat item transfer…</p>
                        </>
                      ) : (
                        <>
                          <PackageSearchIcon className="size-7 opacity-40" />
                          <p className="text-sm">
                            Belum ada item. Scan SKU atau klik Tambah Baru.
                          </p>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((l) => {
                  const qtyNum =
                    l.qty === "" || Number.isNaN(Number(l.qty))
                      ? 0
                      : Number(l.qty);
                  const noStock = l.binOnHand <= 0;
                  const dupBin =
                    !!l.binId &&
                    lines.some(
                      (o) =>
                        o.rowId !== l.rowId &&
                        o.itemId === l.itemId &&
                        o.binId === l.binId,
                    );
                  const qtyOverStock = qtyNum > l.binOnHand;
                  const qtyInvalid =
                    !l.binId || qtyNum < 1 || dupBin || qtyOverStock;
                  const binOptsForLine = l.availableBins.map((b, i) => ({
                    value: b.id,
                    label: i === 0 ? `${b.code} · stok terlama` : b.code,
                  }));
                  return (
                    <TableRow key={l.rowId} className="bg-background/50">
                      <TableCell className="px-3 py-2.5">
                        <div className="flex max-w-[260px] items-center gap-3">
                          {l.thumbnail ? (
                            <Image
                              src={l.thumbnail}
                              alt={l.name}
                              width={44}
                              height={44}
                              className="h-11 w-11 shrink-0 rounded-xl border border-border object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                              <PackageSearchIcon className="size-5 text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {l.name}
                            </p>
                            {l.variantLabel && (
                              <p className="truncate text-xs text-muted-foreground">
                                {l.variantLabel}
                              </p>
                            )}
                            <p className="truncate font-mono text-2xs text-muted-foreground">
                              {l.sku}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <Combobox
                          options={binOptsForLine}
                          value={l.binId}
                          onChange={(v) => {
                            const picked = l.availableBins.find(
                              (b) => b.id === v,
                            );
                            const onHand = picked?.onHand ?? 0;
                            const cur = Number(l.qty) || 0;
                            updateLine(l.rowId, {
                              binId: v ?? "",
                              binOnHand: onHand,
                              qty:
                                onHand > 0
                                  ? String(Math.min(Math.max(cur, 1), onHand))
                                  : "",
                            });
                          }}
                          placeholder="Pilih rak"
                          searchPlaceholder="Cari rak…"
                          emptyText="Tidak ada rak dengan stok"
                          className={cn(
                            "h-9 min-w-[160px]",
                            dupBin &&
                              "border-destructive ring-1 ring-destructive/30",
                          )}
                        />
                      </TableCell>
                      <TableCell
                        className={cn(
                          "px-3 py-2.5 text-right font-mono tabular-nums",
                          noStock ? "text-warning" : "text-muted-foreground",
                        )}
                      >
                        {l.binOnHand}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right">
                        <Input
                          type="number"
                          min={1}
                          max={l.binOnHand > 0 ? l.binOnHand : undefined}
                          value={l.qty}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              updateLine(l.rowId, { qty: "" });
                              return;
                            }
                            const n = Number(raw);
                            if (Number.isNaN(n)) return;
                            const clamped =
                              l.binOnHand > 0 ? Math.min(n, l.binOnHand) : n;
                            updateLine(l.rowId, { qty: String(clamped) });
                          }}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (Number.isNaN(v) || v < 1) {
                              updateLine(l.rowId, { qty: "" });
                            }
                          }}
                          placeholder="0"
                          className={cn(
                            "h-9 w-20 text-right",
                            qtyInvalid &&
                              "border-destructive ring-1 ring-destructive/30",
                          )}
                        />
                        {noStock && (
                          <p className="mt-0.5 text-xs text-warning">
                            Stok rak saat ini 0, pilih rak lain
                          </p>
                        )}
                        {qtyOverStock && (
                          <p className="text-destructive text-xs mt-0.5">
                            Maks. sesuai stok tersedia: {l.binOnHand}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <Input
                          value={l.notes}
                          onChange={(e) =>
                            updateLine(l.rowId, { notes: e.target.value })
                          }
                          placeholder="Catatan (opsional)"
                          className="h-9 min-w-[140px]"
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => addRakRow(l.rowId)}
                            aria-label="Tambah rak untuk SKU ini"
                            title="Ambil SKU ini dari rak lain"
                          >
                            <CopyPlusIcon className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeLine(l.rowId)}
                            aria-label="Hapus"
                            className="text-destructive"
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {hasDuplicateBin && (
            <p className="text-xs text-destructive">
              Ada dua baris SKU yang sama memakai rak yang sama. Pilih rak
              berbeda atau gabungkan qty-nya.
            </p>
          )}

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPickerOpen(true)}
              disabled={!sourceLocationId}
              className="gap-1.5"
            >
              <PlusIcon className="size-4" /> Tambah Baru
            </Button>
            {!sourceLocationId && (
              <p className="text-xs text-muted-foreground">
                Pilih lokasi asal dulu untuk menambah item.
              </p>
            )}
          </div>
        </div>
      </LiquidGlass>

      <FormFooter>
        <Button variant="outline" onClick={() => router.push(cancelHref)}>
          Batal
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? (
            <Loader2Icon className="mr-2 size-4 animate-spin" />
          ) : (
            <SaveIcon className="mr-2 size-4" />
          )}
          Simpan
        </Button>
      </FormFooter>

      <StockedProductPickerDialog
        open={pickerOpen}
        onOpenChange={(v) => {
          setPickerOpen(v);
          if (!v) setPickerSearch(undefined);
        }}
        onPick={handlePicked}
        locationId={sourceLocationId}
        excludeIds={lines.map((l) => l.itemId)}
        initialSearch={pickerSearch}
      />
    </div>
  );
}
