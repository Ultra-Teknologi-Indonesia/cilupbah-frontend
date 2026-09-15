"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ExternalLinkIcon,
  EyeIcon,
  XIcon,
} from "lucide-react";

import { PageTitle } from "@/components/dashboard/page-title";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import {
  SimplePagination,
  TABLE_PAGE_SIZES,
} from "@/components/ui/simple-pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import {
  useRejectReplenishment,
  useStockReplenishments,
} from "@/hooks/gudang/use-stock-replenishment";
import type {
  StockReplenishment,
  StockReplenishmentStatus,
} from "@/types/gudang/stock-replenishment";
import { AcceptReplenishmentDialog } from "./accept-replenishment-dialog";

const STATUS_TABS: Array<{
  label: string;
  value: StockReplenishmentStatus | "ALL";
}> = [
  { label: "Menunggu", value: "PENDING" },
  { label: "Disetujui", value: "ACCEPTED" },
  { label: "Ditolak", value: "REJECTED" },
  { label: "Selesai", value: "DONE" },
  { label: "Dibatalkan otomatis", value: "CANCELLED" },
  { label: "Semua", value: "ALL" },
];

export function PermintaanRestockView() {
  const [status, setStatus] = useState<StockReplenishmentStatus | "ALL">(
    "PENDING",
  );
  const [acceptTarget, setAcceptTarget] = useState<StockReplenishment | null>(
    null,
  );
  const [rejectTarget, setRejectTarget] = useState<StockReplenishment | null>(
    null,
  );
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const params = useMemo(
    () => ({
      status: status === "ALL" ? undefined : status,
      page,
      per_page: perPage,
    }),
    [page, perPage, status],
  );

  const { data, isLoading, isFetching } = useStockReplenishments(params);
  const rejectMut = useRejectReplenishment();

  const items = useMemo(() => {
    return [...(data?.items ?? [])].sort((a, b) => {
      const timeA = new Date(a.requested_at).getTime() || 0;
      const timeB = new Date(b.requested_at).getTime() || 0;
      return sortDir === "asc" ? timeA - timeB : timeB - timeA;
    });
  }, [data?.items, sortDir]);

  const handleStatusChange = (value: string) => {
    setStatus(value as StockReplenishmentStatus | "ALL");
    setPage(1);
  };

  const handlePerPageChange = (size: number) => {
    setPerPage(size);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        title="Permintaan Pengisian Stok"
        breadcrumb={[
          { label: "Gudang" },
          { label: "Permintaan Pengisian Stok" },
        ]}
      />

      <LiquidGlass
        radius={999}
        intensity="subtle"
        className="w-fit bg-white/40 p-1 dark:bg-white/[0.06]"
      >
        <Tabs value={status} onValueChange={handleStatusChange}>
          <TabsList className="bg-transparent">
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </LiquidGlass>

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2 h-8 gap-1.5 px-2 text-xs font-semibold hover:bg-white/20"
                    onClick={() =>
                      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
                    }
                  >
                    <span>Diminta</span>
                    {sortDir === "desc" ? (
                      <ArrowDownIcon className="size-3.5" />
                    ) : (
                      <ArrowUpIcon className="size-3.5" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>Diminta Oleh</TableHead>
                <TableHead>Dari → Ke</TableHead>
                <TableHead>Barang</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Memuat…
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Belum ada permintaan.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(r.requested_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.requested_by_name ?? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          Sistem
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-medium">
                        {r.from_location_name ?? "—"}
                      </span>
                      {" → "}
                      <span className="font-medium">
                        {r.to_location_name ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {(r.items ?? []).length} SKU ·{" "}
                      {(r.items ?? []).reduce((a, i) => a + i.qty, 0)} qty
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.assignee_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <StatusBadge
                          domain="stock-replenishment"
                          status={r.status}
                        />
                        {r.transfer_out_number && (
                          <Link
                            href={`/dashboard/barang-keluar?transfer=${r.transfer_out_id}`}
                            className="inline-flex items-center gap-1 text-2xs text-primary hover:underline"
                            title={`Transfer Keluar ${r.transfer_out_number} · ${r.transfer_out_status}`}
                          >
                            <ExternalLinkIcon className="size-3" />
                            {r.transfer_out_number}
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          asChild
                          size="icon"
                          variant="ghost"
                          title="Lihat detail"
                          aria-label="Lihat detail"
                        >
                          <Link href={`/dashboard/permintaan-restock/${r.id}`}>
                            <EyeIcon className="size-4" />
                          </Link>
                        </Button>
                        {r.status === "PENDING" && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Terima"
                              aria-label="Terima"
                              onClick={() => setAcceptTarget(r)}
                            >
                              <CheckIcon className="size-4 text-success" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Tolak"
                              aria-label="Tolak"
                              onClick={() => setRejectTarget(r)}
                            >
                              <XIcon className="size-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </LiquidGlass>

      {data && data.meta.total > 0 && (
        <SimplePagination
          page={data.meta.current_page}
          lastPage={data.meta.last_page}
          onPageChange={setPage}
          perPage={data.meta.per_page}
          onPerPageChange={handlePerPageChange}
          pageSizeOptions={TABLE_PAGE_SIZES}
          isFetching={isFetching}
          total={data.meta.total}
          label="permintaan"
        />
      )}

      <AcceptReplenishmentDialog
        open={!!acceptTarget}
        onOpenChange={(v) => (!v ? setAcceptTarget(null) : null)}
        request={acceptTarget}
      />

      <ConfirmDialog
        open={!!rejectTarget}
        onOpenChange={(v) => (!v ? setRejectTarget(null) : null)}
        title="Tolak permintaan pengisian stok?"
        description="Tim gudang perlu mengirim ulang permintaan bila ditolak."
        confirmLabel="Tolak"
        onConfirm={async () => {
          if (!rejectTarget) return;
          await rejectMut.mutateAsync({ id: rejectTarget.id });
          setRejectTarget(null);
        }}
      />
    </div>
  );
}
