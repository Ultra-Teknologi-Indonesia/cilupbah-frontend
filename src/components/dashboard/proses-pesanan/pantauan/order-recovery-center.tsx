"use client";

import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2Icon,
  Clock3Icon,
  ListChecksIcon,
  Loader2Icon,
  PackageSearchIcon,
  PrinterIcon,
  RotateCwIcon,
  SearchIcon,
  UploadIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import { OrderAuditReport } from "@/components/dashboard/proses-pesanan/pantauan/order-audit-report";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { useOrderAudit, useOrderRecovery } from "@/hooks/proses-pesanan/use-fulfillment";
import { DocActions } from "@/hooks/proses-pesanan/use-doc-actions";
import { apiError } from "@/lib/toast";
import type {
  OrderRecoveryAction,
  OrderRecoveryBatchTarget,
  OrderRecoveryInput,
  OrderRecoveryResult,
} from "@/types/proses-pesanan/order-audit";

const ACTIONS: Array<{ value: OrderRecoveryAction; label: string; description: string }> = [
  { value: "all", label: "Perbaiki semuanya (disarankan)", description: "Cek pesanan, minta atau periksa resi, lalu ambil label yang sudah tersedia." },
  { value: "order", label: "Perbarui pesanan saja", description: "Tarik pesanan yang belum masuk atau perbarui statusnya dari marketplace." },
  { value: "awb", label: "Minta atau cek nomor resi", description: "Minta resi baru atau periksa apakah marketplace sudah menerbitkannya." },
  { value: "label", label: "Ambil label saja", description: "Ambil dan simpan label untuk pesanan yang nomor resinya sudah tersedia." },
];

const RECOVERY_STEPS = [
  {
    icon: SearchIcon,
    title: "Cari pesanan",
    description: "Gunakan filter, lalu centang pesanan yang perlu diperiksa.",
  },
  {
    icon: RotateCwIcon,
    title: "Perbaiki langsung",
    description: "Sistem hanya menjalankan tahap yang masih diperlukan.",
  },
  {
    icon: PrinterIcon,
    title: "Cetak yang siap",
    description: "Pesanan lain tetap berjalan walau sebagian masih menunggu marketplace.",
  },
] as const;

function itemKey(item: OrderRecoveryInput): string {
  return `${item.channel ?? ""}|${item.shopId ?? ""}|${item.reference}`.toLowerCase();
}

function parseReferences(value: string): string[] {
  return Array.from(new Set(
    value
      .split(/[\n,;]+/)
      .map((reference) => reference.trim())
      .filter(Boolean),
  ));
}

function RecoveryGuide() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid gap-4 lg:grid-cols-[220px_1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold">Cara menggunakan halaman ini</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Selesaikan kendala pesanan tanpa menunggu seluruh daftar selesai.
            </p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3">
            {RECOVERY_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="flex gap-3 rounded-xl bg-muted/45 p-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-primary ring-1 ring-border">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{index + 1}. {step.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultSummary({ result }: { result: OrderRecoveryResult }) {
  const ready = result.summary.ready + result.summary.success;
  const waiting = result.summary.waiting_marketplace + result.summary.busy;
  const needsAttention = result.summary.failed + result.summary.timed_out;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="flex items-center gap-3 rounded-xl bg-success/10 p-3 text-success">
        <CheckCircle2Icon className="size-5 shrink-0" />
        <div>
          <p className="text-xl font-semibold tabular-nums">{ready}</p>
          <p className="text-xs">Siap atau berhasil</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-warning/10 p-3 text-warning">
        <Clock3Icon className="size-5 shrink-0" />
        <div>
          <p className="text-xl font-semibold tabular-nums">{waiting}</p>
          <p className="text-xs">Masih menunggu</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-destructive/10 p-3 text-destructive">
        <XCircleIcon className="size-5 shrink-0" />
        <div>
          <p className="text-xl font-semibold tabular-nums">{needsAttention}</p>
          <p className="text-xs">Perlu diperiksa</p>
        </div>
      </div>
    </div>
  );
}

function ResultTable({ result }: { result: OrderRecoveryResult }) {
  if (result.items.length === 0) {
    return (
      <EmptyState
        title={result.batch ? "Tidak ada pesanan batch yang perlu diperbaiki" : "Belum ada hasil pemeriksaan"}
        description={result.batch ? "Seluruh pesanan yang dapat diakses pada batch ini sudah memiliki resi dan label siap." : "Masukkan nomor pesanan lalu jalankan pemeriksaan."}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-4xl border border-border/70">
      <table className="w-full min-w-[920px] text-sm">
        <thead className="bg-muted/45 text-left text-xs text-muted-foreground">
          <tr>
            <th className="p-3 font-medium">Pesanan</th>
            <th className="p-3 font-medium">Channel</th>
            <th className="p-3 font-medium">Hasil</th>
            <th className="p-3 font-medium">No. resi</th>
            <th className="p-3 font-medium">Keterangan</th>
            <th className="p-3 text-right font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {result.items.map((item) => (
            <tr key={`${item.reference}-${item.shopId ?? ""}`} className="align-top">
              <td className="p-3">
                <p className="font-mono text-xs font-medium">{item.reference}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.internalOrderNo || "Belum tercatat di WMS"}</p>
              </td>
              <td className="p-3 capitalize">{item.channel || "—"}</td>
              <td className="p-3"><StatusBadge domain="order-recovery" status={item.status} /></td>
              <td className="p-3 font-mono text-xs">{item.trackingNumber || "—"}</td>
              <td className="max-w-md p-3 text-xs text-muted-foreground">{item.message}</td>
              <td className="p-3 text-right">
                {item.labelReady && item.orderId ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void DocActions.shippingLabel([{ id: item.orderId!, source: item.channel }])}
                  >
                    <PrinterIcon /> Cetak label
                  </Button>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecoveryPanel({
  selected,
  clearSelected,
  result,
  onResult,
  onContinueBatch,
  externalBusy,
}: {
  selected: OrderRecoveryInput[];
  clearSelected: () => void;
  result: OrderRecoveryResult | null;
  onResult: (result: OrderRecoveryResult) => void;
  onContinueBatch: (batch: OrderRecoveryBatchTarget) => void;
  externalBusy: boolean;
}) {
  const [text, setText] = useState("");
  const [action, setAction] = useState<OrderRecoveryAction>("all");
  const [channel, setChannel] = useState("");
  const [shopId, setShopId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { can } = usePermissions();
  const { shops } = useOrderAudit();
  const { sync, importFile } = useOrderRecovery();
  const canEdit = can("edit-pesanan");
  const busy = sync.isPending || importFile.isPending || externalBusy;
  const filteredShops = shops.filter((shop) => !channel || shop.channel === channel);
  const actionMeta = ACTIONS.find((item) => item.value === action) ?? ACTIONS[0];

  const items = useMemo(() => {
    const combined = new Map<string, OrderRecoveryInput>();
    for (const item of selected) combined.set(itemKey(item), item);
    for (const reference of parseReferences(text)) {
      const item = { reference, channel: channel || null, shopId: shopId || null };
      combined.set(itemKey(item), item);
    }
    return Array.from(combined.values());
  }, [channel, selected, shopId, text]);

  async function runSync() {
    if (!canEdit) return;
    if (items.length === 0) {
      toast.error("Masukkan atau pilih minimal satu nomor pesanan.");
      return;
    }
    if (items.length > 20) {
      toast.error("Maksimum 20 pesanan untuk sekali pemeriksaan.");
      return;
    }

    try {
      const next = await sync.mutateAsync({ action, items });
      onResult(next);
      toast.success(`Berhasil memeriksa ${next.summary.total} pesanan.`);
    } catch (error) {
      apiError(error, "Gagal memeriksa dan memperbaiki pesanan.");
    }
  }

  async function runImport() {
    if (!canEdit || !file) {
      toast.error("Pilih file Excel atau CSV terlebih dahulu.");
      return;
    }
    try {
      const next = await importFile.mutateAsync({ action, file, channel: channel || null, shopId: shopId || null });
      onResult(next);
      toast.success(`Berhasil memeriksa ${next.summary.total} pesanan dari file.`);
    } catch (error) {
      apiError(error, "Gagal memeriksa file pesanan.");
    }
  }

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium text-primary">Langkah 2</p>
            <h2 className="mt-1 text-base font-semibold">Periksa dan perbaiki pesanan</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Jalankan hanya tahap yang dibutuhkan. Pesanan yang sudah siap tidak diproses ulang dan pesanan yang masih menunggu marketplace tidak menahan pesanan lain.
            </p>
          </div>
          <div className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
            Hasil langsung · maksimum 20 pesanan
          </div>
        </div>

        {selected.length > 0 ? (
          <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <ListChecksIcon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{selected.length} pesanan dipilih dari tabel</p>
                <p className="mt-1 text-xs text-muted-foreground">Anda dapat menambahkan nomor lain sampai batas 20 pesanan.</p>
              </div>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={clearSelected} disabled={busy}>
              Hapus pilihan
            </Button>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(300px,1.4fr)_minmax(220px,.8fr)_minmax(220px,.8fr)]">
          <div className="space-y-2">
            <label htmlFor="recovery-references" className="text-sm font-semibold">
              {selected.length > 0 ? "Tambahkan nomor pesanan (opsional)" : "Nomor pesanan"}
            </label>
            <Textarea
              id="recovery-references"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Satu nomor per baris, atau pisahkan dengan koma"
              className="min-h-32"
              disabled={!canEdit || busy}
            />
            <p className="text-xs text-muted-foreground">{items.length}/20 pesanan akan diperiksa.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="recovery-action" className="text-sm font-semibold">Proses</label>
              <select
                id="recovery-action"
                value={action}
                onChange={(event) => setAction(event.target.value as OrderRecoveryAction)}
                className="h-10 w-full rounded-full border border-input bg-background px-3 text-sm"
                disabled={!canEdit || busy}
              >
                {ACTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">{actionMeta.description}</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="recovery-channel" className="text-sm font-semibold">Marketplace untuk input manual</label>
              <select
                id="recovery-channel"
                value={channel}
                onChange={(event) => { setChannel(event.target.value); setShopId(""); }}
                className="h-10 w-full rounded-full border border-input bg-background px-3 text-sm"
                disabled={!canEdit || busy}
              >
                <option value="">Cari otomatis dari data yang tersedia</option>
                <option value="shopee">Shopee</option>
                <option value="tiktok">TikTok Shop</option>
                <option value="lazada">Lazada</option>
                <option value="woocommerce">WooCommerce</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="recovery-shop" className="text-sm font-semibold">Toko</label>
              <select
                id="recovery-shop"
                value={shopId}
                onChange={(event) => setShopId(event.target.value)}
                className="h-10 w-full rounded-full border border-input bg-background px-3 text-sm"
                disabled={!canEdit || busy || !channel}
              >
                <option value="">Pilih toko</option>
                {filteredShops.map((shop) => <option key={shop.id} value={shop.shopId}>{shop.shopName}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold">Jalankan pemeriksaan</p>
              <p className="text-xs text-muted-foreground">
                Hasil tampil di halaman ini. Marketplace yang belum siap akan diberi status menunggu.
              </p>
              <Button type="button" size="lg" className="w-full" onClick={() => void runSync()} disabled={!canEdit || busy || items.length === 0 || items.length > 20}>
                {sync.isPending ? <Loader2Icon className="animate-spin" /> : <RotateCwIcon />}
                Periksa dan perbaiki sekarang
              </Button>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              atau gunakan file
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-2">
              <label htmlFor="recovery-file" className="text-sm font-semibold">Excel atau CSV</label>
              <Input
                ref={fileRef}
                id="recovery-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                disabled={!canEdit || busy}
              />
              <p className="text-xs text-muted-foreground">Kolom: nomor_pesanan/order_no/order_id. Maksimum 2 MiB dan 20 nomor unik.</p>
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={() => void runImport()} disabled={!canEdit || busy || !file}>
              {importFile.isPending ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
              Periksa file sekarang
            </Button>
            {!canEdit ? <p className="text-xs text-destructive">Anda memerlukan izin edit pesanan untuk menjalankan perbaikan.</p> : null}
          </div>
        </div>

        {result ? (
          <div className="space-y-4 border-t border-border/60 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Hasil pemeriksaan</h3>
                <p className="mt-1 text-xs text-muted-foreground">Selesai dalam {(result.durationMs / 1000).toFixed(1)} detik.</p>
                {result.batch ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Batch #{result.batch.id.slice(0, 8)} · {result.processedInRequest ?? 0} diperiksa, {result.remaining ?? 0} masih perlu dilanjutkan
                  </p>
                ) : null}
              </div>
              {result.batch && (
                result.hasMore
                || result.summary.waiting_marketplace > 0
                || result.summary.busy > 0
                || result.summary.timed_out > 0
                || result.summary.failed > 0
              ) ? (
                <Button
                  type="button"
                  onClick={() => onContinueBatch({
                    id: result.batch!.id,
                    total: result.batch!.total,
                    done: result.batch!.done,
                    failed: result.batch!.failed,
                  })}
                  disabled={busy}
                >
                  <RotateCwIcon />
                  {result.hasMore
                    ? `Lanjutkan ${Math.min(result.remaining ?? 0, 20)} pesanan berikutnya`
                    : "Periksa lagi batch ini"}
                </Button>
              ) : null}
            </div>
            <ResultSummary result={result} />
            <ResultTable result={result} />
          </div>
        ) : (
          <div className="border-t border-border/60 pt-6">
            <EmptyState
              icon={PackageSearchIcon}
              title="Belum ada hasil pemeriksaan"
              description="Pilih pesanan dari tabel atau masukkan nomor pesanan untuk mulai."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OrderRecoveryCenter() {
  const [selected, setSelected] = useState<OrderRecoveryInput[]>([]);
  const [result, setResult] = useState<OrderRecoveryResult | null>(null);
  const [pendingBatch, setPendingBatch] = useState<OrderRecoveryBatchTarget | null>(null);
  const recoveryRef = useRef<HTMLDivElement>(null);
  const { syncBatch } = useOrderRecovery();

  function scrollToRecovery() {
    recoveryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function runBatchSync() {
    if (!pendingBatch) return;

    try {
      const next = await syncBatch.mutateAsync(pendingBatch.id);
      setResult(next);
      setPendingBatch(null);
      requestAnimationFrame(scrollToRecovery);
      if (next.hasMore) {
        toast.success(`Berhasil memeriksa ${next.processedInRequest ?? 0} pesanan. Lanjutkan ${next.remaining ?? 0} pesanan yang tersisa.`);
      } else {
        toast.success("Berhasil menyelesaikan pemeriksaan batch.");
      }
    } catch (error) {
      apiError(error, "Gagal memperbaiki batch.");
    }
  }

  return (
    <div className="space-y-6">
      <RecoveryGuide />
      <OrderAuditReport
        selected={selected}
        onSelectionChange={setSelected}
        onContinueSelected={scrollToRecovery}
        onSyncBatch={setPendingBatch}
        syncingBatchId={syncBatch.isPending ? (syncBatch.variables ?? null) : null}
      />
      <div ref={recoveryRef} className="scroll-mt-6">
        <RecoveryPanel
          selected={selected}
          clearSelected={() => setSelected([])}
          result={result}
          onResult={setResult}
          onContinueBatch={setPendingBatch}
          externalBusy={syncBatch.isPending}
        />
      </div>

      <ConfirmDialog
        open={pendingBatch !== null}
        onOpenChange={(open) => { if (!open) setPendingBatch(null); }}
        title={`Perbaiki batch #${pendingBatch?.id.slice(0, 8) ?? ""}?`}
        description="Sistem akan memeriksa maksimal 20 pesanan yang belum selesai. Pesanan yang sudah siap tidak diproses ulang, sementara batch dan proses lain tetap berjalan."
        confirmLabel="Perbaiki batch sekarang"
        loading={syncBatch.isPending}
        onConfirm={() => void runBatchSync()}
      >
        {pendingBatch ? (
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/45 p-4 text-center">
            <div>
              <p className="text-lg font-semibold tabular-nums">{pendingBatch.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums text-success">{pendingBatch.done}</p>
              <p className="text-xs text-muted-foreground">Sudah siap</p>
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums text-warning">{Math.max(0, pendingBatch.total - pendingBatch.done)}</p>
              <p className="text-xs text-muted-foreground">Belum siap</p>
            </div>
            {pendingBatch.failed > 0 ? (
              <p className="col-span-3 border-t border-border pt-3 text-left text-xs text-muted-foreground">
                {pendingBatch.failed} pesanan sebelumnya gagal dan akan diperiksa kembali jika masih dapat diproses.
              </p>
            ) : null}
          </div>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
