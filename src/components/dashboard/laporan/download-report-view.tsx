"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileDownIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { useDownloadExportJob, useExportJobs } from "@/hooks/laporan/use-export-jobs";
import { formatDateTime, formatNumber } from "@/lib/format";
import type {
  ExportJobCategory,
  ExportJobFormat,
  ExportJobListParams,
  ExportJobPageSize,
  ExportJobState,
  ExportJobStatus,
} from "@/types/laporan/export-job";

const CATEGORY_OPTIONS: Array<{ value: ExportJobCategory; label: string }> = [
  { value: "inventory", label: "Persediaan" },
  { value: "warehouse", label: "Gudang" },
  { value: "sales", label: "Penjualan" },
  { value: "purchase", label: "Pembelian" },
  { value: "other", label: "Lainnya" },
];

const STATUS_OPTIONS: Array<{ value: ExportJobState; label: string }> = [
  { value: "queued", label: "Menunggu" },
  { value: "processing", label: "Diproses" },
  { value: "ready", label: "Siap Diunduh" },
  { value: "failed", label: "Gagal" },
  { value: "expired", label: "Kedaluwarsa" },
];

const FORMAT_OPTIONS: Array<{ value: ExportJobFormat; label: string }> = [
  { value: "xlsx", label: "Excel (XLSX)" },
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" },
];

const PAGE_SIZE_OPTIONS: ExportJobPageSize[] = [20, 50, 100, 200];

const DEFAULT_META = { current_page: 1, last_page: 1, per_page: 20, total: 0 };

export function DownloadReportView() {
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState<ExportJobCategory | "all">("all");
  const [status, setStatus] = useState<ExportJobState | "all">("all");
  const [format, setFormat] = useState<ExportJobFormat | "all">("all");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [perPage, setPerPage] = useState<ExportJobPageSize>(20);
  const [page, setPage] = useState(1);
  const [errorJob, setErrorJob] = useState<ExportJobStatus | null>(null);
  const [appliedSearch, setAppliedSearch] = useState("");

  const params = useMemo<ExportJobListParams>(
    () => ({
      search: appliedSearch.trim() || undefined,
      category: category === "all" ? undefined : category,
      status: status === "all" ? undefined : status,
      format: format === "all" ? undefined : format,
      created_from: createdFrom || undefined,
      created_to: createdTo || undefined,
      page,
      per_page: perPage,
      sort: "created_at",
      direction: "desc",
    }),
    [appliedSearch, category, createdFrom, createdTo, format, page, perPage, status],
  );

  const query = useExportJobs(params);
  const download = useDownloadExportJob();
  const items = query.data?.items ?? [];
  const meta = query.data?.meta ?? DEFAULT_META;
  const { refetch } = query;

  useEffect(() => {
    const refresh = () => void refetch();
    window.addEventListener("report-export-queued", refresh);
    window.addEventListener("report-export-updated", refresh);
    return () => {
      window.removeEventListener("report-export-queued", refresh);
      window.removeEventListener("report-export-updated", refresh);
    };
  }, [refetch]);

  const resetFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setCategory("all");
    setStatus("all");
    setFormat("all");
    setCreatedFrom("");
    setCreatedTo("");
    setPerPage(20);
    setPage(1);
  };

  const statusBadge = (job: ExportJobStatus) => {
    const variant =
      job.status === "ready"
        ? "success"
        : job.status === "failed"
          ? "destructive"
          : job.status === "expired"
            ? "muted"
            : "warning";
    const label = STATUS_OPTIONS.find((option) => option.value === job.status)?.label ?? job.status;
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="flex flex-col gap-4">
      <LiquidGlass radius={20} intensity="subtle" className="bg-white/30 dark:bg-white/[0.04]">
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="relative xl:col-span-2">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setAppliedSearch(searchInput.trim());
                setPage(1);
              }}
            >
              <Input
                value={searchInput}
                placeholder="Cari nama file, report, atau ID export lalu tekan Enter"
                maxLength={100}
                className="pl-9"
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </form>
          </div>
          <FilterSelect value={category} placeholder="Kategori" onValueChange={(value) => { setCategory(value as ExportJobCategory | "all"); setPage(1); }} options={CATEGORY_OPTIONS} />
          <FilterSelect value={status} placeholder="Status" onValueChange={(value) => { setStatus(value as ExportJobState | "all"); setPage(1); }} options={STATUS_OPTIONS} />
          <FilterSelect value={format} placeholder="Format" onValueChange={(value) => { setFormat(value as ExportJobFormat | "all"); setPage(1); }} options={FORMAT_OPTIONS} />
          <Button variant="outline" onClick={resetFilters}>Reset Filter</Button>
          <div className="flex gap-2 md:col-span-2 xl:col-span-6">
            <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
              Dibuat dari
              <Input type="date" value={createdFrom} onChange={(event) => { setCreatedFrom(event.target.value); setPage(1); }} />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
              Dibuat sampai
              <Input type="date" value={createdTo} onChange={(event) => { setCreatedTo(event.target.value); setPage(1); }} />
            </label>
          </div>
        </div>
      </LiquidGlass>

      <LiquidGlass radius={20} intensity="subtle" className="overflow-hidden bg-white/30 dark:bg-white/[0.04]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-semibold">Riwayat Download Report</h2>
            <p className="text-sm text-muted-foreground">File siap diunduh ulang selama masa retensi.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching}>
            <RefreshCwIcon className={query.isFetching ? "mr-1.5 size-4 animate-spin" : "mr-1.5 size-4"} />
            Refresh
          </Button>
        </div>

        {query.isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Memuat riwayat download…</div>
        ) : query.isError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircleIcon className="size-8 text-destructive" />
            <p className="text-sm text-muted-foreground">Riwayat download belum dapat dimuat.</p>
            <Button variant="outline" onClick={() => void query.refetch()}>Coba Lagi</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-8 sm:px-6">
            <EmptyState icon={FileDownIcon} title="Belum ada report" description="Export report dari halaman laporan akan muncul di sini." />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Report</th>
                    <th className="px-5 py-3 font-medium">Kategori</th>
                    <th className="px-5 py-3 font-medium">Format</th>
                    <th className="px-5 py-3 font-medium">Filter / Periode</th>
                    <th className="px-5 py-3 font-medium">Dibuat</th>
                    <th className="px-5 py-3 font-medium">Selesai</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Ukuran / Kedaluwarsa</th>
                    <th className="px-5 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((job) => (
                    <tr key={job.id} className="border-t border-border/60 align-top">
                      <td className="px-5 py-4">
                        <div className="font-medium text-foreground">{job.label}</div>
                        <div className="mt-1 max-w-[260px] truncate text-xs text-muted-foreground" title={job.file_name ?? job.id}>{job.file_name ?? job.id}</div>
                      </td>
                      <td className="px-5 py-4 capitalize">{CATEGORY_OPTIONS.find((option) => option.value === job.category)?.label ?? job.category}</td>
                      <td className="px-5 py-4 uppercase">{job.format}</td>
                      <td className="max-w-[220px] px-5 py-4 text-xs text-muted-foreground">{job.filter_summary ?? "—"}</td>
                      <td className="whitespace-nowrap px-5 py-4">{formatDateTime(job.created_at)}</td>
                      <td className="whitespace-nowrap px-5 py-4">{formatDateTime(job.finished_at)}</td>
                      <td className="px-5 py-4">{statusBadge(job)}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        <div>{job.file_size != null ? `${formatNumber(Math.round(job.file_size / 1024))} KB` : "—"}</div>
                        <div className="mt-1">{job.status === "expired" ? `Dihapus ${formatDateTime(job.file_purged_at)}` : `Berlaku sampai ${formatDateTime(job.expires_at)}`}</div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {job.status === "ready" && job.file_available ? (
                          <Button size="sm" onClick={() => download.mutate(job)} disabled={download.isPending}>
                            <DownloadIcon className="mr-1.5 size-4" /> Download
                          </Button>
                        ) : job.status === "failed" ? (
                          <Button variant="outline" size="sm" onClick={() => setErrorJob(job)}>Lihat Error</Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            {job.status === "expired"
                              ? "Kedaluwarsa"
                              : job.status === "processing"
                                ? "Diproses"
                                : "Menunggu"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-5 py-4 text-sm text-muted-foreground sm:px-6">
              <div className="flex items-center gap-3">
                <span>Total {formatNumber(meta.total)} report</span>
                <Select
                  value={String(perPage)}
                  onValueChange={(value) => {
                    setPerPage(Number(value) as ExportJobPageSize);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[132px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size} per halaman
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeftIcon className="size-4" /> Sebelumnya</Button>
                <span>Halaman {meta.current_page} dari {meta.last_page}</span>
                <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage((current) => current + 1)}>Berikutnya <ChevronRightIcon className="size-4" /></Button>
              </div>
            </div>
          </>
        )}
      </LiquidGlass>

      <Dialog open={errorJob !== null} onOpenChange={(open) => { if (!open) setErrorJob(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Export Gagal</DialogTitle></DialogHeader>
          {errorJob && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{errorJob.error ?? "Berkas report tidak berhasil dibuat."}</p>
              <Button asChild variant="outline"><Link href="/dashboard/laporan/persediaan" onClick={() => setErrorJob(null)}>Buka halaman laporan</Link></Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterSelect<T extends string>({
  value,
  placeholder,
  options,
  onValueChange,
}: {
  value: T | "all";
  placeholder: string;
  options: Array<{ value: T; label: string }>;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua {placeholder}</SelectItem>
        {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
