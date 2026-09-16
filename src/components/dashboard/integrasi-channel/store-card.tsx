"use client";

import { ExternalLink, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { usePermissions } from "@/hooks/auth/use-permissions";
import type { ConnectedStore } from "@/types/channel";
import { ChannelLogo } from "./channel-logo";
import { StoreRowActions } from "./store-row-actions";

export function StoreCard({
  store,
  onToggleActive,
  onOpenSync,
  onRefresh,
  onReauth,
  onDisconnect,
}: {
  store: ConnectedStore;
  onToggleActive: (id: string, value: boolean) => void;
  onOpenSync: (store: ConnectedStore) => void;
  onRefresh: (store: ConnectedStore) => void;
  onReauth: (store: ConnectedStore) => void;
  onDisconnect: (store: ConnectedStore) => void;
}) {
  const { can } = usePermissions();
  const canEdit = can("edit-integrasi-channel");
  const activeAxes = [
    store.ordersEnabled,
    store.catalogPullEnabled,
    store.catalogPushEnabled,
    store.stockPushEnabled,
    store.pricePushEnabled,
  ].filter(Boolean).length;
  const status = store.orderSync.status;
  const needsReauth =
    store.integration.action === "reauth" ||
    store.orderSync.action === "reauth";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <ChannelLogo
            code={store.channel.code}
            name={store.channel.name}
            className="size-9 shrink-0"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-primary">
              {store.shopName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {store.channel.name}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {store.integration.status !== "normal" ? (
            <StatusBadge
              domain="channel-integration"
              status={store.integration.status}
            />
          ) : (
            <StatusBadge domain="order-download" status={status} />
          )}
          <StoreRowActions
            store={store}
            onRefresh={onRefresh}
            onReauth={onReauth}
            onDisconnect={onDisconnect}
          />
        </div>
      </div>

      <div className="space-y-1">
        {/* Prioritas catatan: jika integrasi bermasalah tampilkan catatan integrasi, jika tidak tampilkan catatan order sync */}
        {(() => {
          const primaryNote =
            store.integration.status !== "normal" && store.integration.note
              ? {
                  text: store.integration.note,
                  isError: store.integration.status === "error",
                }
              : store.orderSync.note
                ? { text: store.orderSync.note, isError: status === "problem" }
                : null;

          if (!primaryNote) return null;

          return (
            <p
              className={cn(
                "text-xs leading-relaxed",
                primaryNote.isError
                  ? "text-destructive font-medium"
                  : "text-muted-foreground",
              )}
            >
              {primaryNote.text}
            </p>
          );
        })()}

        <p className="text-xs text-muted-foreground">
          Terakhir di-update: {relativeTime(store.lastOrderSyncedAt)}
        </p>

        {store.linkedStore && (
          <div className="flex items-center gap-1.5 pt-0.5 text-xs text-muted-foreground">
            <ChannelLogo
              code={store.linkedStore.code}
              name={store.linkedStore.name}
              className="size-4"
            />
            <span className="truncate">{store.linkedStore.name}</span>
          </div>
        )}
      </div>

      {needsReauth && canEdit && (
        <Button
          size="sm"
          onClick={() => onReauth(store)}
          className="w-full gap-1.5"
        >
          <ExternalLink className="size-3.5" />
          Hubungkan Ulang
        </Button>
      )}

      {canEdit && (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={store.isActive}
              onCheckedChange={(v) => onToggleActive(store.id, v)}
              aria-label={`Toko aktif ${store.shopName}`}
            />
            <span className="text-xs text-muted-foreground">Toko Aktif</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenSync(store)}
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <SlidersHorizontal className="size-3.5" />
            Sinkronisasi
            <span className="text-foreground">{activeAxes}/5</span>
          </Button>
        </div>
      )}
    </div>
  );
}
