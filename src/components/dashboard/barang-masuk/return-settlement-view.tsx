"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { PageTitle } from "@/components/dashboard/page-title";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { useSalesReturn } from "@/hooks/barang-masuk/use-sales-returns";
import { useSalesReturnSetting } from "@/hooks/barang-masuk/use-sales-return-setting";
import {
  useReturnSettlementForReturn,
  useCreateReturnSettlement,
  useConfirmReturnSettlement,
  useCompleteReturnSettlement,
  useDeleteReturnSettlement,
  useAddRefund,
  useRemoveRefund,
} from "@/hooks/barang-masuk/use-return-settlement";

const DEFAULT_METHODS = ["cash", "transfer", "store_credit"];

function money(v: number | string | null | undefined): string {
  return `Rp ${Number(v ?? 0).toLocaleString("id-ID")}`;
}

export function ReturnSettlementView({ returnId }: { returnId: string }) {
  const router = useRouter();
  const { can } = usePermissions();
  const canView = can("view-pembayaran-penjualan") || can("view-retur-penjualan");
  const canEdit = can("edit-pembayaran-penjualan");
  const canCreate = can("create-pembayaran-penjualan");
  const canDelete = can("delete-pembayaran-penjualan");
  const backHref = `/dashboard/barang-masuk/retur/${returnId}`;

  const { data: ret } = useSalesReturn(returnId, canView);
  const { data: setting } = useSalesReturnSetting();
  const { data: settlement, isLoading } =
    useReturnSettlementForReturn(returnId);

  const createMut = useCreateReturnSettlement();
  const confirmMut = useConfirmReturnSettlement();
  const completeMut = useCompleteReturnSettlement();
  const deleteMut = useDeleteReturnSettlement();
  const addRefundMut = useAddRefund();
  const removeRefundMut = useRemoveRefund();

  const [refundNo, setRefundNo] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [refundDate, setRefundDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");

  const methodOptions = useMemo(
    () =>
      (setting?.allowed_refund_methods?.length
        ? setting.allowed_refund_methods
        : DEFAULT_METHODS
      ).map((m) => ({ value: m, label: m })),
    [setting],
  );

  const isDraft = settlement?.status === "DRAFT";
  const canAddRefund =
    isDraft &&
    !!refundNo.trim() &&
    Number(amount) > 0 &&
    !!method &&
    !!refundDate;

  const handleAddRefund = () => {
    if (!settlement || !canAddRefund || !canCreate) return;
    addRefundMut.mutate(
      {
        settlement_id: settlement.id,
        refund_number: refundNo.trim(),
        amount: Number(amount),
        refund_method: method,
        refund_date: refundDate,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setRefundNo("");
          setAmount("");
          setNotes("");
        },
      },
    );
  };

  if (!canView) {
    return (
      <div className="flex flex-col gap-5">
        <PageTitle
          title="Settlement Retur"
          backHref={backHref}
          breadcrumb={[
            { label: "Gudang" },
            { label: "Barang Masuk", href: "/dashboard/barang-masuk" },
            { label: "Retur", href: "/dashboard/barang-masuk/retur" },
            { label: ret?.return_number ?? "Retur", href: backHref },
            { label: "Settlement" },
          ]}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(backHref)}
            >
              <ArrowLeftIcon className="mr-1.5 size-4" /> Kembali
            </Button>
          }
        />
        <EmptyState
          title="Akses Ditolak"
          description="Anda tidak memiliki hak akses untuk melihat data settlement retur (view-pembayaran-penjualan atau view-retur-penjualan)."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        title="Settlement Retur"
        backHref={backHref}
        breadcrumb={[
          { label: "Gudang" },
          { label: "Barang Masuk", href: "/dashboard/barang-masuk" },
          { label: "Retur", href: "/dashboard/barang-masuk/retur" },
          { label: ret?.return_number ?? "Retur", href: backHref },
          { label: "Settlement" },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(backHref)}
          >
            <ArrowLeftIcon className="mr-1.5 size-4" /> Kembali
          </Button>
        }
      />

      {ret && ret.status !== "COMPLETED" ? (
        <LiquidGlass
          radius={16}
          intensity="subtle"
          className="bg-white/40 dark:bg-white/[0.06]"
        >
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            Settlement hanya bisa dibuat untuk retur berstatus <b>Selesai</b>.
            Selesaikan retur ini dulu.
          </div>
        </LiquidGlass>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
        </div>
      ) : !settlement ? (
        <LiquidGlass
          radius={16}
          intensity="subtle"
          className="bg-white/40 dark:bg-white/[0.06]"
        >
          <EmptyState
            icon={null}
            title="Belum ada settlement untuk retur ini."
            action={
              canCreate ? (
                <Button
                  onClick={() => createMut.mutate({ return_id: returnId })}
                  disabled={createMut.isPending}
                >
                  {createMut.isPending && (
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                  )}
                  Buat Settlement
                </Button>
              ) : undefined
            }
          />
        </LiquidGlass>
      ) : (
        <>
          <LiquidGlass
            radius={16}
            intensity="subtle"
            className="bg-white/40 dark:bg-white/[0.06]"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                <div>
                  <div className="text-xs text-muted-foreground">
                    No. Settlement
                  </div>
                  <div className="font-mono text-sm font-semibold">
                    {settlement.settlement_number}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <StatusBadge
                    domain="return-settlement"
                    status={settlement.status}
                    className="text-2xs"
                  />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="text-sm font-semibold tabular-nums">
                    {money(settlement.total_amount)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {settlement.status === "DRAFT" && (
                  <>
                    {canEdit && (
                      <Button
                        size="sm"
                        onClick={() => confirmMut.mutate(settlement.id)}
                        disabled={confirmMut.isPending}
                      >
                        Konfirmasi
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() =>
                          deleteMut.mutate(settlement.id, {
                            onSuccess: () => router.push(backHref),
                          })
                        }
                        disabled={deleteMut.isPending}
                      >
                        Hapus
                      </Button>
                    )}
                  </>
                )}
                {settlement.status === "CONFIRMED" && canEdit && (
                  <Button
                    size="sm"
                    onClick={() => completeMut.mutate(settlement.id)}
                    disabled={completeMut.isPending}
                  >
                    Selesaikan
                  </Button>
                )}
              </div>
            </div>
          </LiquidGlass>

          <LiquidGlass
            radius={16}
            intensity="subtle"
            className="bg-white/40 dark:bg-white/[0.06]"
          >
            <div className="flex flex-col gap-3 px-5 py-5">
              <p className="text-sm font-medium">Refund Tunai</p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table className="min-w-[520px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Refund</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      {isDraft && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(settlement.refunds ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={isDraft ? 5 : 4}
                          className="py-8 text-center text-muted-foreground"
                        >
                          Belum ada refund.
                        </TableCell>
                      </TableRow>
                    ) : (
                      settlement.refunds!.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">
                            {r.refund_number}
                          </TableCell>
                          <TableCell>{r.refund_method}</TableCell>
                          <TableCell>{r.refund_date}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(r.amount)}
                          </TableCell>
                          {isDraft && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive"
                                onClick={() => removeRefundMut.mutate(r.id)}
                                aria-label="Hapus"
                              >
                                <Trash2Icon className="size-3.5" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {isDraft && (
                <div className="grid grid-cols-1 items-end gap-2 rounded-lg border border-dashed border-border p-3 sm:grid-cols-[1fr_140px_130px_130px_auto]">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">No. Refund</Label>
                    <Input
                      value={refundNo}
                      onChange={(e) => setRefundNo(e.target.value)}
                      placeholder="REF-001"
                      className="h-9"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Metode</Label>
                    <Combobox
                      options={methodOptions}
                      value={method}
                      onChange={(v) => setMethod(v ?? "cash")}
                      placeholder="Metode"
                      searchPlaceholder="Metode"
                      className="h-9"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Tanggal</Label>
                    <Input
                      type="date"
                      value={refundDate}
                      onChange={(e) => setRefundDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Jumlah</Label>
                    <Input
                      type="number"
                      min={0}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddRefund}
                    disabled={!canAddRefund || addRefundMut.isPending}
                    className="gap-1"
                  >
                    <PlusIcon className="size-4" /> Tambah
                  </Button>
                </div>
              )}
            </div>
          </LiquidGlass>

          {(settlement.invoices ?? []).length > 0 && (
            <LiquidGlass
              radius={16}
              intensity="subtle"
              className="bg-white/40 dark:bg-white/[0.06]"
            >
              <div className="flex flex-col gap-3 px-5 py-5">
                <p className="text-sm font-medium">Potong Faktur</p>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table className="min-w-[360px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Faktur</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settlement.invoices!.map((iv) => (
                        <TableRow key={iv.id}>
                          <TableCell className="font-mono text-xs">
                            {iv.invoice?.invoice_number ?? iv.invoice_id}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(iv.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </LiquidGlass>
          )}
        </>
      )}
    </div>
  );
}
