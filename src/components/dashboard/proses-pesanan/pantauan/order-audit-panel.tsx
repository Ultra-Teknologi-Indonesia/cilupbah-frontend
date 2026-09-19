"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  Clock3Icon,
  InboxIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchCheckIcon,
  Trash2Icon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { apiError } from "@/lib/toast";
import { toast } from "sonner";
import { useOrderAudit } from "@/hooks/proses-pesanan/use-fulfillment";
import type {
  OrderAudit,
  OrderAuditOrder,
  OrderAuditWebhook,
  OrderAuditWebhookState,
} from "@/types/proses-pesanan/order-audit";

const WEBHOOK_STATE: Record<
  OrderAuditWebhookState,
  { label: string; variant: "success" | "warning" | "destructive" | "muted" | "info"; icon: typeof InboxIcon }
> = {
  waiting: { label: "Diterima / menunggu worker", variant: "warning", icon: Clock3Icon },
  queued: { label: "Sedang antri", variant: "info", icon: InboxIcon },
  success: { label: "Berhasil diproses", variant: "success", icon: CheckCircle2Icon },
  failed: { label: "Failed", variant: "destructive", icon: AlertTriangleIcon },
  skipped: { label: "Dilewati", variant: "muted", icon: AlertTriangleIcon },
  unknown: { label: "Tidak diketahui", variant: "muted", icon: AlertTriangleIcon },
};

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function orderPosition(order: OrderAuditOrder): string {
  if (order.wmsStatus) return order.wmsStatus;
  if (order.internalStatus) return order.internalStatus;
  if (order.processed) return "Sudah diproses";
  return "Sudah masuk WMS";
}

function OrderSummary({ order }: { order: OrderAuditOrder }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/65 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold">{order.internalOrderNo}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Channel: {order.channelOrderNo || "—"} · {order.channel || order.source || "internal"}
          </p>
        </div>
        <Badge variant={order.processed ? "success" : "info"}>
          Posisi: {orderPosition(order)}
        </Badge>
      </div>
      <div className="mt-4 grid gap-3 text-xs sm:grid-cols-4">
        <div>
          <p className="text-muted-foreground">Toko</p>
          <p className="mt-1 font-medium">{order.shopName || order.shopId || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Gudang</p>
          <p className="mt-1 font-medium">{order.locationName || order.locationCode || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Status channel</p>
          <p className="mt-1 font-medium">{order.channelStatus || order.channelFulfillmentStatus || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Dibuat</p>
          <p className="mt-1 font-medium">{formatDate(order.created_at)}</p>
        </div>
      </div>
    </div>
  );
}

function WebhookRow({ webhook }: { webhook: OrderAuditWebhook }) {
  const state = WEBHOOK_STATE[webhook.processing_state] ?? WEBHOOK_STATE.unknown;
  const StateIcon = state.icon;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-background/65 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-2.5">
        <StateIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium uppercase">{webhook.channel}</span>
            <Badge variant={state.variant}>{state.label}</Badge>
            <span className="text-muted-foreground">event {webhook.event_type || "—"}</span>
          </div>
          <p className="mt-1 truncate text-muted-foreground">
            Masuk {formatDate(webhook.received_at)} · Percobaan {webhook.attempts}
          </p>
          {webhook.error ? (
            <p className="mt-1 line-clamp-2 text-destructive">{webhook.error}</p>
          ) : null}
        </div>
      </div>
      <span className="shrink-0 text-muted-foreground">{webhook.locationCode || "di luar scope"}</span>
    </div>
  );
}

function AuditResult({
  result,
  onReplay,
  onDelete,
  onPull,
  isReplayPending,
  isDeletePending,
  isPullPending,
  canReplay,
  canDelete,
  canPull,
  canPullFromMarketplace,
  selectedShopName,
}: {
  result: OrderAudit;
  onReplay: () => void;
  onDelete: () => void;
  onPull: () => void;
  isReplayPending: boolean;
  isDeletePending: boolean;
  isPullPending: boolean;
  canReplay: boolean;
  canDelete: boolean;
  canPull: boolean;
  canPullFromMarketplace: boolean;
  selectedShopName: string;
}) {
  const replayable = result.webhooks.some((webhook) => webhook.replayable);
  const statusTitle = result.foundInWms
    ? "Order sudah ada di WMS"
    : result.webhooks.length > 0
      ? "Webhook ditemukan, order belum ada di WMS"
      : "Belum ditemukan di WMS";

  return (
    <div className="mt-5 space-y-4 border-t border-border/60 pt-5">
      <div className="flex flex-col gap-3 rounded-2xl bg-muted/45 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">{statusTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Referensi: <span className="font-mono">{result.reference}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canReplay && result.actions.canInclude && replayable ? (
            <Button type="button" size="sm" onClick={onReplay} disabled={isReplayPending}>
              {isReplayPending ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
              Masukkan ke antrean WMS
            </Button>
          ) : null}
          {canDelete && result.actions.canDelete ? (
            <Button type="button" size="sm" variant="destructive" onClick={onDelete} disabled={isDeletePending}>
              {isDeletePending ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
              Buang order
            </Button>
          ) : null}
          {canPull && canPullFromMarketplace && !result.foundInWms ? (
            <Button type="button" size="sm" variant="outline" onClick={onPull} disabled={isPullPending}>
              {isPullPending ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
              Tarik dari marketplace
            </Button>
          ) : null}
        </div>
      </div>

      {canPullFromMarketplace && !result.foundInWms ? (
        <p className="rounded-xl bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          Pull langsung memakai toko <span className="font-medium text-foreground">{selectedShopName}</span> dan hanya mengambil nomor pesanan ini. Sistem tetap mengecek ulang agar tidak duplikat.
        </p>
      ) : null}

      {result.orders.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Data WMS</p>
          {result.orders.map((order) => <OrderSummary key={order.id} order={order} />)}
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Riwayat webhook</p>
          <span className="text-xs text-muted-foreground">{result.webhooks.length} event cocok</span>
        </div>
        {result.webhooks.length > 0 ? (
          result.webhooks.map((webhook) => <WebhookRow key={webhook.id} webhook={webhook} />)
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
            Tidak ada webhook order yang cocok. Jangan langsung menarik ulang tanpa memastikan channel, toko, dan rentang waktunya karena itu berisiko membuat order ganda.
          </div>
        )}
      </div>
    </div>
  );
}

export function OrderAuditPanel() {
  const [reference, setReference] = useState("");
  const [searchedReference, setSearchedReference] = useState("");
  const [channel, setChannel] = useState("");
  const [shopId, setShopId] = useState("");
  const [result, setResult] = useState<OrderAudit | null>(null);
  const [confirmAction, setConfirmAction] = useState<"replay" | "delete" | "pull" | null>(null);
  const { can } = usePermissions();
  const { audit, replay, remove, pullMarketplace, shops, shopsQuery } = useOrderAudit();

  const canReplay = can("edit-pesanan");
  const canDelete = can("delete-pesanan");
  const canPull = can("edit-pesanan");
  const filteredShops = shops.filter((shop) => !channel || shop.channel === channel);
  const selectedShop = shops.find(
    (shop) => shop.shopId === shopId && shop.channel === channel,
  );
  const canPullFromMarketplace = Boolean(!result?.foundInWms && channel && shopId && searchedReference);
  const busy = audit.isPending || replay.isPending || remove.isPending || pullMarketplace.isPending;
  const submitLabel = useMemo(() => (audit.isPending ? "Memeriksa…" : "Periksa"), [audit.isPending]);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = reference.trim();
    if (!value) {
      toast.error("Masukkan nomor pesanan channel atau internal.");
      return;
    }
    setSearchedReference(value);
    try {
      const next = await audit.mutateAsync(value);
      setResult(next);
      const webhookShop = next.webhooks.find((webhook) => webhook.channel && webhook.shopId);
      if (webhookShop) {
        const matchingShop = shops.find(
          (shop) => shop.channel === webhookShop.channel && shop.shopId === webhookShop.shopId,
        );
        if (matchingShop) {
          setChannel(matchingShop.channel);
          setShopId(matchingShop.shopId);
        }
      }
    } catch (error) {
      setResult(null);
      apiError(error, "Gagal memeriksa pesanan.");
    }
  }

  async function handleConfirmedAction() {
    if (!searchedReference || !confirmAction) return;
    try {
      const next = confirmAction === "replay"
        ? await replay.mutateAsync(searchedReference)
        : confirmAction === "delete"
          ? await remove.mutateAsync(searchedReference)
          : await pullMarketplace.mutateAsync({
              reference: searchedReference,
              channel,
              shopId,
            });
      setResult(next);
      setConfirmAction(null);
      toast.success(
        confirmAction === "replay"
          ? "Order dimasukkan ke antrean WMS."
          : confirmAction === "delete"
            ? "Order berhasil dibuang."
            : "Order berhasil ditarik dari marketplace.",
      );
    } catch (error) {
      apiError(
        error,
        confirmAction === "replay"
          ? "Order belum dapat dimasukkan."
          : confirmAction === "delete"
            ? "Order belum dapat dibuang."
            : "Order belum dapat ditarik dari marketplace.",
      );
    }
  }

  return (
    <>
      <LiquidGlass radius={24} intensity="default" className="bg-white/40 dark:bg-white/[0.06]">
        <Card className="border-0 bg-transparent shadow-none">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <SearchCheckIcon className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold">Audit order belum masuk WMS</h2>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    Cari nomor channel atau nomor internal untuk memastikan webhook, antrean, kegagalan, dan posisi order tanpa menarik ulang secara membabi buta.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="self-start">Read-only sebelum aksi</Badge>
            </div>

            <form onSubmit={handleSearch} className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Contoh: 586140183610426959 atau SO-INT-2609-000002"
                aria-label="Nomor pesanan channel atau internal"
                disabled={busy}
                className="h-10 flex-1 rounded-xl"
              />
              <Button type="submit" size="lg" disabled={busy || !reference.trim()}>
                {audit.isPending ? <Loader2Icon className="animate-spin" /> : <SearchCheckIcon />}
                {submitLabel}
              </Button>
            </form>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <select
                value={channel}
                onChange={(event) => {
                  setChannel(event.target.value);
                  setShopId("");
                }}
                disabled={busy || shopsQuery.isPending}
                aria-label="Channel marketplace untuk pull langsung"
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">Pilih channel untuk pull langsung</option>
                <option value="shopee">Shopee</option>
                <option value="tiktok">TikTok Shop</option>
                <option value="lazada">Lazada</option>
                <option value="woocommerce">WooCommerce</option>
              </select>
              <select
                value={shopId}
                onChange={(event) => setShopId(event.target.value)}
                disabled={busy || !channel || shopsQuery.isPending}
                aria-label="Toko marketplace untuk pull langsung"
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">
                  {shopsQuery.isPending ? "Memuat toko…" : "Pilih toko marketplace"}
                </option>
                {filteredShops.map((shop) => (
                  <option key={shop.id} value={shop.shopId}>
                    {shop.shopName} ({shop.shopId})
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Untuk pull langsung, masukkan nomor pesanan channel lalu pilih channel dan toko yang tepat. Nomor internal hanya bisa diaudit atau diproses dari webhook.
            </p>

            {result ? (
              <AuditResult
                result={result}
                onReplay={() => canReplay && setConfirmAction("replay")}
                onDelete={() => canDelete && setConfirmAction("delete")}
                onPull={() => canPull && canPullFromMarketplace && setConfirmAction("pull")}
                isReplayPending={replay.isPending}
                isDeletePending={remove.isPending}
                isPullPending={pullMarketplace.isPending}
                canReplay={canReplay}
                canDelete={canDelete}
                canPull={canPull}
                canPullFromMarketplace={canPullFromMarketplace}
                selectedShopName={selectedShop?.shopName ?? "toko terpilih"}
              />
            ) : null}
          </CardContent>
        </Card>
      </LiquidGlass>

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction === "replay" ? "Masukkan order ke antrean WMS?" : confirmAction === "delete" ? "Buang order dari WMS?" : "Tarik order dari marketplace?"}
        description={confirmAction === "replay"
          ? "Sistem akan melakukan pengecekan kedua dan hanya mengirim ulang webhook jika order belum ada di WMS."
          : confirmAction === "delete"
            ? "Order hanya dapat dibuang jika belum diproses dan belum memiliki relasi proses gudang. Tindakan ini tidak menghapus order di marketplace."
            : `Sistem hanya mengambil order ${searchedReference} dari ${selectedShop?.shopName ?? "toko yang dipilih"}. Jika order sudah ada, proses dibatalkan agar tidak duplikat.`}
        confirmLabel={confirmAction === "replay" ? "Ya, masukkan" : confirmAction === "delete" ? "Ya, buang order" : "Ya, tarik order"}
        variant={confirmAction === "delete" ? "destructive" : "default"}
        loading={replay.isPending || remove.isPending || pullMarketplace.isPending}
        onConfirm={handleConfirmedAction}
      >
        <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          Referensi: <span className="font-mono font-medium text-foreground">{searchedReference}</span>
        </p>
      </ConfirmDialog>
    </>
  );
}
