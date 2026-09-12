"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ImageIcon, Loader2Icon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopySku } from "@/components/dashboard/shared/copy-sku";
import { UserSelect } from "@/components/dashboard/shared/user-select";
import { useInboundDetail } from "@/hooks/barang-masuk/use-inbound";
import { useReceiveTransfer } from "@/hooks/barang-masuk/use-receive-transfer";
import type { Inbound } from "@/types/barang-masuk/inbound";

interface TerimaTransferDialogProps {
  inbound: Inbound | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TerimaTransferDialog({
  inbound,
  open,
  onOpenChange,
  onSuccess,
}: TerimaTransferDialogProps) {
  const receive = useReceiveTransfer();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const detail = useInboundDetail(open ? inbound?.id : undefined);
  const items = useMemo(
    () => detail.data?.items ?? inbound?.items ?? [],
    [detail.data, inbound],
  );

  const [qtyMap, setQtyMap] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((i) => [i.item_id, i.expected_qty])),
  );

  const setQty = (itemId: string, expected: number, raw: string) => {
    const n = Math.max(0, Math.min(expected, Number(raw) || 0));
    setQtyMap((prev) => ({ ...prev, [itemId]: n }));
  };

  const isAlreadyReceived =
    detail.data?.status === "RECEIVED" || inbound?.status === "RECEIVED";
  const isBusy = receive.isPending || isSubmitting;
  const canSubmit =
    !!inbound?.source_id && items.length > 0 && !isAlreadyReceived && !isBusy;

  const handleSubmit = () => {
    if (!inbound?.source_id || isBusy || isAlreadyReceived) return;
    setIsSubmitting(true);
    receive.mutate(
      {
        id: inbound.source_id,
        data: {
          items: items.map((i) => ({
            item_id: i.item_id,
            received_qty: qtyMap[i.item_id] ?? i.expected_qty,
          })),
        },
      },
      {
        onSuccess: () => {
          setIsSubmitting(false);
          onOpenChange(false);
          onSuccess?.();
        },
        onError: () => {
          setIsSubmitting(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90vh,860px)] max-h-[90vh] flex-col gap-4 overflow-hidden sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>
            Terima Transfer{" "}
            {inbound?.reference_number ?? inbound?.transaction_number}
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-2">
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="w-24 text-right">Qty Kirim</TableHead>
                  <TableHead className="w-28 text-right">Qty Terima</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => {
                  const productName =
                    i.variant?.product?.name ??
                    i.variant?.item_name ??
                    i.variant?.name ??
                    "—";
                  const variantOptions = i.variant?.options
                    ?.map((o) => o.value)
                    .filter(Boolean)
                    .join(", ");
                  const imageUrl =
                    i.variant?.media?.[0]?.url ??
                    i.variant?.product?.media?.[0]?.url;
                  return (
                    <TableRow key={i.item_id}>
                      <TableCell className="px-3 py-2.5">
                        <div className="flex items-start gap-3">
                          <div className="size-10 shrink-0 overflow-hidden rounded-xl border bg-muted/50">
                            {imageUrl ? (
                              <Image
                                unoptimized
                                width={400}
                                height={400}
                                src={imageUrl}
                                alt={productName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                                <ImageIcon className="size-4 opacity-50" />
                              </div>
                            )}
                          </div>
                          <div
                            className="flex min-w-0 flex-col gap-0.5"
                            style={{ maxWidth: 320 }}
                          >
                            <span className="font-medium whitespace-normal break-words text-foreground">
                              {productName}
                            </span>
                            {variantOptions && (
                              <span className="whitespace-normal break-words text-xs text-foreground">
                                {variantOptions}
                              </span>
                            )}
                            {i.variant?.sku && <CopySku sku={i.variant.sku} />}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {i.expected_qty}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={i.expected_qty}
                          value={qtyMap[i.item_id] ?? i.expected_qty}
                          onChange={(e) =>
                            setQty(i.item_id, i.expected_qty, e.target.value)
                          }
                          className="h-8 text-right"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
          >
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isBusy}>
            {isBusy && <Loader2Icon className="mr-2 size-4 animate-spin" />}
            Terima
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
