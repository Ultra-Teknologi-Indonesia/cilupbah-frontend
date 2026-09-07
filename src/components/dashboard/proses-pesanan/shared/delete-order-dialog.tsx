"use client";

import * as React from "react";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  useBulkDeleteFulfillmentOrders,
  useDeleteFulfillmentOrder,
} from "@/hooks/proses-pesanan/use-fulfillment";
import { apiError } from "@/lib/toast";
import {
  FAIL_REASON_LABEL,
  type PicklistFailReasonCode,
} from "@/types/proses-pesanan/fulfillment";

const REASONS: PicklistFailReasonCode[] = [
  "STOCK_EMPTY",
  "DAMAGED",
  "MISSING",
  "OTHER",
];

export interface DeleteOrderTarget {
  id: string;
  no?: string | null;
}

export function DeleteOrderDialog({
  open,
  onOpenChange,
  orders,
  onDeleted,
  outcomeDescription,
  outcomeLabel,
  bulkSuccessMessage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: DeleteOrderTarget[];
  onDeleted?: () => void;
  outcomeDescription?: React.ReactNode;
  outcomeLabel?: React.ReactNode;
  bulkSuccessMessage?: (successfulCount: number) => string;
}) {
  const [reasonCode, setReasonCode] =
    React.useState<PicklistFailReasonCode>("STOCK_EMPTY");
  const [note, setNote] = React.useState("");
  const deleteOrder = useDeleteFulfillmentOrder();
  const bulkDeleteOrders = useBulkDeleteFulfillmentOrders();

  const isBulk = orders.length > 1;
  const isPending = deleteOrder.isPending || bulkDeleteOrders.isPending;

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setReasonCode("STOCK_EMPTY");
      setNote("");
    }
  }

  const requiresNote = reasonCode === "OTHER";
  const trimmedNote = note.trim();
  const noteValid = !requiresNote || trimmedNote.length >= 5;
  const canConfirm = orders.length > 0 && noteValid && !isPending;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    const reason = trimmedNote
      ? `${FAIL_REASON_LABEL[reasonCode]} — ${trimmedNote}`
      : FAIL_REASON_LABEL[reasonCode];

    if (isBulk) {
      try {
        const results = await bulkDeleteOrders.mutateAsync({
          orderIds: orders.map((o) => o.id),
          reason,
        });
        const ok = results.filter((r) => r.status === "success").length;
        const failed = results.filter((r) => r.status === "failed");
        if (failed.length) {
          toast.error(
            `${ok} pesanan dihapus, ${failed.length} gagal.` +
              (failed[0].message ? ` (${failed[0].message})` : ""),
          );
        } else {
          toast.success(
            bulkSuccessMessage?.(ok) ??
              `${ok} pesanan dihapus dari fulfillment.`,
          );
        }
        onOpenChange(false);
        onDeleted?.();
      } catch (e) {
        apiError(e, "Gagal menghapus pesanan.");
      }
      return;
    }

    const target = orders[0];
    deleteOrder.mutate(
      { orderId: target.id, reason },
      {
        onSuccess: () => {
          toast.success(
            `Pesanan ${target.no ?? ""} dipindah ke Gagal Picking.`.replace(
              /\s+/g,
              " ",
            ),
          );
          onOpenChange(false);
          onDeleted?.();
        },
        onError: (e) => apiError(e, "Gagal menghapus pesanan."),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isPending) onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlertIcon className="size-4 text-destructive" />
            {isBulk
              ? `Hapus ${orders.length} Pesanan`
              : "Hapus Pesanan dari Proses"}
          </DialogTitle>
          <DialogDescription>
            {outcomeDescription ?? (
              <>
                Pilih alasan pesanan dihapus dari alur fulfillment. Pesanan
                akan dikembalikan ke tahap sebelumnya sesuai proses saat ini.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
          <div className="font-medium text-foreground">
            {isBulk
              ? `${orders.length} pesanan dipilih`
              : `Pesanan ${orders[0]?.no ?? orders[0]?.id ?? "—"}`}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {isBulk ? "Semua pesanan" : "Pesanan"} akan{" "}
            <span className="font-semibold text-foreground">
              {outcomeLabel ?? "dikembalikan ke tahap sebelumnya"}
            </span>{" "}
            dari alur proses fulfillment.
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium">Alasan</Label>
          <RadioGroup
            value={reasonCode}
            onValueChange={(v) => setReasonCode(v as PicklistFailReasonCode)}
            className="grid gap-2"
          >
            {REASONS.map((r) => (
              <label
                key={r}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm hover:bg-muted/40"
              >
                <RadioGroupItem value={r} id={`delete-reason-${r}`} />
                <span className="text-foreground">{FAIL_REASON_LABEL[r]}</span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="delete-order-note" className="text-sm font-medium">
            Catatan {requiresNote ? "(wajib)" : "(opsional)"}
          </Label>
          <Textarea
            id="delete-order-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              requiresNote
                ? "Jelaskan alasan spesifik (min 5 karakter)"
                : "Catatan tambahan…"
            }
            maxLength={500}
            rows={3}
            disabled={isPending}
          />
          {requiresNote && !noteValid && trimmedNote.length > 0 && (
            <p className="text-xs text-destructive">
              Catatan minimal 5 karakter.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {isPending && <Loader2Icon className="size-4 animate-spin" />}
            {isBulk
              ? `Ya, Hapus ${orders.length} Pesanan`
              : "Ya, Hapus Pengambilan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
