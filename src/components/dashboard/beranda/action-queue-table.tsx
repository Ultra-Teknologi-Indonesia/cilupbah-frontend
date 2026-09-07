"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { ArrowRightIcon, Loader2Icon, PackageCheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDateTimeWib } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDashboardQueue } from "@/hooks/dashboard/use-dashboard";
import { useMoveToReady } from "@/hooks/pesanan/use-order-actions";
import type {
  DashboardQueue,
  DashboardQueueRow,
} from "@/types/dashboard/dashboard";
import { QueueRowActions } from "./queue-row-actions";

interface ActionQueueTableProps {
  queue: DashboardQueue;
  title: string;
  icon: LucideIcon;
  emptyMessage: string;

  viewAllHref?: string;
}

const PER_PAGE = 5;

export function ActionQueueTable({
  queue,
  title,
  icon: Icon,
  emptyMessage,
  viewAllHref,
}: ActionQueueTableProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const moveToReady = useMoveToReady();

  const { data, isLoading } = useDashboardQueue(queue, {
    page: 1,
    per_page: PER_PAGE,
  });

  const items = data?.items ?? [];
  const total = data?.meta?.total ?? 0;

  const isProcessQueue = queue === "ready-to-process";
  const handleProcessAll = () =>
    moveToReady.mutate(
      items.map((it) => it.id),
      {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      },
    );

  return (
    <div className="flex flex-col overflow-hidden rounded-4xl bg-card text-sm text-card-foreground shadow-md ring-1 ring-foreground/5 dark:ring-foreground/10">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4.5 shrink-0 text-muted-foreground" />
          <h3 className="truncate font-heading font-semibold">{title}</h3>
          {total > 0 ? (
            <Badge variant="secondary" className="tabular-nums">
              {total}
            </Badge>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isProcessQueue && items.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              disabled={moveToReady.isPending}
              onClick={handleProcessAll}
            >
              {moveToReady.isPending ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <PackageCheckIcon className="size-3.5" />
              )}
              Proses semua
            </Button>
          ) : null}
          {viewAllHref ? (
            <Button variant="ghost" size="sm" className="text-xs" asChild>
              <Link href={viewAllHref}>
                Lihat semua
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      {isLoading ? (
        <div className="flex flex-col gap-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Icon}
          title="Antrian bersih"
          description={emptyMessage}
        />
      ) : (
        <Table scrollContainer={false}>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/80 hover:bg-muted/80">
              <TableHead className="h-10">No. Pesanan</TableHead>
              <TableHead className="hidden h-10 md:table-cell">Channel</TableHead>
              <TableHead className="hidden h-10 2xl:table-cell">Pelanggan</TableHead>
              <TableHead className="hidden h-10 lg:table-cell">Tanggal</TableHead>
              <TableHead className="h-10 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <QueueRow
                key={row.id}
                queue={queue}
                row={row}
                onOpen={router.push}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function QueueRow({
  queue,
  row,
  onOpen,
}: {
  queue: DashboardQueue;
  row: DashboardQueueRow;
  onOpen: (href: string) => void;
}) {
  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => onOpen(`/dashboard/pesanan/${row.id}`)}
    >
      <TableCell className="max-w-36 sm:max-w-none">
        <Link
          href={`/dashboard/pesanan/${row.id}`}
          className="font-mono text-xs font-medium hover:text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.salesorder_no || "—"}
        </Link>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {row.source ? (
          <Badge variant="secondary" className="capitalize">
            {row.source}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className={cn("hidden 2xl:table-cell", !row.customer_name && "text-muted-foreground")}>
        {row.customer_name || "—"}
      </TableCell>
      <TableCell className="hidden text-muted-foreground lg:table-cell">
        {formatDateTimeWib(row.transaction_date)}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <QueueRowActions queue={queue} row={row} />
      </TableCell>
    </TableRow>
  );
}
