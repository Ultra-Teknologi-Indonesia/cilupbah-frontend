"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  FlagIcon,
  Loader2Icon,
  RefreshCwIcon,
  WalletIcon,
  XCircleIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageTitle } from "@/components/dashboard/page-title";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserSelect } from "@/components/dashboard/shared/user-select";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { ChannelLogo } from "@/components/dashboard/integrasi-channel/channel-logo";
import type { ChannelCode } from "@/types/channel";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useSalesReturn,
  useSalesReturnAppeals,
  useChannelRejectReasons,
} from "@/hooks/barang-masuk/use-sales-returns";
import {
  useAcceptSalesReturn,
  useRejectSalesReturn,
  useCompleteSalesReturn,
  useSyncReturnDetail,
  useChannelAcceptSalesReturn,
  useChannelRejectSalesReturn,
} from "@/hooks/barang-masuk/use-sales-return-actions";
import { formatDateTimeWib } from "@/lib/format";
import { usePermissions } from "@/hooks/auth/use-permissions";

function isMpDecisionActionable(decision?: string | null): boolean {
  return !decision || decision === "MP_PENDING";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

const APPEAL_OPERATOR_LABELS: Record<string, string> = {
  BUYER: "Pembeli",
  SELLER: "Penjual",
  PLATFORM: "Marketplace",
};

const LIST_HREF = "/dashboard/barang-masuk/retur";

function channelCode(ret: { channel?: string | null; source: string }): ChannelCode {
  return (ret.channel ?? (ret.source === "marketplace" ? "marketplace" : "manual")) as ChannelCode;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

export function SalesReturnDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { can } = usePermissions();
  const canEditReturn = can("edit-retur-penjualan");
  const { data: ret, isLoading } = useSalesReturn(id);
  const isMarketplace = ret?.source === "marketplace";
  const isCancelledShipped = ret?.reason_category === "CANCEL_SHIPPED";
  const { data: appeals = [] } = useSalesReturnAppeals(id, isMarketplace);

  const acceptMut = useAcceptSalesReturn();
  const rejectMut = useRejectSalesReturn();
  const completeMut = useCompleteSalesReturn();
  const syncDetailMut = useSyncReturnDetail();
  const channelAcceptMut = useChannelAcceptSalesReturn();
  const channelRejectMut = useChannelRejectSalesReturn();

  const [action, setAction] = useState<
    | null
    | "accept"
    | "reject"
    | "complete"
    | "channel-accept"
    | "channel-reject"
  >(null);
  const [processedBy, setProcessedBy] = useState("");
  const [reason, setReason] = useState("");
  const [channelRejectReasonId, setChannelRejectReasonId] = useState("");
  const [channelRejectNote, setChannelRejectNote] = useState("");

  const { data: channelRejectReasons = [] } = useChannelRejectReasons(
    id,
    action === "channel-reject",
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!ret) {
    return (
      <div className="py-32">
        <EmptyState title="Retur tidak ditemukan." />
      </div>
    );
  }

  const totalQty = ret.items?.reduce((s, i) => s + i.qty, 0) ?? 0;

  const closeAction = () => {
    setAction(null);
    setProcessedBy("");
    setReason("");
    setChannelRejectReasonId("");
    setChannelRejectNote("");
  };

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        title={ret.return_number}
        backHref={LIST_HREF}
        breadcrumb={[
          { label: "Gudang" },
          { label: "Barang Masuk", href: "/dashboard/barang-masuk" },
          { label: "Retur", href: LIST_HREF },
          { label: ret.return_number },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(LIST_HREF)}
            >
              <ArrowLeftIcon className="mr-1.5 size-4" /> Kembali
            </Button>
            {canEditReturn && isMarketplace && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncDetailMut.mutate(id)}
                disabled={syncDetailMut.isPending}
              >
                <RefreshCwIcon
                  className={cn(
                    "mr-1.5 size-4",
                    syncDetailMut.isPending && "animate-spin",
                  )}
                />
                Sinkron Marketplace
              </Button>
            )}
            {canEditReturn && ret.status === "PENDING" && (
              <>
                <Button
                  size="sm"
                  onClick={() => {
                    closeAction();
                    setAction("accept");
                  }}
                  className="bg-success text-white hover:bg-success/90"
                >
                  <CheckCircleIcon className="mr-1.5 size-4" /> Setujui
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    closeAction();
                    setAction("reject");
                  }}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <XCircleIcon className="mr-1.5 size-4" /> Tolak
                </Button>
              </>
            )}
            {canEditReturn && ret.status === "ACCEPTED" && (
              isCancelledShipped ? (
                <Button size="sm" asChild>
                  <Link
                    href={`/dashboard/barang-masuk/penerimaan?penerimaan_search=${encodeURIComponent(ret.return_number)}`}
                  >
                    <CheckCircleIcon className="mr-1.5 size-4" /> Buka Penerimaan
                  </Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    closeAction();
                    setAction("complete");
                  }}
                  className="bg-success text-white hover:bg-success/90"
                >
                  <FlagIcon className="mr-1.5 size-4" /> Selesaikan
                </Button>
              )
            )}
            {canEditReturn && ret.status === "COMPLETED" && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`${LIST_HREF}/${ret.id}/settlement`}>
                  <WalletIcon className="mr-1.5 size-4" /> Kelola Refund
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 px-5 py-5 sm:grid-cols-3 lg:grid-cols-4">
          <InfoRow
            label="Status"
            value={
              <StatusBadge
                domain="sales-return"
                status={ret.status}
                className="text-2xs"
              />
            }
          />
          <InfoRow
            label="Sumber"
            value={
              <div className="flex items-center gap-2">
                <ChannelLogo
                  code={channelCode(ret)}
                  name={ret.channel_name ?? ret.channel ?? "Manual"}
                  className="size-7 rounded-lg"
                />
                <div>
                  <div>{ret.channel_name ?? ret.channel ?? "Manual"}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {ret.channel_shop_name ?? (ret.source === "marketplace" ? "Toko channel" : "Input manual")}
                  </div>
                </div>
              </div>
            }
          />
          <InfoRow label="Pesanan" value={ret.order?.salesorder_no ?? "—"} />
          <InfoRow
            label="Pelanggan"
            value={ret.customer_name ?? ret.order?.customer_name ?? "—"}
          />
          <InfoRow
            label="Lokasi Restock"
            value={ret.location?.location_name ?? "—"}
          />
          <InfoRow
            label="Total Qty"
            value={<span className="tabular-nums">{totalQty}</span>}
          />
          <InfoRow label="Tgl. Dibuat" value={formatDateTimeWib(ret.created_at)} />
          <InfoRow label="Diproses oleh" value={ret.processed_by ?? "—"} />
          {(ret.reason_display || ret.reason || ret.channel_reason_text) && (
            <InfoRow
              label="Alasan"
              value={ret.reason_display ?? ret.channel_reason_text ?? ret.reason}
            />
          )}
          {ret.notes && <InfoRow label="Catatan" value={ret.notes} />}
        </div>
      </LiquidGlass>

      {isMarketplace && (
        <LiquidGlass
          radius={16}
          intensity="subtle"
          className="bg-white/40 dark:bg-white/[0.06]"
        >
          <div className="flex items-center justify-between gap-2 px-5 pt-5">
            <p className="text-sm font-medium">Keputusan Marketplace</p>
            {canEditReturn && !isCancelledShipped && isMpDecisionActionable(ret.marketplace_decision) && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    closeAction();
                    setAction("channel-accept");
                  }}
                  className="bg-success text-white hover:bg-success/90"
                >
                  <CheckCircleIcon className="mr-1.5 size-4" /> Setujui di
                  Marketplace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    closeAction();
                    setAction("channel-reject");
                  }}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <XCircleIcon className="mr-1.5 size-4" /> Tolak di Marketplace
                </Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 px-5 py-5 sm:grid-cols-3 lg:grid-cols-4">
            <InfoRow
              label="Status Keputusan"
              value={
                <StatusBadge
                  domain="sales-return-marketplace-decision"
                  status={ret.marketplace_decision}
                  className="text-2xs"
                />
              }
            />
            <InfoRow
              label="Status di Channel"
              value={
                ret.marketplace_raw_status_label ??
                ret.marketplace_raw_status ??
                "—"
              }
            />
            <InfoRow
              label="Alasan Channel"
              value={ret.reason_display ?? ret.channel_reason_text ?? ret.channel_reason_code ?? "—"}
            />
            <InfoRow
              label="Nominal Refund"
              value={
                ret.refund_amount != null
                  ? formatCurrency(ret.refund_amount)
                  : "—"
              }
            />
            <InfoRow
              label="Selisih Ongkir"
              value={
                ret.shipping_fee_original != null &&
                ret.shipping_fee_return != null
                  ? formatCurrency(
                      ret.shipping_fee_return - ret.shipping_fee_original,
                    )
                  : "—"
              }
            />
            <InfoRow
              label="Terakhir Disinkron"
              value={
                ret.detail_synced_at ? formatDateTimeWib(ret.detail_synced_at) : "—"
              }
            />
          </div>
        </LiquidGlass>
      )}

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="px-5 py-5">
          <p className="mb-3 text-sm font-medium">Item Retur</p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table className="min-w-[520px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Kondisi</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(ret.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-muted-foreground"
                    >
                      Tidak ada item.
                    </TableCell>
                  </TableRow>
                ) : (
                  ret.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        {it.product?.product?.name ?? it.product?.sku ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {it.product?.sku ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-2xs">
                          {it.condition ?? "GOOD"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {it.qty}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </LiquidGlass>

      {isMarketplace && appeals.length > 0 && (
        <LiquidGlass
          radius={16}
          intensity="subtle"
          className="bg-white/40 dark:bg-white/[0.06]"
        >
          <div className="px-5 py-5">
            <p className="mb-3 text-sm font-medium">Riwayat Banding</p>
            <ol className="flex flex-col gap-4">
              {appeals.map((appeal) => (
                <li key={appeal.id} className="flex gap-3">
                  <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {appeal.record_type}
                      </span>
                      <Badge variant="secondary" className="text-2xs">
                        {APPEAL_OPERATOR_LABELS[appeal.operator] ??
                          appeal.operator}
                      </Badge>
                    </div>
                    {appeal.description && (
                      <p className="text-xs text-muted-foreground">
                        {appeal.description}
                      </p>
                    )}
                    <span className="text-2xs text-muted-foreground">
                      {formatDateTimeWib(appeal.recorded_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </LiquidGlass>
      )}

      <ConfirmDialog
        open={action === "accept"}
        onOpenChange={(o) => {
          if (!o) closeAction();
        }}
        title="Setujui Retur"
        description={
          isCancelledShipped
            ? `Paket retur ${ret.return_number} sudah diterima fisik di gudang? Sistem akan membuat dokumen penerimaan. Stok baru bertambah setelah SKU dipindai dan ditempatkan ke rak.`
            : `Setujui retur ${ret.return_number}? Barang akan dijadwalkan masuk kembali ke stok.`
        }
        confirmLabel="Setujui"
        loading={acceptMut.isPending}
        onConfirm={() => {
          if (!processedBy.trim()) return;
          acceptMut.mutate(
            { id: ret.id, processed_by: processedBy.trim() },
            { onSuccess: closeAction },
          );
        }}
      >
        <div className="px-1 py-2">
          <Label className="text-sm font-medium">
            Diproses oleh <span className="text-destructive">*</span>
          </Label>
          <UserSelect
            value={processedBy}
            onChange={setProcessedBy}
            defaultToSelf
            placeholder="Nama petugas"
            className="mt-1.5"
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={action === "reject"}
        onOpenChange={(o) => {
          if (!o) closeAction();
        }}
        title="Tolak Retur"
        description={`Tolak retur ${ret.return_number}?`}
        confirmLabel="Tolak"
        variant="destructive"
        loading={rejectMut.isPending}
        onConfirm={() => {
          if (!processedBy.trim()) return;
          rejectMut.mutate(
            {
              id: ret.id,
              processed_by: processedBy.trim(),
              reason: reason.trim() || undefined,
            },
            { onSuccess: closeAction },
          );
        }}
      >
        <div className="flex flex-col gap-3 px-1 py-2">
          <div>
            <Label className="text-sm font-medium">
              Diproses oleh <span className="text-destructive">*</span>
            </Label>
            <UserSelect
              value={processedBy}
              onChange={setProcessedBy}
              defaultToSelf
              placeholder="Nama petugas"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Alasan penolakan</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Alasan (opsional)"
              className="mt-1.5"
            />
          </div>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={action === "complete"}
        onOpenChange={(o) => {
          if (!o) closeAction();
        }}
        title="Selesaikan Retur"
        description={`Tandai retur ${ret.return_number} selesai? Pastikan barang sudah diterima kembali ke stok.`}
        confirmLabel="Selesaikan"
        loading={completeMut.isPending}
        onConfirm={() => {
          if (!processedBy.trim()) return;
          completeMut.mutate(
            { id: ret.id, processed_by: processedBy.trim() },
            { onSuccess: closeAction },
          );
        }}
      >
        <div className="px-1 py-2">
          <Label className="text-sm font-medium">
            Diproses oleh <span className="text-destructive">*</span>
          </Label>
          <UserSelect
            value={processedBy}
            onChange={setProcessedBy}
            defaultToSelf
            placeholder="Nama petugas"
            className="mt-1.5"
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={action === "channel-accept"}
        onOpenChange={(o) => {
          if (!o) closeAction();
        }}
        title="Setujui Retur di Marketplace"
        description={`Teruskan persetujuan retur ${ret.return_number} ke marketplace?`}
        confirmLabel="Setujui"
        loading={channelAcceptMut.isPending}
        onConfirm={() => {
          channelAcceptMut.mutate(ret.id, { onSuccess: closeAction });
        }}
      />

      <ConfirmDialog
        open={action === "channel-reject"}
        onOpenChange={(o) => {
          if (!o) closeAction();
        }}
        title="Tolak Retur di Marketplace"
        description={`Teruskan penolakan retur ${ret.return_number} ke marketplace. Alasan diambil dari daftar resmi channel — pilih alasan yang paling sesuai jika retur ini dianggap tidak valid ("bukan retur").`}
        confirmLabel="Tolak"
        variant="destructive"
        loading={channelRejectMut.isPending}
        onConfirm={() => {
          if (!channelRejectReasonId) return;
          channelRejectMut.mutate(
            {
              id: ret.id,
              reason_id: channelRejectReasonId,
              note: channelRejectNote.trim() || undefined,
            },
            { onSuccess: closeAction },
          );
        }}
      >
        <div className="flex flex-col gap-3 px-1 py-2">
          <div>
            <Label className="text-sm font-medium">
              Alasan <span className="text-destructive">*</span>
            </Label>
            <Combobox
              options={channelRejectReasons.map((r) => ({
                value: r.id,
                label: r.text,
              }))}
              value={channelRejectReasonId}
              onChange={(v) => setChannelRejectReasonId(v ?? "")}
              placeholder="Pilih alasan"
              searchPlaceholder="Cari alasan"
              className="mt-1.5 h-9 bg-background"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Catatan</Label>
            <Input
              value={channelRejectNote}
              onChange={(e) => setChannelRejectNote(e.target.value)}
              placeholder="Catatan tambahan (opsional)"
              className="mt-1.5"
            />
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
