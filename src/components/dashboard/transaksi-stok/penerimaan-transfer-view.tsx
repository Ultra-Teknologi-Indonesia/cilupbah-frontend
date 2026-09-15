"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2Icon, PackageSearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageTitle } from "@/components/dashboard/page-title";
import { FormFooter } from "@/components/dashboard/shared/form-footer";
import { QtyConfirmInput } from "@/components/ui/qty-confirm-input";
import {
  useBinTransferList,
  useBinTransferDetail,
  useReceiveBinTransfer,
  type BinTransferDetailItem,
} from "@/hooks/transaksi-stok/use-bin-transfer";
import { useLocationBinsInfinite } from "@/hooks/manajemen-rak/use-location-bins";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/auth/use-permissions";

const LIST_HREF = "/dashboard/transaksi-stok?tab=transfer";

interface ReceiveLine {
  itemId: string;
  destBinId: string;
  qty: string;
}

function DestinationBinCombobox({
  locationId,
  value,
  onChange,
  disabled,
  allocatedBinId,
  allocatedBinCode,
}: {
  locationId: string;
  value: string;
  onChange: (v: string | null) => void;
  disabled?: boolean;
  allocatedBinId?: string | null;
  allocatedBinCode?: string | null;
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

  const options: ComboboxOption[] = useMemo(() => {
    const rawItems = data?.pages.flatMap((p) => p.items) ?? [];
    const list: ComboboxOption[] = rawItems.map((b) => ({
      value: b.id,
      label: b.binFinalCode,
    }));

    // Pin the allocated (home) bin at the very top with a hint label
    if (allocatedBinId && allocatedBinCode) {
      // Remove duplicate if already in list
      const withoutAlloc = list.filter((o) => o.value !== allocatedBinId);
      withoutAlloc.unshift({
        value: allocatedBinId,
        label: `${allocatedBinCode} ✦ Rak Alokasi`,
      });
      return withoutAlloc;
    }

    return list;
  }, [data, allocatedBinId, allocatedBinCode]);

  return (
    <Combobox
      options={options}
      value={value || null}
      onChange={onChange}
      onQueryChange={setSearch}
      loading={isLoading}
      onLoadMore={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }}
      hasMore={hasNextPage}
      loadingMore={isFetchingNextPage}
      placeholder={isLoading ? "Memuat…" : "Scan / pilih rak tujuan"}
      searchPlaceholder="Scan / cari rak…"
      emptyText={isLoading ? "Mencari rak…" : "Tidak ada rak"}
      disabled={disabled || !locationId}
      className="h-9 min-w-[160px]"
    />
  );
}

export function PenerimaanTransferView() {
  const router = useRouter();
  const { can } = usePermissions();
  const canReceiveTransfer = can("edit-pindah-bin");

  const [transferId, setTransferId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Record<string, ReceiveLine>>({});
  const [primedKey, setPrimedKey] = useState<string | null>(null);

  const { data: transitData, isLoading: transitLoading } = useBinTransferList({
    status: "SEDANG_DIJALAN",
    perPage: 100,
  });

  const { data: trf, isLoading: detailLoading } =
    useBinTransferDetail(transferId);

  const locationId = trf?.location_id ?? "";

  const receiveMut = useReceiveBinTransfer();

  const transferOptions = useMemo(
    () =>
      (transitData?.data ?? [])
        .filter((t) => t.status !== "SELESAI")
        .map((t) => ({
          value: t.id,
          label: t.transfer_number,
          hint: t.location?.location_name ?? undefined,
        })),
    [transitData],
  );

  const pendingItems: BinTransferDetailItem[] = useMemo(
    () => (trf?.items ?? []).filter((it) => (it.remaining_qty ?? 0) > 0),
    [trf],
  );

  const currentKey = trf
    ? `${trf.id}:${pendingItems.map((it) => `${it.id}-${it.remaining_qty}`).join(",")}`
    : "";
  if (primedKey !== currentKey) {
    setPrimedKey(currentKey);
    const next: Record<string, ReceiveLine> = {};
    for (const it of pendingItems) {
      next[it.id] = {
        itemId: it.id,
        destBinId: "",
        qty: String(it.remaining_qty ?? 0),
      };
    }
    setLines(next);
  }

  const updateLine = (itemId: string, patch: Partial<ReceiveLine>) =>
    setLines((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...patch },
    }));

  const validLines = pendingItems.filter((it) => {
    const l = lines[it.id];
    if (!l) return false;
    const q = Number(l.qty);
    return (
      l.qty !== "" &&
      !Number.isNaN(q) &&
      q > 0 &&
      q <= (it.remaining_qty ?? 0) &&
      !!l.destBinId
    );
  });

  const canSubmit =
    canReceiveTransfer &&
    !!transferId &&
    pendingItems.length > 0 &&
    validLines.length > 0 &&
    !receiveMut.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const over = pendingItems.find((it) => {
      const l = lines[it.id];
      return l && Number(l.qty) > (it.remaining_qty ?? 0);
    });
    if (over) {
      toast.error("Qty Terima melebihi jumlah yang tersedia.");
      return;
    }

    receiveMut.mutate(
      {
        id: transferId,
        payload: {
          notes: notes.trim() || undefined,
          items: validLines.map((it) => ({
            bin_transfer_item_id: it.id,
            destination_bin_id: lines[it.id].destBinId,
            qty: Number(lines[it.id].qty),
          })),
        },
      },
      {
        onSuccess: () => {
          router.push(LIST_HREF);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        title="Penerimaan Transfer Barang"
        backHref={LIST_HREF}
        breadcrumb={[
          { label: "Persediaan" },
          { label: "Transaksi Stok", href: LIST_HREF },
          { label: "Transfer Internal", href: LIST_HREF },
          { label: "Penerimaan Transfer Barang" },
        ]}
      />

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="grid grid-cols-1 gap-4 px-5 py-5 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">
                No. Transfer Asal <span className="text-destructive">*</span>
              </Label>
              <Combobox
                options={transferOptions}
                value={transferId}
                onChange={(v) => setTransferId(v ?? "")}
                placeholder={
                  transitLoading
                    ? "Memuat…"
                    : "Pilih transfer yang sedang dijalan"
                }
                searchPlaceholder="Cari no. transfer…"
                emptyText="Tidak ada transfer sedang dijalan"
                disabled={transitLoading || !canReceiveTransfer}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Lokasi</Label>
              <Input
                value={trf?.location?.location_name ?? "—"}
                readOnly
                className="bg-muted/40"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 hidden">
              {/* Removed as requested by user */}
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label className="text-sm font-medium">Keterangan</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Masukkan Keterangan"
                rows={4}
                className="flex-1"
                disabled={!canReceiveTransfer}
              />
            </div>
          </div>
        </div>
      </LiquidGlass>

      {!transferId ? (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            i
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Pilih No. Transfer Asal
            </p>
            <p className="text-xs text-muted-foreground">
              Pilih transfer yang sedang dijalan untuk memuat item yang perlu
              ditempatkan ke rak tujuan.
            </p>
          </div>
        </div>
      ) : (
        <LiquidGlass
          radius={16}
          intensity="subtle"
          className="bg-white/40 dark:bg-white/[0.06]"
        >
          <div className="flex flex-col gap-4 px-5 py-5">
            <Label className="text-sm font-medium">
              Item yang Diterima <span className="text-destructive">*</span>
            </Label>

            <Table containerClassName="rounded-lg border border-border">
              <TableHeader className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <TableRow>
                  <TableHead className="px-3 py-2.5 text-muted-foreground">
                    Produk
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-muted-foreground">
                    Rak Asal
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-right text-muted-foreground">
                    Sisa
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-muted-foreground">
                    Rak Tujuan
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-right text-muted-foreground">
                    Qty Terima
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {detailLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-3 py-12 text-center">
                      <Loader2Icon className="mx-auto size-5 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : pendingItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-3 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <PackageSearchIcon className="h-7 w-7 opacity-40" />
                        <p className="text-sm">
                          Semua item pada transfer ini sudah diterima.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingItems.map((it) => {
                    const p = it.product as
                      | (NonNullable<typeof it.product> & {
                          thumbnail_url?: string | null;
                        })
                      | null
                      | undefined;
                    const image = p?.thumbnail_url ?? null;
                    const line = lines[it.id];
                    const qtyNum = Number(line?.qty ?? "");
                    const remaining = it.remaining_qty ?? 0;
                    const qtyOver =
                      line?.qty !== "" && qtyNum > 0 && qtyNum > remaining;
                    return (
                      <TableRow key={it.id} className="bg-background/50">
                        <TableCell className="px-3 py-2.5 align-top">
                          <div className="flex max-w-[280px] items-start gap-3">
                            {image ? (
                              <Image
                                src={image}
                                alt={p?.product?.name ?? p?.sku ?? "Produk"}
                                width={40}
                                height={40}
                                className="h-10 w-10 shrink-0 rounded-xl border border-border object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                                <PackageSearchIcon className="size-5 text-muted-foreground/40" />
                              </div>
                            )}
                            <div className="flex min-w-0 flex-col gap-0.5">
                              <p className="whitespace-normal break-words text-sm font-medium">
                                {p?.product?.name ?? "—"}
                              </p>
                              {p?.variant_label && (
                                <p className="whitespace-normal break-words text-xs text-muted-foreground">
                                  {p.variant_label}
                                </p>
                              )}
                              <p className="whitespace-normal break-all font-mono text-xs text-muted-foreground">
                                {p?.sku ?? "—"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2.5 font-mono text-xs text-foreground">
                          {it.source_bin?.bin_final_code ?? "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground">
                          {remaining}
                        </TableCell>
                        <TableCell className="px-3 py-2.5">
                          <DestinationBinCombobox
                            locationId={locationId}
                            value={line?.destBinId ?? ""}
                            onChange={(v) =>
                              updateLine(it.id, { destBinId: v ?? "" })
                            }
                            disabled={!canReceiveTransfer || !locationId}
                            allocatedBinId={it.destination_bin?.id ?? null}
                            allocatedBinCode={
                              it.destination_bin?.bin_final_code ?? null
                            }
                          />
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-right">
                          <QtyConfirmInput
                            min={1}
                            max={remaining}
                            expected={remaining}
                            value={
                              line?.qty === "" || line?.qty === undefined
                                ? ""
                                : Number(line.qty)
                            }
                            onChange={(v) =>
                              updateLine(it.id, {
                                qty: v === "" ? "" : String(v),
                              })
                            }
                            onEnter={() => {}}
                            placeholder="0"
                            disabled={!canReceiveTransfer}
                            className={cn(
                              "h-9 w-24 text-right",
                              qtyOver &&
                                "border-destructive ring-1 ring-destructive/30",
                            )}
                          />
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            maks {remaining}
                          </p>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {pendingItems.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {validLines.length} dari {pendingItems.length} item siap
                diterima. Qty Terima boleh kurang dari sisa (sisanya tetap
                Sedang Dijalan). Jika semua item diterima penuh, transfer
                menjadi Selesai.
              </p>
            )}
          </div>
        </LiquidGlass>
      )}

      <FormFooter>
        <Button variant="outline" onClick={() => router.push(LIST_HREF)}>
          Batal
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {receiveMut.isPending && (
            <Loader2Icon className="mr-2 size-4 animate-spin" />
          )}
          Simpan
        </Button>
      </FormFooter>
    </div>
  );
}
