"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  TruckIcon,
  ZapIcon,
} from "lucide-react";
import type { SortingState } from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { useCopyToClipboard } from "@/hooks/shared/use-copy-to-clipboard";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { Order, OrderTab } from "@/types/pesanan/order";
import {
  ChannelIcon,
  OrderActions,
  OutboundReadyActions,
  type OrderCardVariant,
} from "@/components/dashboard/pesanan/order-card";

export interface OrderTableExtraColumn {
  key: string;
  header: string;
  cell: (order: Order) => React.ReactNode;
  headClassName?: string;
  cellClassName?: string;
}

export interface RowSelectability {
  selectable: boolean;
  reason?: string;
}

interface OrderTableProps {
  orders: Order[];
  tab: OrderTab;
  variant: OrderCardVariant;

  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggle?: (id: string, checked: boolean) => void;
  allSelected?: boolean;
  someSelected?: boolean;
  onToggleAll?: () => void;

  extraColumns?: OrderTableExtraColumn[];

  getRowSelectable?: (order: Order) => RowSelectability;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
}

function SortableTableHead({
  id,
  title,
  sorting,
  onSortingChange,
  className,
}: {
  id: string;
  title: string;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  className?: string;
}) {
  if (!onSortingChange || !sorting) {
    return <TableHead className={className}>{title}</TableHead>;
  }

  const currentSort = sorting.find((s) => s.id === id);
  const isSorted = currentSort ? (currentSort.desc ? "desc" : "asc") : false;

  const toggleSort = () => {
    if (isSorted === "desc") {
      onSortingChange([]);
    } else if (isSorted === "asc") {
      onSortingChange([{ id, desc: true }]);
    } else {
      onSortingChange([{ id, desc: false }]);
    }
  };

  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 gap-1.5 px-3 font-semibold hover:bg-muted/50"
        onClick={toggleSort}
      >
        <span>{title}</span>
        {isSorted === "desc" ? (
          <ArrowDownIcon className="size-3.5" />
        ) : isSorted === "asc" ? (
          <ArrowUpIcon className="size-3.5" />
        ) : (
          <ChevronsUpDownIcon className="size-3.5 opacity-50" />
        )}
      </Button>
    </TableHead>
  );
}


function OrderRow({
  order,
  tab,
  variant,
  selectable,
  selected,
  onToggle,
  extraColumns,
  rowSelectability,
}: {
  order: Order;
  tab: OrderTab;
  variant: OrderCardVariant;
  selectable: boolean;
  selected: boolean;
  onToggle?: (id: string, checked: boolean) => void;
  extraColumns?: OrderTableExtraColumn[];
  rowSelectability?: RowSelectability;
}) {
  const { copy } = useCopyToClipboard();

  return (
    <TableRow
      data-state={selected ? "selected" : undefined}
      className={cn(
        "group",
        order.is_instant && "border-l-2 border-l-orange-500",
        order.is_canceled && "border-l-2 border-l-destructive bg-destructive/5",
      )}
    >
      {selectable && (
        <TableCell>
          {rowSelectability && !rowSelectability.selectable ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Checkbox
                    checked={false}
                    disabled
                    aria-label={rowSelectability.reason ?? "Tidak bisa dipilih"}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {rowSelectability.reason ?? "Tidak bisa dipilih"}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Checkbox
              checked={selected}
              onCheckedChange={(v) => onToggle?.(order.id, !!v)}
              aria-label="Pilih pesanan"
            />
          )}
        </TableCell>
      )}

      <TableCell>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/dashboard/pesanan/${order.id}`}
              className={cn(
                "font-mono text-sm font-semibold transition-colors hover:text-primary hover:underline",
                order.is_instant && "text-orange-700 dark:text-orange-400",
              )}
            >
              {order.salesorder_no}
            </Link>
            {order.is_instant && (
              <Badge
                variant="outline"
                className="gap-0.5 border-orange-500/60 bg-orange-500/15 px-1.5 py-0 text-2xs text-orange-700 dark:text-orange-400"
              >
                <ZapIcon className="size-2.5 fill-current" />
                INSTANT
              </Badge>
            )}
            {order.is_canceled && (
              <Badge className="bg-destructive px-1.5 py-0 text-2xs text-white hover:bg-destructive/90">
                BATAL
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {order.channel_order_no && (
              <button
                type="button"
                onClick={() => copy(order.channel_order_no!)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="text-2xs font-medium text-muted-foreground/70">
                  Ref:
                </span>
                <span className="font-mono">{order.channel_order_no}</span>
              </button>
            )}
            <ChannelIcon source={order.source} />
          </div>
        </div>
      </TableCell>

      <TableCell>
        <span className="block max-w-[160px] truncate text-sm">
          {order.customer_name || "—"}
        </span>
      </TableCell>

      <TableCell className="text-center font-medium tabular-nums text-sm">
        {order.items.length} / {order.items.reduce((sum, i) => sum + i.qty_in_base, 0)}
      </TableCell>
      
      <TableCell>
        <StatusBadge
          domain="sales-order"
          status={order.wms_status || order.status}
          label={order.status_label}
          className="whitespace-nowrap text-xs font-semibold"
        />
      </TableCell>

      <TableCell>
        <span className="block max-w-[160px] text-sm">
          {order.location_name || "—"}
        </span>
      </TableCell>

      <TableCell>
        <div>
          <p className="text-sm font-bold tabular-nums">
            {formatCurrency(order.grand_total)}
          </p>
          <p className="text-xs text-muted-foreground">
            {order.is_paid ? (
              <span className="text-success">
                {order.payment_method_name || "Dibayar"}
              </span>
            ) : (
              "Belum dibayar"
            )}
          </p>
        </div>
      </TableCell>

      <TableCell>
        {order.shipping?.provider ? (
          <div className="flex items-start gap-1 text-sm">
            <TruckIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="font-medium">{order.shipping.provider}</p>
              {order.shipping.tracking_number && (
                <button
                  type="button"
                  onClick={() => copy(order.shipping.tracking_number!)}
                  className="font-mono text-2xs text-muted-foreground tabular-nums transition-colors hover:text-foreground"
                >
                  {order.shipping.tracking_number}
                </button>
              )}
            </div>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell>
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {order.transaction_date
            ? formatDateTime(order.transaction_date)
            : "—"}
        </span>
      </TableCell>

      {extraColumns?.map((col) => (
        <TableCell key={col.key} className={col.cellClassName}>
          {col.cell(order)}
        </TableCell>
      ))}

      <TableCell>
        <div className="flex items-center justify-end gap-2">
          {variant === "sales" && (
            <OrderActions order={order} tab={tab} subFilter={null} />
          )}
          {variant === "outbound-ready" && (
            <OutboundReadyActions order={order} />
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function OrderTable({
  orders,
  tab,
  variant,
  selectable = false,
  selectedIds,
  onToggle,
  allSelected = false,
  someSelected = false,
  onToggleAll,
  extraColumns,
  getRowSelectable,
  sorting,
  onSortingChange,
}: OrderTableProps) {
  return (
    <Table containerClassName="rounded-xl border border-border/60">
      <TableHeader className="bg-muted/40">
        <TableRow>
          {selectable && (
            <TableHead className="w-9">
              <Checkbox
                checked={
                  allSelected ? true : someSelected ? "indeterminate" : false
                }
                onCheckedChange={onToggleAll}
                aria-label="Pilih semua"
              />
            </TableHead>
          )}
          <SortableTableHead
            id="salesorder_no"
            title="No. Pesanan"
            sorting={sorting}
            onSortingChange={onSortingChange}
          />
          <TableHead>Pelanggan</TableHead>
          <TableHead className="text-center whitespace-nowrap">Total SKU/ Qty</TableHead>
          <SortableTableHead
            id="status"
            title="Status"
            sorting={sorting}
            onSortingChange={onSortingChange}
          />
          <TableHead>Lokasi</TableHead>
          <SortableTableHead
            id="grand_total"
            title="Total"
            sorting={sorting}
            onSortingChange={onSortingChange}
          />
          <TableHead>Kurir</TableHead>
          <SortableTableHead
            id="transaction_date"
            title="Tanggal & Jam"
            sorting={sorting}
            onSortingChange={onSortingChange}
          />
          {extraColumns?.map((col) => (
            <TableHead key={col.key} className={col.headClassName}>
              {col.header}
            </TableHead>
          ))}
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            tab={tab}
            variant={variant}
            selectable={selectable}
            selected={selectedIds?.has(order.id) ?? false}
            onToggle={onToggle}
            extraColumns={extraColumns}
            rowSelectability={getRowSelectable?.(order)}
          />
        ))}
      </TableBody>
    </Table>
  );
}
