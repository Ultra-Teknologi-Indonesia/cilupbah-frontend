"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTACT_CHANNEL_LABELS,
  CUSTOMER_DECISION_LABELS,
  type ContactChannel,
  type CustomerDecision,
  type OrderItem,
} from "@/types/pesanan/order";
import {
  useMarkContacted,
  useSetCustomerDecision,
} from "@/hooks/pesanan/use-order-actions";
import { useReplacementSkuSearch } from "@/hooks/pesanan/use-direct-completion";

interface ContactBuyerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNo: string;
  items?: OrderItem[];
  defaultChannel?: ContactChannel;
  defaultDecision?: CustomerDecision;
  defaultNote?: string;
  onSaved?: (decision: CustomerDecision | null) => void;
}

const CHANNEL_OPTIONS = Object.entries(CONTACT_CHANNEL_LABELS) as Array<
  [ContactChannel, string]
>;
const DECISION_OPTIONS = Object.entries(CUSTOMER_DECISION_LABELS) as Array<
  [CustomerDecision, string]
>;

export function ContactBuyerDialog({
  open,
  onOpenChange,
  orderId,
  orderNo,
  items = [],
  defaultChannel,
  defaultDecision,
  defaultNote,
  onSaved,
}: ContactBuyerDialogProps) {
  const [channel, setChannel] = React.useState<ContactChannel>(
    defaultChannel ?? "marketplace_chat",
  );
  const [includeDecision, setIncludeDecision] = React.useState(
    Boolean(defaultDecision),
  );
  const [decision, setDecision] = React.useState<CustomerDecision>(
    defaultDecision ?? "waiting",
  );
  const [note, setNote] = React.useState(defaultNote ?? "");
  const [replacementItemId, setReplacementItemId] = React.useState<string | null>(
    items[0]?.id ?? null,
  );
  const [replacementSku, setReplacementSku] = React.useState<string | null>(null);
  const [replacementQuery, setReplacementQuery] = React.useState("");

  const [prevOpen, setPrevOpen] = React.useState(open);
  const [prevDefaultChannel, setPrevDefaultChannel] =
    React.useState(defaultChannel);
  const [prevDefaultDecision, setPrevDefaultDecision] =
    React.useState(defaultDecision);
  const [prevDefaultNote, setPrevDefaultNote] = React.useState(defaultNote);
  if (
    open !== prevOpen ||
    defaultChannel !== prevDefaultChannel ||
    defaultDecision !== prevDefaultDecision ||
    defaultNote !== prevDefaultNote
  ) {
    setPrevOpen(open);
    setPrevDefaultChannel(defaultChannel);
    setPrevDefaultDecision(defaultDecision);
    setPrevDefaultNote(defaultNote);
    if (open) {
      setChannel(defaultChannel ?? "marketplace_chat");
      setIncludeDecision(Boolean(defaultDecision));
      setDecision(defaultDecision ?? "waiting");
      setNote(defaultNote ?? "");
      setReplacementItemId(items[0]?.id ?? null);
      setReplacementSku(null);
      setReplacementQuery("");
    }
  }

  const markContacted = useMarkContacted();
  const setCustomerDecision = useSetCustomerDecision();
  const replacementSearch = useReplacementSkuSearch(
    replacementQuery,
    includeDecision && decision === "replace",
  );
  const loading = markContacted.isPending || setCustomerDecision.isPending;
  const replaceReady = Boolean(replacementItemId && replacementSku);

  const handleSubmit = async () => {
    await markContacted.mutateAsync({
      orderId,
      channel,
      note: note.trim() || undefined,
    });

    if (includeDecision) {
      await setCustomerDecision.mutateAsync({
        orderId,
        decision,
        note: note.trim() || undefined,
        replacementItemId: replacementItemId ?? undefined,
        replacementSku: replacementSku ?? undefined,
      });
    }

    onOpenChange(false);
    onSaved?.(includeDecision ? decision : null);
  };

  return (
    <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Catat Konfirmasi Pembeli</DialogTitle>
          <DialogDescription>
            Catat channel & keputusan pembeli untuk pesanan{" "}
            <span className="font-medium">{orderNo}</span>. Setelah tersimpan,
            sistem menandai pesanan sudah dihubungi supaya tidak di-chat ulang.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto py-2">
          <div className="grid gap-2">
            <Label>Channel Kontak</Label>
            <RadioGroup
              value={channel}
              onValueChange={(v) => setChannel(v as ContactChannel)}
              className="grid grid-cols-2 gap-2"
            >
              {CHANNEL_OPTIONS.map(([value, label]) => (
                <label
                  key={value}
                  htmlFor={`channel-${value}`}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-muted/40 has-[input:checked]:border-primary has-[input:checked]:bg-primary/5"
                >
                  <RadioGroupItem id={`channel-${value}`} value={value} />
                  {label}
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="grid gap-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={includeDecision}
                onChange={(e) => setIncludeDecision(e.target.checked)}
                className="size-4 rounded border-border/60"
              />
              Sekaligus catat keputusan pembeli
            </label>

            {includeDecision && (
              <RadioGroup
                value={decision}
                onValueChange={(v) => setDecision(v as CustomerDecision)}
                className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              >
                {DECISION_OPTIONS.map(([value, label]) => (
                  <label
                    key={value}
                    htmlFor={`decision-${value}`}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-muted/40 has-[input:checked]:border-primary has-[input:checked]:bg-primary/5"
                  >
                    <RadioGroupItem id={`decision-${value}`} value={value} />
                    {label}
                  </label>
                ))}
              </RadioGroup>
            )}
          </div>

          {includeDecision && decision === "replace" && (
            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="space-y-1.5">
                <Label>Produk yang diganti</Label>
                <Select
                  value={replacementItemId ?? undefined}
                  onValueChange={setReplacementItemId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih produk yang stoknya kosong" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.sku || item.description || "Produk pesanan"} · qty {item.qty_in_base}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="replacement-sku">SKU pengganti</Label>
                <Combobox
                  id="replacement-sku"
                  options={replacementSearch.data ?? []}
                  value={replacementSku}
                  onChange={setReplacementSku}
                  onQueryChange={setReplacementQuery}
                  loading={replacementSearch.isFetching}
                  placeholder="Cari SKU pengganti"
                  searchPlaceholder="Ketik SKU atau nama produk"
                  emptyText="SKU tidak ditemukan"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Perubahan hanya untuk picking, packing, dan shipping internal. Produk di marketplace tidak diubah.
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="contact-note">Catatan (opsional)</Label>
            <Textarea
              id="contact-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Detail hasil konfirmasi, mis. 'Buyer minta ganti warna hitam'"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={
              loading ||
              (includeDecision && decision === "replace" && !replaceReady)
            }
          >
            {loading && <Loader2Icon className="animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
