"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2Icon,
  PackageSearchIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { PageTitle } from "@/components/dashboard/page-title";
import { FormFooter } from "@/components/dashboard/shared/form-footer";
import { UserSelect } from "@/components/dashboard/shared/user-select";
import { EmptyState } from "@/components/ui/empty-state";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import { useCreateSalesReturn } from "@/hooks/barang-masuk/use-sales-return-actions";
import {
  ProductPickerDialog,
  type PickedProduct,
} from "@/components/dashboard/transaksi-pembelian/product-picker-dialog";

const LIST_HREF = "/dashboard/barang-masuk/retur";

const CONDITION_OPTIONS = [
  { value: "GOOD", label: "Baik (masuk stok)" },
  { value: "DAMAGE", label: "Rusak" },
];

interface LineDraft {
  itemId: string;
  sku: string;
  name: string;
  qty: string;
  condition: string;
}

export function SalesReturnFormPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreateReturn = can("create-retur-penjualan");
  const [locationId, setLocationId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [reason, setReason] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: locData } = useLocations({ perPage: 100 }, canCreateReturn);
  const createMut = useCreateSalesReturn();

  const locationOptions = useMemo(
    () =>
      (locData?.items ?? []).map((l) => ({
        value: l.id,
        label: l.locationName,
      })),
    [locData],
  );

  const addLines = (products: PickedProduct[]) => {
    setLines((prev) => {
      const existing = new Set(prev.map((l) => l.itemId));
      const fresh = products
        .filter((p) => !existing.has(p.itemId))
        .map((p) => ({
          itemId: p.itemId,
          sku: p.sku,
          name: p.name,
          qty: "1",
          condition: "GOOD",
        }));
      return [...prev, ...fresh];
    });
    setPickerOpen(false);
  };

  const updateLine = (itemId: string, patch: Partial<LineDraft>) =>
    setLines((prev) =>
      prev.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l)),
    );
  const removeLine = (itemId: string) =>
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));

  const validLines = lines.filter((l) => Number(l.qty) > 0);
  const canSubmit = !!locationId && !!createdBy.trim() && validLines.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    createMut.mutate(
      {
        location_id: locationId,
        source: "manual",
        customer_name: customerName.trim() || undefined,
        reason: reason.trim() || undefined,
        created_by: createdBy.trim(),
        items: validLines.map((l) => ({
          item_id: l.itemId,
          qty: Number(l.qty),
          condition: l.condition,
        })),
      },
      {
        onSuccess: (ret) =>
          router.push(ret?.id ? `${LIST_HREF}/${ret.id}` : LIST_HREF),
      },
    );
  };

  if (!canCreateReturn) {
    return (
      <div className="flex flex-col gap-5">
        <PageTitle
          title="Buat Retur Manual"
          backHref={LIST_HREF}
          breadcrumb={[
            { label: "Gudang" },
            { label: "Barang Masuk", href: "/dashboard/barang-masuk" },
            { label: "Retur", href: LIST_HREF },
            { label: "Buat Retur" },
          ]}
        />
        <EmptyState
          title="Akses Ditolak"
          description="Anda tidak memiliki hak akses untuk membuat data retur penjualan (create-retur-penjualan)."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        title="Buat Retur Manual"
        backHref={LIST_HREF}
        breadcrumb={[
          { label: "Gudang" },
          { label: "Barang Masuk", href: "/dashboard/barang-masuk" },
          { label: "Retur", href: LIST_HREF },
          { label: "Buat Retur" },
        ]}
      />

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="grid grid-cols-1 gap-3 px-5 py-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">
              Lokasi Restock <span className="text-destructive">*</span>
            </Label>
            <Combobox
              options={locationOptions}
              value={locationId}
              onChange={(v) => setLocationId(v ?? "")}
              placeholder="Pilih gudang…"
              searchPlaceholder="Cari gudang…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">
              Dibuat oleh <span className="text-destructive">*</span>
            </Label>
            <UserSelect
              value={createdBy}
              onChange={setCreatedBy}
              defaultToSelf
              placeholder="Nama petugas"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">Nama Pelanggan</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Opsional"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">Alasan Retur</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Opsional"
            />
          </div>
        </div>
      </LiquidGlass>

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="flex flex-col gap-3 px-5 py-5">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Item Retur <span className="text-destructive">*</span>
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPickerOpen(true)}
              className="gap-1.5"
            >
              <PlusIcon className="size-4" /> Tambah Item
            </Button>
          </div>

          {lines.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-muted-foreground">
              <PackageSearchIcon className="h-7 w-7 opacity-40" />
              <p className="text-sm">
                Belum ada item. Klik tombol Tambah Item.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {lines.map((l) => (
                <div
                  key={l.itemId}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5 sm:grid-cols-[1fr_170px_90px_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {l.sku}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:contents">
                    <Combobox
                      options={CONDITION_OPTIONS}
                      value={l.condition}
                      onChange={(v) =>
                        updateLine(l.itemId, { condition: v ?? "GOOD" })
                      }
                      placeholder="Kondisi"
                      searchPlaceholder="Kondisi"
                      className="h-9 flex-1 sm:flex-initial"
                    />
                    <Input
                      type="number"
                      min={1}
                      value={l.qty}
                      onChange={(e) =>
                        updateLine(l.itemId, { qty: e.target.value })
                      }
                      placeholder="Qty"
                      className="h-9 w-20 sm:w-auto"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeLine(l.itemId)}
                      aria-label="Hapus"
                      className="text-destructive"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Item kondisi Baik akan masuk kembali ke stok saat retur
                di-terima.
              </p>
            </div>
          )}
        </div>
      </LiquidGlass>

      <FormFooter>
        <Button variant="outline" onClick={() => router.push(LIST_HREF)}>
          Batal
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || createMut.isPending}
        >
          {createMut.isPending && (
            <Loader2Icon className="mr-2 size-4 animate-spin" />
          )}
          Simpan Retur
        </Button>
      </FormFooter>

      <ProductPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={addLines}
        excludeIds={lines.map((l) => l.itemId)}
      />
    </div>
  );
}
