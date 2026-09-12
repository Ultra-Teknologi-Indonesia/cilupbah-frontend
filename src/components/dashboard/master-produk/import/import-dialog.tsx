"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
  UploadIcon,
  XCircleIcon,
} from "lucide-react";

import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  downloadImportErrors,
  downloadImportTemplate,
  useConfirmImportBatch,
  useImportBatch,
  useImportBatchRows,
  useImportFile,
  type ImportBatch,
  type ImportBatchType,
  type ImportRowStatus,
} from "@/hooks/master-produk/use-import";
import { apiError } from "@/lib/toast";

const ACCEPT = ".xlsx,.xls,.csv";
const MAX_SIZE = 20 * 1024 * 1024;

interface Props {
  type: ImportBatchType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQueued?: () => void;
}

export function ImportDialog({ type, open, onOpenChange, onQueued }: Props) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [sizeError, setSizeError] = React.useState(false);
  const [batchId, setBatchId] = React.useState<string | null>(null);

  const importFile = useImportFile();
  const confirmMut = useConfirmImportBatch();
  const { data: batch } = useImportBatch(batchId);

  const title =
    type === "single" ? "Import Produk Satuan" : "Import Produk Bundle";
  const description =
    type === "single"
      ? "Unggah file Excel produk satuan. Sistem akan memvalidasi data dan menampilkan pratinjau sebelum disimpan."
      : "Unggah file Excel komposisi bundle. Sistem akan memvalidasi SKU komponen sebelum disimpan.";

  const reset = React.useCallback(() => {
    setFile(null);
    setSizeError(false);
    setBatchId(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_SIZE) {
      setSizeError(true);
      setFile(null);
      return;
    }
    setSizeError(false);
    setFile(f);
  };

  const handleStartUpload = async () => {
    if (!file) return;
    try {
      const created = await importFile.mutateAsync({ type, file });
      setBatchId(created.id);
    } catch (e) {
      // Error handled by hook
    }
  };

  const handleConfirmImport = async () => {
    if (!batchId) return;
    try {
      await confirmMut.mutateAsync(batchId);
      reset();
      onOpenChange(false);
      onQueued?.();
      router.push("/dashboard/produk/import");
    } catch (e) {
      // Error handled by hook
    }
  };

  const isAnalyzing =
    batch?.state === "queued" || batch?.state === "previewing";
  const isPreviewed = batch?.state === "previewed";
  const isFailed = batch?.state === "failed";

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
          "transition-all duration-200",
          isPreviewed
            ? "h-[min(90vh,860px)] sm:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-0"
            : "sm:max-w-lg",
        )}
      >
        {!batchId ? (
          <UploadStep
            type={type}
            title={title}
            description={description}
            file={file}
            dragOver={dragOver}
            sizeError={sizeError}
            inputRef={inputRef}
            pending={importFile.isPending}
            onDragOver={setDragOver}
            onFile={handleFile}
            onResetFile={() => {
              setFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            onCancel={() => onOpenChange(false)}
            onSubmit={handleStartUpload}
          />
        ) : isAnalyzing ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="size-16 rounded-full bg-primary/10 animate-ping absolute" />
              <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center relative">
                <Loader2Icon className="size-8 text-primary animate-spin" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                Memvalidasi File Excel...
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Sistem sedang memeriksa SKU, harga, kategori, dan aturan bundle
                tanpa mengubah database.
              </p>
            </div>
          </div>
        ) : isFailed ? (
          <div className="p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <XCircleIcon className="size-5" />
                Gagal Membaca File
              </DialogTitle>
              <DialogDescription>
                {batch?.errorMessage ||
                  "Terjadi kesalahan saat memproses pratinjau file Excel."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={reset}>
                Ganti File Lain
              </Button>
            </div>
          </div>
        ) : isPreviewed && batch ? (
          <PreviewStep
            batch={batch}
            confirmPending={confirmMut.isPending}
            onChangeFile={reset}
            onConfirm={handleConfirmImport}
          />
        ) : (
          <div className="p-8 flex items-center justify-center">
            <Loader2Icon className="size-6 animate-spin text-primary" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function UploadStep({
  type,
  title,
  description,
  file,
  dragOver,
  sizeError,
  inputRef,
  pending,
  onDragOver,
  onFile,
  onResetFile,
  onCancel,
  onSubmit,
}: {
  type: ImportBatchType;
  title: string;
  description: string;
  file: File | null;
  dragOver: boolean;
  sizeError: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  pending: boolean;
  onDragOver: (v: boolean) => void;
  onFile: (f: File | undefined) => void;
  onResetFile: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const [isDownloading, setIsDownloading] = React.useState(false);

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true);
      await downloadImportTemplate(type);
      toast.success("Template berhasil didownload");
    } catch (err: unknown) {
      apiError(err, "Gagal mendownload template");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(false);
    onFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="p-6 space-y-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <button
          type="button"
          disabled={isDownloading}
          onClick={handleDownloadTemplate}
          className="flex items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-left text-sm transition-colors hover:bg-primary/10 disabled:opacity-50"
        >
          {isDownloading ? (
            <Loader2Icon className="size-5 shrink-0 animate-spin text-primary" />
          ) : (
            <DownloadIcon className="size-5 shrink-0 text-primary" />
          )}
          <div className="min-w-0 flex-1">
            <div className="font-medium text-primary">
              {isDownloading
                ? "Mengunduh Template..."
                : "Download Template Excel"}
            </div>
            <div className="text-xs text-muted-foreground">
              {type === "single"
                ? "Template_Import_Product.xlsx"
                : "Template_Import_Bundle.xlsx"}
            </div>
          </div>
        </button>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            onDragOver(true);
          }}
          onDragLeave={() => onDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-muted/30",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          {file ? (
            <>
              <FileSpreadsheetIcon className="size-10 text-success" />
              <div className="font-medium text-foreground">{file.name}</div>
              <div className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onResetFile();
                }}
                className="text-xs font-medium text-destructive hover:underline"
              >
                Ganti File
              </button>
            </>
          ) : (
            <>
              <UploadIcon className="size-8 text-muted-foreground" />
              <div className="text-sm font-medium">
                Drag & drop file atau klik untuk pilih
              </div>
              <div className="text-xs text-muted-foreground">
                Format: .xlsx, .xls, .csv — Maks 20 MB
              </div>
            </>
          )}
        </div>

        {sizeError && (
          <p className="text-sm text-destructive">
            File terlalu besar. Maksimal 20 MB.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>
            Batal
          </Button>
          <Button
            variant="primary"
            disabled={!file || pending}
            onClick={onSubmit}
          >
            {pending ? (
              <>
                <Loader2Icon className="size-4 animate-spin mr-1.5" />
                Mengunggah...
              </>
            ) : (
              <>
                <UploadIcon className="size-4 mr-1.5" />
                Unggah & Pratinjau
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreviewStep({
  batch,
  confirmPending,
  onChangeFile,
  onConfirm,
}: {
  batch: ImportBatch;
  confirmPending: boolean;
  onChangeFile: () => void;
  onConfirm: () => void;
}) {
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(1);
  const [isDownloading, setIsDownloading] = React.useState<boolean>(false);

  const { data: rowsData, isLoading: rowsLoading } = useImportBatchRows(
    batch.id,
    {
      page,
      perPage: 15,
      status: statusFilter === "all" ? undefined : statusFilter,
      search: search.trim() || undefined,
    },
  );

  const rows = rowsData?.items ?? [];
  const meta = rowsData?.meta;

  const handleDownloadErrors = async () => {
    try {
      setIsDownloading(true);
      await downloadImportErrors(batch.id, batch.batchNo);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border/60">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <FileSpreadsheetIcon className="size-5 text-primary" />
                Pratinjau Validasi Import: {batch.originalFilename}
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                Tinjau baris valid dan baris gagal di bawah ini sebelum
                menerapkan data ke katalog.
              </DialogDescription>
            </div>

            {batch.failedRows > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={isDownloading}
                onClick={handleDownloadErrors}
                className="h-8 gap-1.5 text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
              >
                {isDownloading ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <DownloadIcon className="size-3.5" />
                )}
                Unduh Laporan Error (.xlsx)
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground">
              Total Baris File
            </div>
            <div className="text-xl font-bold tabular-nums mt-0.5">
              {batch.totalRows}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2Icon className="size-3.5" />
              Siap Di-import (Valid)
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
              {batch.successRows}
            </div>
          </div>
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
            <div className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
              <AlertTriangleIcon className="size-3.5" />
              Gagal Validasi (Error)
            </div>
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
              {batch.failedRows}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="px-6 py-3 bg-muted/20 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setPage(1);
            }}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-lg transition-all",
              statusFilter === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Semua ({batch.totalRows})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("valid");
              setPage(1);
            }}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-lg transition-all",
              statusFilter === "valid"
                ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Siap Di-import ({batch.successRows})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("invalid");
              setPage(1);
            }}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-lg transition-all",
              statusFilter === "invalid"
                ? "bg-background text-rose-600 dark:text-rose-400 shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Gagal ({batch.failedRows})
          </button>
        </div>

        <div className="relative w-full sm:w-56">
          <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari SKU, Nama..."
            className="h-8 pl-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto max-h-[380px]">
        {rowsLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2">
            <Loader2Icon className="size-6 animate-spin text-primary" />
            <p className="text-xs">Memuat baris...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground gap-1.5">
            <AlertTriangleIcon className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">Tidak ada baris yang sesuai</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/40 sticky top-0 z-10 backdrop-blur">
              <TableRow>
                <TableHead className="w-14 text-center text-xs">
                  Baris
                </TableHead>
                <TableHead className="w-36 text-xs">SKU</TableHead>
                <TableHead className="text-xs">Nama Produk / Bundle</TableHead>
                <TableHead className="w-28 text-xs">Kategori</TableHead>
                <TableHead className="w-28 text-right text-xs">Harga</TableHead>
                <TableHead className="w-24 text-center text-xs">
                  Status
                </TableHead>
                <TableHead className="w-56 text-xs">Pesan Validasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "text-xs transition-colors",
                    row.status === "invalid" || row.status === "failed"
                      ? "bg-rose-500/[0.04] hover:bg-rose-500/[0.08]"
                      : "hover:bg-muted/50",
                  )}
                >
                  <TableCell className="text-center font-mono text-muted-foreground">
                    {row.rowNumber}
                  </TableCell>
                  <TableCell className="font-mono font-medium text-foreground">
                    {row.sku || "-"}
                  </TableCell>
                  <TableCell className="font-medium max-w-[180px] truncate">
                    {row.name || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[120px]">
                    {row.categoryName || "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.sellPrice !== null && row.sellPrice !== undefined
                      ? formatCurrency(row.sellPrice)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.status === "valid" ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      >
                        <CheckCircle2Icon className="mr-1 size-3" />
                        Valid
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      >
                        <XCircleIcon className="mr-1 size-3" />
                        Gagal
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.message ? (
                      <span className="text-rose-600 dark:text-rose-400 font-medium leading-relaxed">
                        {row.message}
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Siap disimpan
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Footer with Pagination & Action Buttons */}
      <div className="p-4 border-t border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
        <div>
          {meta && meta.last_page > 1 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground mr-1">
                Hal {meta.current_page}/{meta.last_page}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 px-2 text-xs"
              >
                &larr;
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 px-2 text-xs"
              >
                Selanjutnya
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onChangeFile}>
            Ganti File
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={batch.successRows === 0 || confirmPending}
            onClick={onConfirm}
            className="gap-1.5"
          >
            {confirmPending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Menerapkan...
              </>
            ) : (
              <>
                <CheckCircle2Icon className="size-4" />
                Konfirmasi Import ({batch.successRows} Baris)
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
