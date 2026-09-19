"use client";

import * as React from "react";
import {
  CheckCircle2Icon,
  DownloadIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  SearchIcon,
  TriangleAlertIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SimplePagination } from "@/components/ui/simple-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  downloadRackImportErrors,
  downloadRackImportTemplate,
  useConfirmRackImport,
  useRackImportBatch,
  useRackImportRows,
  useUploadRackImport,
} from "@/hooks/persediaan/use-rack-import";
import type {
  RackImportBatch,
  RackImportRowStatus,
} from "@/hooks/persediaan/use-rack-import";
import { apiError } from "@/lib/toast";

const ACCEPT = ".csv,.xlsx,.xls";
const MAX_SIZE = 20 * 1024 * 1024;
const DEFAULT_PER_PAGE = 50;

type StatusFilter = RackImportRowStatus | "all";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROW_STATUS: Record<
  RackImportRowStatus,
  { label: string; className: string }
> = {
  place: { label: "Akan ditempatkan", className: "text-success" },
  placed: { label: "Ditempatkan", className: "text-success" },
  manual_move: { label: "Perlu Pindah Bin", className: "text-warning" },
  already: { label: "Sudah sesuai", className: "text-muted-foreground" },
  error: { label: "Gagal", className: "text-destructive" },
};

function RowStatusPill({ status }: { status: RackImportRowStatus }) {
  const cfg = ROW_STATUS[status] ?? {
    label: status,
    className: "text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={cn("shrink-0", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

export function RackImportDialog({ open, onOpenChange }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [batchId, setBatchId] = React.useState<string | null>(null);

  const uploadMut = useUploadRackImport();
  const confirmMut = useConfirmRackImport();
  const { data: batch } = useRackImportBatch(batchId);

  const isPreviewed = batch?.state === "previewed";

  const reset = React.useCallback(() => {
    setFile(null);
    setDragOver(false);
    setBatchId(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_SIZE) {
      toast.error("File terlalu besar. Maksimal 20 MB.");
      return;
    }
    setFile(f);
  };

  const startPreview = async () => {
    if (!file) return;
    const created = await uploadMut.mutateAsync(file);
    setBatchId(created.id);
  };

  const applyPreview = async () => {
    if (!batchId) return;
    await confirmMut.mutateAsync(batchId);
  };

  const state = batch?.state;
  const analyzing = state === "queued" || state === "previewing";
  const confirming = state === "confirming";
  const finished =
    state === "done" || state === "done_with_errors" || state === "failed";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Import Alokasi Rak</DialogTitle>
          <DialogDescription>
            Unggah file berisi SKU, lokasi, dan rak. Sistem memvalidasi tiap
            baris, lalu menyimpan alokasi rak tanpa memindahkan stok.
          </DialogDescription>
        </DialogHeader>

        {!batchId ? (
          <UploadStep
            file={file}
            dragOver={dragOver}
            inputRef={inputRef}
            pending={uploadMut.isPending}
            onDragOver={setDragOver}
            onFile={handleFile}
            onCancel={() => onOpenChange(false)}
            onStart={startPreview}
          />
        ) : analyzing ? (
          <ProgressStep
            title="Menganalisis file…"
            subtitle="Memvalidasi tiap baris terhadap SKU, lokasi, dan aturan rak."
          />
        ) : confirming ? (
          <ProgressStep
            title="Menyimpan alokasi rak…"
            subtitle={`${batch?.processedRows ?? 0} dari ${batch?.placeRows ?? 0} SKU diproses.`}
            percent={batch?.progressPercent ?? 0}
          />
        ) : finished ? (
          <ResultStep
            success={batch?.successRows ?? 0}
            place={batch?.placeRows ?? 0}
            failed={batch?.failedRows ?? 0}
            errorMessage={batch?.errorMessage ?? null}
            onAgain={reset}
            onClose={() => onOpenChange(false)}
          />
        ) : isPreviewed && batch && batchId ? (
          <PreviewStep
            batchId={batchId}
            batch={batch}
            confirmPending={confirmMut.isPending}
            onChangeFile={reset}
            onApply={applyPreview}
          />
        ) : (
          <ProgressStep title="Memuat…" />
        )}
      </DialogContent>
    </Dialog>
  );
}

function UploadStep({
  file,
  dragOver,
  inputRef,
  pending,
  onDragOver,
  onFile,
  onCancel,
  onStart,
}: {
  file: File | null;
  dragOver: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  pending: boolean;
  onDragOver: (v: boolean) => void;
  onFile: (f: File | undefined) => void;
  onCancel: () => void;
  onStart: () => void;
}) {
  const [isDownloading, setIsDownloading] = React.useState(false);

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true);
      await downloadRackImportTemplate();
      toast.success("Template berhasil didownload");
    } catch (err: unknown) {
      apiError(err, "Gagal mendownload template");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        disabled={isDownloading}
        onClick={handleDownloadTemplate}
        className="flex items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-left text-sm transition-colors hover:bg-primary/10 disabled:opacity-50"
      >
        {isDownloading ? (
          <Loader2Icon className="size-5 shrink-0 animate-spin text-primary" />
        ) : (
          <DownloadIcon className="size-5 shrink-0 text-primary" />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-medium text-primary">
            {isDownloading ? "Mengunduh Template..." : "Unduh Template"}
          </div>
          <div className="text-xs text-muted-foreground">
            template-import-rack-allocation.xlsx
          </div>
        </div>
      </button>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver(true);
        }}
        onDragLeave={() => onDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          onDragOver(false);
          onFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
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
            <div className="font-medium">{file.name}</div>
            <div className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </div>
          </>
        ) : (
          <>
            <UploadIcon className="size-8 text-muted-foreground" />
            <div className="text-sm font-medium">
              Drag &amp; drop file atau klik untuk pilih
            </div>
            <div className="text-xs text-muted-foreground">
              Format: .csv, .xlsx — Maks 20 MB
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button variant="primary" disabled={!file || pending} onClick={onStart}>
          {pending && <Loader2Icon className="size-4 animate-spin" />}
          Mulai Pratinjau
        </Button>
      </div>
    </div>
  );
}

function ProgressStep({
  title,
  subtitle,
  percent,
}: {
  title: string;
  subtitle?: string;
  percent?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <Loader2Icon className="size-10 animate-spin text-primary" />
      <div>
        <div className="font-medium">{title}</div>
        {subtitle && (
          <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
        )}
      </div>
      {typeof percent === "number" && (
        <div className="w-full max-w-sm">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-muted-foreground tabular-nums">
            {percent}%
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  value,
  label,
  tone,
  onClick,
}: {
  active: boolean;
  value: number;
  label: string;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-primary bg-primary/10"
          : "border-border hover:bg-muted/50",
      )}
    >
      <span className={cn("tabular-nums font-semibold", tone)}>{value}</span>
      <span
        className={cn("font-normal", active ? "" : "text-muted-foreground")}
      >
        {label}
      </span>
    </button>
  );
}

function PreviewStep({
  batchId,
  batch,
  confirmPending,
  onChangeFile,
  onApply,
}: {
  batchId: string;
  batch: RackImportBatch;
  confirmPending: boolean;
  onChangeFile: () => void;
  onApply: () => void;
}) {
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [searchInput, setSearchInput] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(DEFAULT_PER_PAGE);

  const { data, isFetching } = useRackImportRows(batchId, {
    status: status === "all" ? undefined : status,
    search: appliedSearch || undefined,
    page,
    perPage,
  });

  const rows = data?.items ?? [];
  const total = data?.meta?.total ?? 0;
  const lastPage = data?.meta?.last_page ?? 1;
  const filtering = status !== "all" || appliedSearch.length > 0;

  const hasProblems = batch.errorRows + batch.manualMoveRows > 0;
  const canApply = batch.placeRows > 0;
  const [isDownloadingErrors, setIsDownloadingErrors] = React.useState(false);

  const handleDownloadErrors = async () => {
    try {
      setIsDownloadingErrors(true);
      await downloadRackImportErrors(batch.id, batch.batchNo);
      toast.success("Laporan error berhasil didownload");
    } catch (err: unknown) {
      apiError(err, "Gagal mendownload laporan error");
    } finally {
      setIsDownloadingErrors(false);
    }
  };

  const changeStatus = (next: StatusFilter) => {
    setStatus(next);
    setPage(1);
  };
  const toggle = (next: StatusFilter) =>
    changeStatus(status === next ? "all" : next);
  const changeSearch = (value: string) => {
    setSearchInput(value);
  };
  const applySearch = (value = searchInput) => {
    setSearchInput(value.trim());
    setAppliedSearch(value.trim());
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <FilterChip
          active={status === "all"}
          value={batch.totalRows}
          label="Total baris"
          tone=""
          onClick={() => changeStatus("all")}
        />
        <FilterChip
          active={status === "place"}
          value={batch.placeRows}
          label="ditempatkan"
          tone="text-success"
          onClick={() => toggle("place")}
        />
        <FilterChip
          active={status === "manual_move"}
          value={batch.manualMoveRows}
          label="Pindah Bin"
          tone="text-warning"
          onClick={() => toggle("manual_move")}
        />
        <FilterChip
          active={status === "already"}
          value={batch.alreadyRows}
          label="sudah sesuai"
          tone="text-muted-foreground"
          onClick={() => toggle("already")}
        />
        <FilterChip
          active={status === "error"}
          value={batch.errorRows}
          label="gagal"
          tone="text-destructive"
          onClick={() => toggle("error")}
        />
        {hasProblems && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5"
            disabled={isDownloadingErrors}
            onClick={handleDownloadErrors}
          >
            {isDownloadingErrors ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <DownloadIcon className="size-4" />
            )}
            Unduh laporan
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => changeSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applySearch();
              }
            }}
            placeholder="Cari SKU, kode rak, atau gudang…"
            className="pl-9 pr-8"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => applySearch("")}
              aria-label="Bersihkan pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted/60"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
        <Button type="button" size="sm" onClick={() => applySearch()}>
          Cari
        </Button>
      </div>

      <div className="max-h-[46vh] overflow-auto rounded-2xl border border-border">
        <Table className="min-w-[720px]">
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="border-b border-border/60 bg-muted/60 backdrop-blur">
              <TableHead className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
                SKU
              </TableHead>
              <TableHead className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
                Lokasi
              </TableHead>
              <TableHead className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
                Rak
              </TableHead>
              <TableHead className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
                Keterangan
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <EmptyState
                    icon={SearchIcon}
                    className="py-10"
                    title={
                      filtering ? "Tidak ada baris cocok" : "Belum ada baris"
                    }
                    description={
                      filtering
                        ? "Coba ubah kata kunci atau filter status."
                        : "Pratinjau belum menghasilkan baris."
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow
                  key={r.id}
                  className="border-b border-border/40 last:border-0"
                >
                  <TableCell className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                    {r.sku}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm whitespace-nowrap">
                    {r.location}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm whitespace-nowrap">
                    {r.bin}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <RowStatusPill status={r.status} />
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-muted-foreground">
                    {r.message}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SimplePagination
        page={page}
        lastPage={lastPage}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={setPerPage}
        pageSizeOptions={[50, 100, 200]}
        isFetching={isFetching}
        total={total}
        label="baris"
      />

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onChangeFile}>
          Ganti File
        </Button>
        <Button
          variant="primary"
          disabled={!canApply || confirmPending}
          onClick={onApply}
        >
          {confirmPending && <Loader2Icon className="size-4 animate-spin" />}
          Terapkan{canApply ? ` (${batch.placeRows})` : ""}
        </Button>
      </div>
    </div>
  );
}

function ResultStep({
  success,
  place,
  failed,
  errorMessage,
  onAgain,
  onClose,
}: {
  success: number;
  place: number;
  failed: number;
  errorMessage: string | null;
  onAgain: () => void;
  onClose: () => void;
}) {
  const allOk = failed === 0 && success >= place;
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      {allOk ? (
        <CheckCircle2Icon className="size-12 text-success" />
      ) : (
        <TriangleAlertIcon className="size-12 text-warning" />
      )}
      <div>
        <div className="font-medium">
          {allOk ? "Alokasi rak selesai" : "Selesai dengan sebagian gagal"}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {success} dari {place} SKU berhasil ditempatkan
          {failed > 0 ? `, ${failed} gagal` : ""}.
        </div>
        {errorMessage && (
          <div className="mt-1 text-sm text-destructive">{errorMessage}</div>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onAgain}>
          Import Lagi
        </Button>
        <Button variant="primary" onClick={onClose}>
          Selesai
        </Button>
      </div>
    </div>
  );
}
