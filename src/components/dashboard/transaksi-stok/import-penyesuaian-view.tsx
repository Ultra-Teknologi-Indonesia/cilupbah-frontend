"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  DownloadIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  UploadCloudIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserSelect } from "@/components/dashboard/shared/user-select";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import {
  usePreviewStockAdjustmentImport,
  useConfirmStockAdjustmentImport,
} from "@/hooks/transaksi-stok/use-stock-adjustment-import";

// eslint-disable-next-line no-restricted-imports
import { StockAdjustmentImportService } from "@/services/transaksi-stok/stock-adjustment-import.service";
import type {
  ImportPreviewResponse,
  ImportPreviewError,
  ImportPreviewWarning,
} from "@/types/transaksi-stok/stock-adjustment-import";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ImportPenyesuaianDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportPenyesuaianDialog({
  open,
  onOpenChange,
}: ImportPenyesuaianDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [locationId, setLocationId] = useState("");
  const [transactionDate, setTransactionDate] = useState(todayStr);
  const [adjustmentNo, setAdjustmentNo] = useState("[auto]");
  const [notes, setNotes] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);

  const { data: locData } = useLocations({ perPage: 100 });
  const previewMut = usePreviewStockAdjustmentImport();
  const confirmMut = useConfirmStockAdjustmentImport();

  const locationOptions = useMemo(
    () =>
      (locData?.items ?? []).map((l) => ({
        value: l.id,
        label: l.locationName,
      })),
    [locData],
  );

  const handleReset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setNotes("");
    setAdjustmentNo("[auto]");
    setTransactionDate(todayStr());
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleClose = useCallback(
    (v: boolean) => {
      if (!v) handleReset();
      onOpenChange(v);
    },
    [onOpenChange, handleReset],
  );

  const handlePickFile = (f: File | null) => {
    setFile(f);
    setPreview(null);
  };

  const handleDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handlePickFile(f);
  };

  const handlePreview = () => {
    if (!file || !locationId) return;
    previewMut.mutate(
      { file, locationId },
      {
        onSuccess: (res) => setPreview(res.data),
      },
    );
  };

  const handleConfirm = () => {
    if (!preview || !createdBy.trim()) return;
    confirmMut.mutate(
      {
        preview_token: preview.token,
        transaction_date: transactionDate,
        created_by: createdBy.trim(),
        notes: notes.trim() || undefined,
        adjustment_no:
          adjustmentNo.trim() === "" || adjustmentNo.trim() === "[auto]"
            ? undefined
            : adjustmentNo.trim(),
      },
      { onSuccess: () => handleClose(false) },
    );
  };

  const canPreview = !!file && !!locationId && !previewMut.isPending;
  const canConfirm =
    !!preview &&
    preview.items.length > 0 &&
    preview.errors.length === 0 &&
    !!createdBy.trim() &&
    !confirmMut.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          "flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0",
          preview
            ? "h-[min(90vh,860px)] w-[calc(100vw-2rem)] max-w-[95vw] sm:max-w-6xl"
            : "w-full sm:max-w-2xl",
        )}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>
            {preview ? "Periksa Import Penyesuaian Stok" : "Import Penyesuaian Stok"}
          </DialogTitle>
          {preview && (
            <p className="text-xs text-muted-foreground">
              Tinjau hasil validasi sebelum menyimpan perubahan stok
            </p>
          )}
        </DialogHeader>

        <ScrollArea
          className="min-h-0 flex-1 overflow-hidden"
          viewportClassName="h-full w-full"
        >
          <div className="flex flex-col gap-4 p-6">
            <div className="sr-only" aria-hidden="true">
              <UserSelect
                value={createdBy}
                onChange={setCreatedBy}
                defaultToSelf
              />
            </div>

            {!preview && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium">
                      Tgl. Transaksi <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={transactionDate}
                      onChange={(e) => setTransactionDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium">
                      Lokasi <span className="text-destructive">*</span>
                    </Label>
                    <Combobox
                      options={locationOptions}
                      value={locationId}
                      onChange={(v) => {
                        setLocationId(v ?? "");
                        setPreview(null);
                      }}
                      placeholder="Pilih lokasi…"
                      searchPlaceholder="Cari lokasi…"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium">
                      No. Penyesuaian
                    </Label>
                    <Input
                      value={adjustmentNo}
                      onChange={(e) => setAdjustmentNo(e.target.value)}
                      onFocus={(e) => {
                        if (e.target.value === "[auto]") setAdjustmentNo("");
                      }}
                      onBlur={(e) => {
                        if (e.target.value.trim() === "")
                          setAdjustmentNo("[auto]");
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium">Keterangan</Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Alasan koreksi (opsional)"
                    />
                  </div>
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDropFile}
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/[0.03]",
                    !locationId && "opacity-60",
                  )}
                >
                  <UploadCloudIcon className="h-7 w-7 text-muted-foreground/50" />
                  {file ? (
                    <>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB — klik untuk ganti
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium">
                        Klik atau drag file .xlsx di sini
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {locationId
                          ? "Maksimal 1000 baris"
                          : "Pilih lokasi dulu untuk mulai upload"}
                      </p>
                    </>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    disabled={!locationId}
                    onChange={(e) =>
                      handlePickFile(e.target.files?.[0] ?? null)
                    }
                  />
                </div>

                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <p className="mb-1 text-sm font-medium">
                    Isi salah satu <span className="font-mono">delta_qty</span>{" "}
                    atau <span className="font-mono">final_qty</span> per baris.
                  </p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Gunakan delta untuk menambah atau mengurangi dari stok saat
                    ini, atau final untuk menetapkan stok akhir. Aturan import
                    sama dengan penyesuaian manual; hasil minus akan menjadi
                    warning jika policy stok minus mengizinkannya. Template:
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      StockAdjustmentImportService.downloadTemplate()
                    }
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <DownloadIcon className="size-4" />
                    Template Import Penyesuaian Stok
                  </button>
                </div>
              </>
            )}

            {preview && <PreviewPanel preview={preview} />}
          </div>
        </ScrollArea>

        <div className="shrink-0 border-t bg-background px-6 py-3">
          <div className="flex items-center justify-end gap-2">
            {preview ? (
              <>
                <Button variant="outline" onClick={() => setPreview(null)}>
                  {preview.errors.length > 0
                    ? "Batal & Upload Ulang"
                    : "Kembali"}
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                  className="gap-1.5"
                >
                  {confirmMut.isPending && (
                    <Loader2Icon className="size-4 animate-spin" />
                  )}
                  {preview.errors.length > 0
                    ? `Terdapat ${preview.errors.length} error`
                    : `Konfirmasi Import (${preview.items.length} item)`}
                </Button>
              </>
            ) : (
              <div className="flex w-full items-center justify-end gap-2">
                <Button variant="outline" onClick={() => handleClose(false)}>
                  Batal
                </Button>
                <Button
                  onClick={handlePreview}
                  disabled={!canPreview}
                  className="gap-1.5"
                >
                  {previewMut.isPending && (
                    <Loader2Icon className="size-4 animate-spin" />
                  )}
                  <FileSpreadsheetIcon className="size-4" /> Import
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewPanel({ preview }: { preview: ImportPreviewResponse }) {
  const s = preview.summary;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Ringkasan validasi</p>
          <p className="text-xs text-muted-foreground">
            {preview.items.length.toLocaleString("id-ID")} item siap ditinjau
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          Gulir untuk melihat semua baris
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total Baris" value={s.total_rows} />
        <SummaryCard label="Valid" value={s.valid} tone="ok" />
        <SummaryCard label="Error" value={s.errors} tone="err" />
        <SummaryCard label="Warning" value={s.warnings} tone="warn" />
      </div>

      {(preview.errors.length > 0 || preview.warnings.length > 0) && (
        <div className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-md border border-border bg-muted/20 p-3">
          {preview.errors.map((e: ImportPreviewError, i) => (
            <div
              key={`e${i}`}
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
            >
              {e.error}
            </div>
          ))}
          {preview.warnings.map((w: ImportPreviewWarning, i) => (
            <div
              key={`w${i}`}
              className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning"
            >
              {w.warning}
            </div>
          ))}
        </div>
      )}

      {preview.items.length > 0 && (
        <Table
          containerClassName="rounded-lg border border-border"
          className="min-w-[900px]"
        >
          <TableHeader className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <TableRow>
              <TableHead className="px-3 py-2.5 text-muted-foreground">
                #
              </TableHead>
              <TableHead className="px-3 py-2.5 text-muted-foreground">
                SKU / Produk
              </TableHead>
              <TableHead className="px-3 py-2.5 text-muted-foreground">
                Rak
              </TableHead>
              <TableHead className="px-3 py-2.5 text-muted-foreground">
                Mode
              </TableHead>
              <TableHead className="px-3 py-2.5 text-right text-muted-foreground">
                Input
              </TableHead>
              <TableHead className="px-3 py-2.5 text-right text-muted-foreground">
                On Hand
              </TableHead>
              <TableHead className="px-3 py-2.5 text-right text-muted-foreground">
                Qty Akhir
              </TableHead>
              <TableHead className="px-3 py-2.5 text-right text-muted-foreground">
                Selisih
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {preview.items.map((it, idx) => (
              <TableRow key={it.row_no} className="bg-background/50">
                <TableCell className="px-3 py-2 font-mono text-xs text-muted-foreground">
                  {idx + 1}
                </TableCell>
                <TableCell className="px-3 py-2">
                  <p className="font-medium">{it.product_name || it.sku}</p>
                  <p className="font-mono text-2xs text-muted-foreground">
                    {it.sku}
                  </p>
                </TableCell>
                <TableCell className="px-3 py-2 font-mono text-xs">
                  {it.bin_code}
                </TableCell>
                <TableCell className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded px-2 py-0.5 text-2xs font-medium",
                      it.mode === "DELTA"
                        ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                        : "bg-purple-500/10 text-purple-700 dark:text-purple-400",
                    )}
                  >
                    {it.mode}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2 text-right font-mono tabular-nums">
                  {it.input_value > 0 ? `+${it.input_value}` : it.input_value}
                </TableCell>
                <TableCell className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                  {it.system_qty}
                </TableCell>
                <TableCell className="px-3 py-2 text-right font-mono font-semibold tabular-nums">
                  {it.actual_qty}
                </TableCell>
                <TableCell
                  className={cn(
                    "px-3 py-2 text-right font-mono tabular-nums",
                    it.difference > 0 && "text-success",
                    it.difference < 0 && "text-destructive",
                  )}
                >
                  {it.difference > 0 ? `+${it.difference}` : it.difference}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "err" | "warn";
}) {
  return (
    <div className="rounded-lg border border-border bg-background/50 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-xl font-semibold tabular-nums",
          tone === "ok" && "text-success",
          tone === "err" && "text-destructive",
          tone === "warn" && "text-warning",
        )}
      >
        {value}
      </p>
    </div>
  );
}
