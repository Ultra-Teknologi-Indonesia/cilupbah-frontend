"use client";
import Image from "next/image";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLinkIcon, ImageIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import type { RaiseProductDetail } from "@/hooks/master-produk/use-naikkan";
import { CountdownTimer } from "./countdown-timer";

function statusBadge(isActive: boolean) {
  return (
    <StatusBadge
      domain="product-boost"
      status={isActive ? "ACTIVE" : "INACTIVE"}
    />
  );
}

function resultBadge(isSuccess: boolean | null) {
  if (isSuccess === null)
    return <span className="text-muted-foreground">—</span>;
  return (
    <StatusBadge
      domain="product-boost-activity"
      status={isSuccess ? "SUCCESS" : "FAILED"}
    />
  );
}

export function buildProdukColumns(opts: {
  onToggleRepeatable: (detail: RaiseProductDetail, value: boolean) => void;
  onRemove: (detail: RaiseProductDetail) => void;
  canEdit: boolean;
  canDelete: boolean;
}): ColumnDef<RaiseProductDetail>[] {
  return [
    {
      id: "product",
      header: "Produk",
      cell: ({ row }) => {
        const d = row.original;
        const thumb = d.thumbnails.find(Boolean) ?? null;
        const skuDisplay =
          d.itemCodes.length <= 2
            ? d.itemCodes.join(", ")
            : `${d.itemCodes.slice(0, 2).join(", ")} + ${d.itemCodes.length - 2} SKU lainnya`;

        return (
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
              {thumb ? (
                <Image
                  unoptimized
                  width={400}
                  height={400}
                  src={thumb}
                  alt={d.itemGroupName ?? ""}
                  className="size-full object-cover"
                />
              ) : (
                <ImageIcon className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="line-clamp-1 font-medium">
                {d.itemGroupName ?? "—"}
              </p>
              <p className="line-clamp-1 font-mono text-xs text-muted-foreground">
                {skuDisplay || "—"}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "channel_url",
      header: "URL",
      cell: ({ row }) => {
        const url = row.original.channelUrl;
        if (!url) return <span className="text-muted-foreground">—</span>;
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLinkIcon className="size-3.5" />
            Lihat
          </a>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => statusBadge(row.original.isActive),
    },
    {
      id: "countdown",
      header: "Sisa Waktu",
      cell: ({ row }) => (
        <CountdownTimer
          startTime={row.original.startTime}
          endTime={row.original.endTime}
        />
      ),
    },
    {
      id: "repeatable",
      header: "Otomatis",
      cell: ({ row }) => {
        const d = row.original;
        return (
          <Switch
            checked={d.isRepeatable}
            disabled={!opts.canEdit}
            onCheckedChange={(checked) => opts.onToggleRepeatable(d, checked)}
          />
        );
      },
    },
    {
      id: "result",
      header: "Hasil",
      cell: ({ row }) => {
        const detail = row.original;
        return (
          <div className="flex max-w-[280px] items-center gap-2">
            {resultBadge(detail.isSuccess)}
            {detail.isSuccess === false && detail.reason && (
              <span
                className="line-clamp-2 text-xs text-muted-foreground"
                title={detail.reason}
              >
                {detail.reason}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        opts.canDelete ? (
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-destructive hover:text-destructive"
              onClick={() => opts.onRemove(row.original)}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ) : null,
    },
  ];
}
