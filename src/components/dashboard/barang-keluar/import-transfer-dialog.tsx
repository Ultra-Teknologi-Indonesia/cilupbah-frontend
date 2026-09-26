"use client";

import * as React from "react";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  Loader2Icon,
  SearchIcon,
  SearchXIcon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  downloadImportTransferTemplate,
  useImportTransferConfirm,
  useImportTransferPreview,
} from "@/hooks/barang-keluar/use-outbound-transfers";
import { apiError } from "@/lib/toast";
import type { TransferImportPreview } from "@/types/barang-keluar/transfer-import";

const ACCEPT = ".xlsx,.xls";
const MAX_SIZE = 5 * 1024 * 1024;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createdBy: string;
}

function StatusPill({ status }: { status: "ready" | "error" }) {
  return status === "ready" ? (
    <Badge
      variant="outline"
      className="inline-flex shrink-0 items-center border-emerald-500/30 bg-emerald-500/10 font-medium text-emerald-600 dark:text-emerald-400"
    >
      <CheckCircle2Icon className="mr-1 size-3" />
      Siap dibuat
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="inline-flex shrink-0 items-center border-rose-500/30 bg-rose-500/10 font-medium text-rose-600 dark:text-rose-400"
    >
      <AlertCircleIcon className="mr-1 size-3" />
      Error
    </Badge>
  );
}

export function ImportTransferDialog({ open, onOpenChange, createdBy }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [preview, setPreview] = React.useState<TransferImportPreview | null>(
    null,
  );
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "ready" | "error"
  >("all");

  const previewMut = useImportTransferPreview();
  const confirmMut = useImportTransferConfirm();

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true);
      await downloadImportTransferTemplate();
      toast.success("Template berhasil didownload");
    } catch (err: unknown) {
      apiError(err, "Gagal mendownload template");
    } finally {
      setIsDownloading(false);
    }
  };

  const reset = React.useCallback(() => {
    setFile(null);
    setPreview(null);
    setDragOver(false);
    setSearch("");
    setStatusFilter("all");
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_SIZE) {
      toast.error("File terlalu besar. Maksimal 5 MB.");
      return;
    }
    setFile(f);
    setPreview(null);
  };

  const runPreview = async () => {
    if (!file) return;
    try {
      const result = await previewMut.mutateAsync(file);
      setPreview(result);
    } catch (err: unknown) {
      apiError(err, "Gagal memproses file pratinjau");
    }
  };

  const runConfirm = async () => {
    if (!preview) return;
    if (!createdBy) {
      toast.error("Sesi pengguna tidak ditemukan. Muat ulang halaman.");
      return;
    }
    try {
      const res = await confirmMut.mutateAsync({
        token: preview.token,
        createdBy,
      });
      if (res.failed > 0) {
        toast.warning(`${res.created} transfer dibuat, ${res.failed} gagal.`);
      } else {
        toast.success(`Berhasil membuat ${res.created} transfer keluar.`);
      }
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      apiError(err, "Gagal membuat transfer keluar");
    }
  };

  const summary = preview?.summary;
  const previewTransfers = preview?.transfers;

  const filteredTransfers = React.useMemo(() => {
    if (!previewTransfers) return [];
    return previewTransfers.filter((doc) => {
      if (statusFilter !== "all" && doc.status !== statusFilter) {
        return false;
      }
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      const matchRef = doc.ref_no?.toLowerCase().includes(s);
      const matchSource = doc.source_location?.toLowerCase().includes(s);
      const matchDest = doc.destination_location?.toLowerCase().includes(s);
      const matchItems = doc.items.some(
        (it) =>
          it.sku?.toLowerCase().includes(s) ||
          it.product_name?.toLowerCase().includes(s) ||
          it.kode_rak?.toLowerCase().includes(s),
      );
      return matchRef || matchSource || matchDest || matchItems;
    });
  }, [previewTransfers, search, statusFilter]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0 duration-200",
          preview
            ? "h-[92vh] max-h-[920px] w-[96vw] max-w-[96vw] sm:max-w-[96vw] md:max-w-5xl lg:max-w-6xl xl:max-w-7xl sm:rounded-3xl"
            : "h-auto max-h-[90vh] w-[92vw] max-w-xl sm:max-w-xl sm:rounded-3xl",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border/70 bg-background px-6 py-4">
          <DialogTitle className="text-xl font-semibold text-foreground">
            Import Transfer Keluar
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
            Unduh template, isi data transfer per baris, simpan sebagai Excel,
            lalu unggah untuk pratinjau sebelum dokumen dibuat.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="flex flex-1 flex-col justify-between overflow-y-auto p-6">
            <div className="flex flex-col gap-5">
              <button
                type="button"
                disabled={isDownloading}
                onClick={handleDownloadTemplate}
                className="flex items-center gap-3.5 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3.5 text-left text-sm transition-colors hover:bg-primary/10 disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2Icon className="size-5 shrink-0 animate-spin text-primary" />
                ) : (
                  <DownloadIcon className="size-5 shrink-0 text-primary" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-primary">
                    {isDownloading
                      ? "Mengunduh Template..."
                      : "Unduh Template Excel"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    template-import-transfer-keluar.xlsx (Format kolom sesuai
                    standar sistem)
                  </div>
                </div>
              </button>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFile(e.dataTransfer.files[0]);
                }}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/20",
                )}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                {file ? (
                  <>
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                      <FileSpreadsheetIcon className="size-7" />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-foreground">
                        {file.name}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Ukuran file: {(file.size / 1024).toFixed(1)} KB — Siap
                        dipratinjau
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                      <UploadIcon className="size-6" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        Drag &amp; drop file Excel ke sini, atau klik untuk
                        memilih file
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Mendukung format .xlsx dan .xls (Maksimal ukuran 5 MB)
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button
                variant="primary"
                disabled={!file || previewMut.isPending}
                onClick={runPreview}
              >
                {previewMut.isPending ? (
                  <>
                    <Loader2Icon className="mr-1.5 size-4 animate-spin" />
                    Memproses Pratinjau...
                  </>
                ) : (
                  "Pratinjau Data"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col justify-between overflow-hidden">
            {/* Top Content: Stats, Errors, Filters */}
            <div className="shrink-0 space-y-3 p-5 pb-3">
              {/* Summary Stat Cards */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3.5 py-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <FileTextIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">
                      Total Baris
                    </div>
                    <div className="text-lg font-bold tracking-tight text-foreground">
                      {summary?.total_rows ?? 0}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      Dokumen Siap
                    </div>
                    <div className="text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                      {summary?.valid_docs ?? 0}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3.5 py-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <AlertCircleIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-rose-700 dark:text-rose-300">
                      Error
                    </div>
                    <div className="text-lg font-bold tracking-tight text-rose-600 dark:text-rose-400">
                      {summary?.errors ?? 0}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <AlertTriangleIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      Peringatan
                    </div>
                    <div className="text-lg font-bold tracking-tight text-amber-600 dark:text-amber-400">
                      {summary?.warnings ?? 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Error alerts box if global errors exist */}
              {preview.errors.length > 0 && (
                <div className="max-h-24 overflow-y-auto rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2 text-xs text-destructive">
                  <div className="font-semibold">
                    Ditemukan {preview.errors.length} baris bermasalah:
                  </div>
                  <div className="mt-1 space-y-1">
                    {preview.errors.slice(0, 10).map((e, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="font-mono font-medium">
                          Baris {e.row}:
                        </span>
                        <span>{e.error}</span>
                      </div>
                    ))}
                    {preview.errors.length > 10 && (
                      <div className="italic text-muted-foreground">
                        +{preview.errors.length - 10} error lainnya…
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Search & Filter Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="relative w-full max-w-sm">
                  <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cari no transfer, gudang, atau SKU..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 pl-9 text-xs"
                  />
                </div>

                <div className="flex items-center gap-1.5 rounded-lg bg-muted/60 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={cn(
                      "rounded-md px-2.5 py-1 font-medium transition-colors",
                      statusFilter === "all"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Semua ({preview.transfers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("ready")}
                    className={cn(
                      "rounded-md px-2.5 py-1 font-medium transition-colors",
                      statusFilter === "ready"
                        ? "bg-background text-emerald-600 shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Siap Dibuat ({summary?.valid_docs ?? 0})
                  </button>
                  {(summary?.errors ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setStatusFilter("error")}
                      className={cn(
                        "rounded-md px-2.5 py-1 font-medium transition-colors",
                        statusFilter === "error"
                          ? "bg-background text-rose-600 shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Error ({summary?.errors ?? 0})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table Container (Fills remaining height, internal scroll with sticky header) */}
            <div className="min-h-0 flex-1 px-5">
              <div className="h-full overflow-auto rounded-xl border border-border/80 bg-card">
                {filteredTransfers.length === 0 ? (
                  <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 p-8 text-center">
                    <SearchXIcon className="size-8 text-muted-foreground" />
                    <div className="text-sm font-medium text-muted-foreground">
                      Tidak ada dokumen transfer yang sesuai dengan pencarian
                    </div>
                  </div>
                ) : (
                  <Table className="w-full min-w-[900px]">
                    <TableHeader className="sticky top-0 z-20 border-b border-border/80 bg-muted/95 backdrop-blur-sm">
                      <TableRow className="border-b border-border/80 text-left text-xs uppercase tracking-wider text-muted-foreground hover:bg-transparent">
                        <TableHead className="w-[140px] px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider">
                          No Transfer
                        </TableHead>
                        <TableHead className="w-[200px] px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider">
                          Rute Transfer
                        </TableHead>
                        <TableHead className="w-[80px] px-3.5 py-2.5 text-center text-xs font-semibold uppercase tracking-wider">
                          Item
                        </TableHead>
                        <TableHead className="w-[130px] px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider">
                          Status
                        </TableHead>
                        <TableHead className="px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider">
                          Daftar SKU &amp; Kuantitas
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransfers.map((doc, i) => (
                        <TableRow
                          key={i}
                          className="border-b border-border/40 align-top transition-colors hover:bg-muted/30 last:border-0"
                        >
                          <TableCell className="px-3.5 py-3 font-mono text-xs font-semibold text-foreground">
                            <span className="inline-block rounded-md bg-muted/70 px-2 py-1">
                              {doc.ref_no || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="px-3.5 py-3 text-xs">
                            <div className="inline-flex items-center gap-1.5 font-medium text-foreground">
                              <span>{doc.source_location || "—"}</span>
                              <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                              <span>{doc.destination_location || "—"}</span>
                            </div>
                            {doc.notes && (
                              <div className="mt-1 text-[11px] text-muted-foreground">
                                Catatan: {doc.notes}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="px-3.5 py-3 text-center">
                            <Badge
                              variant="secondary"
                              className="font-mono text-xs font-semibold"
                            >
                              {doc.item_count}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-3.5 py-3">
                            <StatusPill status={doc.status} />
                          </TableCell>
                          <TableCell className="px-3.5 py-3">
                            {doc.status === "error" ? (
                              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
                                {doc.errors.join("; ")}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {doc.items.map((it, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-2 py-1 font-mono text-[11px] text-foreground transition-colors hover:border-primary/40 hover:bg-muted/70"
                                    title={`${it.product_name || it.sku} (Jumlah: ${it.qty} pcs)${it.kode_rak ? ` • Rak: ${it.kode_rak}` : ""}`}
                                  >
                                    <span className="font-semibold text-foreground">
                                      {it.sku}
                                    </span>
                                    <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-bold text-primary">
                                      ×{it.qty}
                                    </span>
                                    {it.kode_rak && (
                                      <span className="border-l border-border/80 pl-1 text-[10px] text-muted-foreground">
                                        {it.kode_rak}
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>

            {/* Bottom Footer Actions (Pinned at bottom) */}
            <div className="shrink-0 flex items-center justify-between border-t border-border/70 bg-muted/20 px-6 py-3.5">
              <div className="text-xs text-muted-foreground">
                Menampilkan{" "}
                <span className="font-semibold text-foreground">
                  {filteredTransfers.length}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-foreground">
                  {preview.transfers.length}
                </span>{" "}
                dokumen
              </div>

              <div className="flex items-center gap-2.5">
                <Button variant="outline" onClick={reset}>
                  Ganti File
                </Button>
                <Button
                  variant="primary"
                  disabled={
                    (summary?.valid_docs ?? 0) === 0 || confirmMut.isPending
                  }
                  onClick={runConfirm}
                >
                  {confirmMut.isPending ? (
                    <>
                      <Loader2Icon className="mr-1.5 size-4 animate-spin" />
                      Membuat Transfer...
                    </>
                  ) : (
                    <>
                      Terapkan{" "}
                      {(summary?.valid_docs ?? 0) > 0
                        ? `(${summary?.valid_docs} Dokumen Siap)`
                        : ""}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
