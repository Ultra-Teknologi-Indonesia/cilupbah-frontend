"use client";

import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ConnectedStore, StoreFlags } from "@/types/channel";

const AXES: {
  key: keyof StoreFlags;
  label: string;
  hint: string;
  value: (store: ConnectedStore) => boolean;
}[] = [
  {
    key: "order_sync_enabled",
    label: "Pesanan masuk",
    hint: "Saat mati, pesanan baru dari toko ini tidak diproses dan tidak bisa dipulihkan otomatis.",
    value: (s) => s.ordersEnabled,
  },
  {
    key: "catalog_pull_enabled",
    label: "Tarik katalog",
    hint: "Mengunduh produk dari marketplace jadi data lokal.",
    value: (s) => s.catalogPullEnabled,
  },
  {
    key: "catalog_push_enabled",
    label: "Kirim katalog",
    hint: "Membuat dan memperbarui listing di marketplace.",
    value: (s) => s.catalogPushEnabled,
  },
  {
    key: "stock_push_enabled",
    label: "Kirim stok",
    hint: "Memperbarui jumlah stok yang tayang di marketplace.",
    value: (s) => s.stockPushEnabled,
  },
  {
    key: "price_push_enabled",
    label: "Kirim harga",
    hint: "Memperbarui harga yang tayang di marketplace.",
    value: (s) => s.pricePushEnabled,
  },
  {
    key: "fulfillment_push_enabled",
    label: "Kirim status pesanan",
    hint: "Menandai siap kirim, mengambil resi, memanggil driver, dan membatalkan pesanan di marketplace.",
    value: (s) => s.fulfillmentPushEnabled,
  },
];

export function StoreSyncDialog({
  store,
  open,
  onOpenChange,
  onChange,
  disabled,
}: {
  store: ConnectedStore | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (id: string, flags: StoreFlags) => void;
  disabled?: boolean;
}) {
  if (!store) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sinkronisasi {store.shopName}</DialogTitle>
          <DialogDescription>
            Setiap arah sinkronisasi bisa dimatikan sendiri-sendiri tanpa
            memutus toko dari marketplace.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {AXES.map((axis) => (
            <div
              key={axis.key}
              className="flex items-start justify-between gap-4"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm">{axis.label}</span>
                <span className="text-xs text-muted-foreground">
                  {axis.hint}
                </span>
              </div>
              <Switch
                checked={axis.value(store)}
                disabled={disabled}
                onCheckedChange={(v) => onChange(store.id, { [axis.key]: v })}
                aria-label={`${axis.label} ${store.shopName}`}
              />
            </div>
          ))}
        </div>

      </DialogContent>
    </Dialog>
  );
}
