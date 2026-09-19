"use client";

import * as React from "react";
import Link from "next/link";
import { PrinterIcon, RefreshCwIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { formatDateTime } from "@/lib/format";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import {
  FulfillmentFilterBar,
  type FulfillmentFilterValue,
} from "@/components/dashboard/proses-pesanan/shared/fulfillment-filter-bar";
import { useCompletedShipments } from "@/hooks/proses-pesanan/use-fulfillment";
import type { CompletedShipmentOrderRow } from "@/types/proses-pesanan/fulfillment";
import { useListState } from "@/hooks/use-list-state";
import { DocActions } from "@/hooks/proses-pesanan/use-doc-actions";

const STATUS_OPTIONS = [
  { value: "HANDED_OVER", label: "Diserahkan" },
  { value: "IN_TRANSIT", label: "Dikirim" },
  { value: "DELIVERED", label: "Terkirim" },
];

type PageFilterState = {
  status: string;
  courier_code: string;
  date_from: string;
  date_to: string;
};

const EMPTY_FILTERS: PageFilterState = {
  status: "",
  courier_code: "",
  date_from: "",
  date_to: "",
};

const SOURCE_LABEL: Record<string, string> = {
  shopee: "Shopee",
  tiktok: "TikTok",
  lazada: "Lazada",
  woocommerce: "WooCommerce",
  manual: "Manual",
};

function formatSource(source: string | null): string {
  if (!source) return "—";
  return SOURCE_LABEL[source] ?? source.toUpperCase();
}

function joinCityProvince(row: CompletedShipmentOrderRow): string {
  const parts = [row.shippingCity, row.shippingProvince].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

export function CompletedShipmentTable() {
  const list = useListState<PageFilterState>(EMPTY_FILTERS, {
    perPage: 20,
    namespace: "shipment_done",
  });

  const params = React.useMemo(
    () => ({
      status: list.filters.status || undefined,
      q: list.appliedSearch || undefined,
      page: list.page,
      per_page: list.perPage,
      courier_code: list.filters.courier_code || undefined,
      courier_codes: list.filters.courier_code
        ? list.filters.courier_code.split(",").filter(Boolean)
        : [],
      date_from: list.filters.date_from || undefined,
      date_to: list.filters.date_to || undefined,
      type: "all",
      sort_by: list.sorting[0]?.id || undefined,
      sort_dir: list.sorting[0]
        ? list.sorting[0].desc
          ? "desc"
          : "asc"
        : undefined,
    }),
    [list.appliedSearch, list.page, list.perPage, list.filters, list.sorting],
  );

  const { data, isLoading, isFetching, refetch } =
    useCompletedShipments(params);

  const rows = data?.items ?? [];
  const meta = data?.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  };

  const columns = React.useMemo<ColumnDef<CompletedShipmentOrderRow>[]>(
    () => [
      {
        id: "salesorder_no",
        accessorFn: (row) => row.salesorderNo,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Pesanan" />
        ),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="min-w-[160px]">
              {r.orderId ? (
                <Link
                  href={`/dashboard/pesanan/${r.orderId}`}
                  className="font-medium text-primary hover:underline"
                >
                  {r.salesorderNo ?? "—"}
                </Link>
              ) : (
                <span>{r.salesorderNo ?? "—"}</span>
              )}
              <div className="text-2xs text-muted-foreground">
                {formatSource(r.source)}
              </div>
            </div>
          );
        },
      },
      {
        id: "customer_name",
        accessorFn: (row) => row.customerName,
        header: "Pelanggan",
        cell: ({ row }) => (
          <span className="text-xs">{row.original.customerName ?? "—"}</span>
        ),
      },
      {
        id: "transaction_date",
        accessorFn: (row) => row.transactionDate,
        header: "Tgl. Pesanan",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs">
            {formatDateTime(row.original.transactionDate)}
          </span>
        ),
      },
      {
        id: "tracking_number",
        accessorFn: (row) => row.trackingNumber,
        header: "No. Resi",
        cell: ({ row }) => (
          <span className="font-mono text-2xs tabular-nums">
            {row.original.trackingNumber ?? "—"}
          </span>
        ),
      },
      {
        id: "shipping_provider",
        accessorFn: (row) => row.shippingProvider,
        header: "Kurir",
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="min-w-[120px]">
              <div className="text-xs">{r.shippingProvider ?? "—"}</div>
              {r.courierName && r.courierName !== r.shippingProvider ? (
                <div className="text-2xs text-muted-foreground">
                  {r.courierName}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "shipping_area",
        header: "Tujuan",
        cell: ({ row }) => (
          <div className="text-xs">{joinCityProvince(row.original)}</div>
        ),
      },
      {
        id: "pickup_code",
        accessorFn: (row) => row.pickupCode,
        header: "Kode Ambil",
        cell: ({ row }) =>
          row.original.pickupCode ? (
            <Badge className="font-mono tracking-wider">
              {row.original.pickupCode}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: "shipment_no",
        accessorFn: (row) => row.shipmentNo,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Manifest" />
        ),
        cell: ({ row }) => {
          const r = row.original;
          if (!r.shipmentId) return <span className="text-xs">—</span>;
          return (
            <Link
              href={`/dashboard/proses-pesanan/shipping/${r.shipmentId}`}
              className="text-xs text-primary hover:underline"
            >
              {r.shipmentNo ?? r.shipmentId}
            </Link>
          );
        },
      },
      {
        id: "shipment_status",
        accessorFn: (row) => row.shipmentStatus,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status Pengiriman" />
        ),
        cell: ({ row }) => (
          <StatusBadge domain="shipment" status={row.original.shipmentStatus} />
        ),
      },
      {
        id: "channel_status",
        accessorFn: (row) => row.channelStatus,
        header: "Status Channel",
        cell: ({ row }) => (
          <span className="text-2xs text-muted-foreground">
            {row.original.channelStatus ?? "—"}
          </span>
        ),
      },
      {
        id: "handed_over_at",
        accessorFn: (row) => row.handedOverAt,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Diserahkan" />
        ),
        cell: ({ row }) => (
          <span className="text-xs">
            {formatDateTime(row.original.handedOverAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <FulfillmentFilterBar
        value={list.filters as FulfillmentFilterValue}
        onChange={(v) =>
          list.setFilters({ ...EMPTY_FILTERS, ...v } as PageFilterState)
        }
        fields={["courier", "status", "date"]}
        courierMode="courier_code"
        statusOptions={STATUS_OPTIONS}
        search={list.search}
        onSearchChange={list.setSearch}
        onSearch={list.applySearch}
        searchPlaceholder="Cari no. resi…"
      />
      <div className="flex items-center justify-end gap-3 border-b border-border/40 px-4 py-2 text-sm text-muted-foreground sm:px-5">
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-full p-1.5 transition-colors hover:bg-muted"
          aria-label="Muat ulang"
        >
          <RefreshCwIcon
            className={cn("size-4", isFetching && "animate-spin")}
          />
        </button>
        <span className="flex items-center gap-1.5">
          Total <Badge>{meta.total}</Badge>
        </span>
      </div>

      <div className="px-4 pb-4 sm:px-5">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          hideToolbar
          getRowId={(row) => row.orderId ?? ""}
          enableRowSelection={(row) =>
            Boolean(row.original.orderId) &&
            (row.original.source ?? "").toLowerCase() !== "woocommerce"
          }
          bulkActions={(selected) => {
            const eligible = selected
              .filter(
                (r) =>
                  r.orderId && (r.source ?? "").toLowerCase() !== "woocommerce",
              )
              .map((r) => ({ id: r.orderId as string, source: r.source }));
            return (
              <Button
                size="sm"
                variant="primary"
                className="rounded-full"
                disabled={eligible.length === 0}
                onClick={() => {
                  if (eligible.length === 0) return;
                  void DocActions.shippingLabel(eligible);
                }}
              >
                <PrinterIcon className="size-4" />
                Cetak Label ({eligible.length})
              </Button>
            );
          }}
          manualPagination
          manualSorting
          sorting={list.sorting}
          onSortingChange={list.setSorting}
          pagination={list.pagination}
          rowCount={meta.total}
          onPaginationChange={list.onPaginationChange}
          tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
          emptyState={
            <div className="py-16 text-center text-sm text-muted-foreground">
              Belum ada pesanan yang sudah dikirim.
            </div>
          }
        />
      </div>
    </div>
  );
}
