"use client";
import Image from "next/image";
import { EmptyState } from "@/components/ui/empty-state";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PlusIcon,
  Trash2Icon,
  ImageIcon,
  PackageIcon,
  SaveIcon,
  Loader2Icon,
  AlertCircleIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { PageTitle } from "@/components/dashboard/page-title";
import { FormFooter } from "@/components/dashboard/shared/form-footer";
import { SectionTitle } from "@/components/dashboard/shared/section-title";
import { useContacts } from "@/hooks/kontak-pemasok/use-contacts";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import {
  usePurchaseOrderDetail,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
} from "@/hooks/transaksi-pembelian/use-purchase-orders";
import {
  ProductPickerDialog,
  type PickedProduct,
} from "./product-picker-dialog";
import type {
  PurchaseOrderFormData,
  PurchaseOrderItemFormData,
  PurchaseOrderPatchData,
} from "@/types/transaksi-pembelian/purchase-order";
import { formatCurrency } from "@/lib/format";

interface Props {
  mode: "create" | "edit";
  id?: string;
}

type EditablePurchaseOrderItem = PurchaseOrderItemFormData & {
  thumbnail?: string | null;
  variant_label?: string;
};

type PurchaseOrderPatchUpdate = NonNullable<
  NonNullable<PurchaseOrderPatchData["changes"]>["update"]
>[number];

function toPatchItem(item: EditablePurchaseOrderItem) {
  return {
    item_id: item.item_id,
    description: item.description || null,
    unit: item.unit || null,
    qty: Number(item.qty),
    unit_price: Number(item.unit_price),
    disc: Number(item.disc),
    shipping_cost: Number(item.shipping_cost ?? 0),
  };
}

function RequiredStar() {
  return <span className="text-destructive">*</span>;
}

function FieldRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <Label className="w-28 shrink-0 text-sm text-muted-foreground">
        {label}
        {required && <RequiredStar />}
      </Label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function ProductImage({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
      {src && !failed ? (
        <Image
          unoptimized
          width={400}
          height={400}
          src={src}
          alt={alt}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <ImageIcon className="size-4 text-muted-foreground" />
      )}
    </div>
  );
}

export function PesananFormPage({ mode, id }: Props) {
  const router = useRouter();
  const { data: existingPO, isLoading: loadingPO } = usePurchaseOrderDetail(
    mode === "edit" ? id : undefined,
  );
  const createMut = useCreatePurchaseOrder();
  const updateMut = useUpdatePurchaseOrder();

  const [poNumber, setPoNumber] = useState("");
  const [poNumberAuto, setPoNumberAuto] = useState(true);
  const [contactId, setContactId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [orderDate, setOrderDate] = useState<Date | undefined>(new Date());
  const [refNo, setRefNo] = useState("");
  const [paymentTerm, setPaymentTerm] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<EditablePurchaseOrderItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const initialRef = useRef<{
    headers: Omit<PurchaseOrderFormData, "items"> & {
      po_number?: string | null;
    };
    items: Map<string, ReturnType<typeof toPatchItem>>;
  } | null>(null);

  const { data: contactsData } = useContacts({
    per_page: 100,
    "filter[type]": "SUPPLIER",
  });
  const { data: locData } = useLocations({ perPage: 100 });

  // The fetched PO is an external source of truth; hydrate the editable draft
  // once its identity changes instead of mutating React state during render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (mode !== "edit" || !existingPO) return;

    setPoNumber(existingPO.po_number);
    setPoNumberAuto(false);
    setContactId(existingPO.contact_id);
    setLocationId(existingPO.location_id);
    setOrderDate(
      existingPO.order_date ? new Date(existingPO.order_date) : undefined,
    );
    setRefNo(existingPO.ref_no ?? "");
    setPaymentTerm(existingPO.payment_term?.toString() ?? "0");
    setNotes(existingPO.notes ?? "");
    const hydratedItems: EditablePurchaseOrderItem[] = (
      existingPO.items ?? []
    ).map((it) => ({
      id: it.id,
      received_qty: Number(it.received_qty ?? 0),
      item_id: it.item_id,
      product_name: it.product?.name ?? "",
      product_sku: it.product?.sku ?? "",
      description: it.description ?? "",
      unit: it.unit ?? "",
      qty: it.qty,
      unit_price: Number(it.unit_price),
      disc: Number(it.disc),
      disc_amount: Number(it.disc_amount ?? 0),
      shipping_cost: Number(it.shipping_cost ?? 0),
      thumbnail:
        it.variant?.media?.[0]?.url ??
        (it.variant as { thumbnail?: string | null })?.thumbnail ??
        it.product?.media?.[0]?.url ??
        it.product?.image_url ??
        null,
      variant_label: it.variant?.options?.map((o) => o.value).join(", "),
    }));
    setItems(hydratedItems);
    initialRef.current = {
      headers: {
        po_number: existingPO.po_number ?? null,
        contact_id: existingPO.contact_id,
        location_id: existingPO.location_id,
        order_date: existingPO.order_date,
        expected_date: existingPO.expected_date ?? undefined,
        ref_no: existingPO.ref_no ?? undefined,
        payment_term: existingPO.payment_term ?? null,
        is_tax_included: existingPO.is_tax_included ?? false,
        notes: existingPO.notes ?? undefined,
      },
      items: new Map(
        hydratedItems
          .filter((item) => item.id)
          .map((item) => [item.id!, toPatchItem(item)]),
      ),
    };
  }, [mode, existingPO]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const contactOptions = useMemo(
    () =>
      (contactsData?.items ?? []).map((c) => ({ value: c.id, label: c.name })),
    [contactsData],
  );

  const locationOptions = useMemo(
    () =>
      (locData?.items ?? [])

        .filter((l) => l.isWarehouse && l.locationType !== "TRANSIT")
        .map((l) => ({ value: l.id, label: l.locationName })),
    [locData],
  );

  const updateItem = useCallback(
    (itemId: string, field: string, value: string | number) => {
      setItems((prev) =>
        prev.map((it) =>
          it.item_id === itemId ? { ...it, [field]: value } : it,
        ),
      );
    },
    [],
  );

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((it) => it.item_id !== itemId));
  }, []);

  const handlePickProducts = useCallback((picked: PickedProduct[]) => {
    setItems((prev) => {
      const next = [...prev];
      for (const p of picked) {
        const exists = next.findIndex((it) => it.item_id === p.itemId);
        if (exists >= 0) {
          next[exists] = { ...next[exists], qty: next[exists].qty + 1 };
        } else {
          next.push({
            item_id: p.itemId,
            product_name: p.name,
            product_sku: p.sku,
            qty: 0,

            unit_price: 0,
            disc: 0,
            disc_amount: 0,
            shipping_cost: 0,
            thumbnail: p.thumbnail,
            variant_label: p.variantLabel,
          });
        }
      }
      return next;
    });
  }, []);

  const existingItemIds = useMemo(
    () => items.map((it) => it.item_id).filter(Boolean),
    [items],
  );

  const totals = useMemo(() => {
    let subTotal = 0;
    let totalDisc = 0;
    let totalShipping = 0;
    let totalQty = 0;
    let count = 0;
    for (const it of items) {
      if (!it.item_id) continue;
      const line = it.qty * it.unit_price;
      const discPct = line * (it.disc / 100);
      const discAmt = Number(it.disc_amount ?? 0);
      subTotal += line;
      totalDisc += discPct + discAmt;
      totalShipping += Number(it.shipping_cost ?? 0);
      totalQty += it.qty;
      count++;
    }
    return {
      subTotal,
      totalDisc,
      totalShipping,
      grandTotal: subTotal - totalDisc + totalShipping,
      count,
      totalQty,
    };
  }, [items]);

  const validItems = useMemo(() => items.filter((it) => it.item_id), [items]);
  const itemsValid =
    validItems.length > 0 &&
    validItems.every((it) => it.qty > 0 && it.unit_price > 0);

  const canSubmit = Boolean(contactId && locationId && orderDate && itemsValid);
  const isPending = createMut.isPending || updateMut.isPending;
  const mutationError = (createMut.error || updateMut.error) as
    { errors?: Record<string, string[]> } | undefined | null;
  const validationErrors = mutationError?.errors;
  const itemErrors = useMemo(() => {
    if (!validationErrors) return [];
    return Object.entries(validationErrors)
      .filter(([k]) => k.startsWith("items."))
      .flatMap(([, v]) => v);
  }, [validationErrors]);

  function handleSubmit() {
    if (!canSubmit) return;
    const payload: PurchaseOrderFormData = {
      contact_id: contactId,
      location_id: locationId,
      order_date: orderDate!.toISOString().split("T")[0],
      ref_no: refNo || undefined,
      payment_term: paymentTerm ? Number(paymentTerm) : null,
      notes: notes || undefined,
      po_number: poNumberAuto ? undefined : poNumber || undefined,
      items: items.map((it) => ({
        id: it.id,
        item_id: it.item_id,
        sku: it.product_sku,
        name: it.product_name,
        description: it.description,
        unit: it.unit,
        qty: it.qty,
        unit_price: it.unit_price,
        disc: it.disc,
        disc_amount: Number(it.disc_amount ?? 0),
        shipping_cost: Number(it.shipping_cost ?? 0),
      })),
    };

    if (mode === "edit" && id) {
      const initial = initialRef.current;
      if (!initial) return;

      const currentHeaders = {
        po_number: poNumberAuto ? null : poNumber || null,
        contact_id: contactId,
        location_id: locationId,
        order_date: orderDate!.toISOString().split("T")[0],
        ref_no: refNo || null,
        payment_term: paymentTerm ? Number(paymentTerm) : null,
        notes: notes || null,
      };
      const headerChanges: Omit<PurchaseOrderPatchData, "changes"> = {};
      for (const [key, value] of Object.entries(currentHeaders)) {
        const initialValue =
          initial.headers[key as keyof typeof initial.headers] ?? null;
        if (value !== initialValue) {
          Object.assign(headerChanges, { [key]: value });
        }
      }

      const currentExistingIds = new Set(
        validItems
          .map((item) => item.id)
          .filter((itemId): itemId is string => Boolean(itemId)),
      );
      const deleteIds = Array.from(initial.items.keys()).filter(
        (itemId) => !currentExistingIds.has(itemId),
      );
      const creates = validItems.filter((item) => !item.id).map(toPatchItem);
      const updates: PurchaseOrderPatchUpdate[] = validItems.flatMap((item) => {
        if (!item.id) return [];
        const previous = initial.items.get(item.id);
        if (!previous) return [];
        const current = toPatchItem(item);
        const change: Record<string, string | number | null> = { id: item.id };
        for (const key of [
          "description",
          "unit",
          "qty",
          "unit_price",
          "disc",
          "shipping_cost",
        ] as const) {
          if (current[key] !== previous[key]) change[key] = current[key];
        }
        return Object.keys(change).length > 1
          ? [change as PurchaseOrderPatchUpdate]
          : [];
      });

      const patch: PurchaseOrderPatchData = {
        ...headerChanges,
        changes: {
          ...(creates.length > 0 ? { create: creates } : {}),
          ...(updates.length > 0 ? { update: updates } : {}),
          ...(deleteIds.length > 0 ? { delete_ids: deleteIds } : {}),
        },
      };
      updateMut.mutate(
        { id, data: patch },
        {
          onSuccess: () =>
            router.push(`/dashboard/transaksi-pembelian/pesanan/${id}`),
        },
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: (data) =>
          router.push(
            `/dashboard/transaksi-pembelian/pesanan/${data?.id ?? ""}`,
          ),
      });
    }
  }

  if (mode === "edit" && loadingPO) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const activeItems = items.filter((it) => it.item_id);
  const showReceivedColumn = activeItems.some(
    (it) => Number(it.received_qty ?? 0) > 0,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title={
          mode === "create"
            ? "Buat Pesanan"
            : `Edit ${existingPO?.po_number ?? ""}`
        }
        backHref="/dashboard/transaksi-pembelian"
        breadcrumb={[
          { label: "Pembelian" },
          {
            label: "Transaksi Pembelian",
            href: "/dashboard/transaksi-pembelian",
          },
          { label: "Pesanan", href: "/dashboard/transaksi-pembelian" },
          { label: mode === "create" ? "Buat Pesanan" : "Edit" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-6">
          <LiquidGlass
            radius={16}
            intensity="subtle"
            className="bg-white/30 dark:bg-white/[0.04] p-5"
          >
            <div className="grid items-start gap-x-8 gap-y-4 sm:grid-cols-2">
              <FieldRow label="No. Pesanan" required>
                <Input
                  value={poNumberAuto ? "[auto]" : poNumber}
                  onChange={(e) => {
                    setPoNumberAuto(false);
                    setPoNumber(e.target.value);
                  }}
                  onFocus={() => {
                    if (poNumberAuto) {
                      setPoNumberAuto(false);
                      setPoNumber("");
                    }
                  }}
                  placeholder="[auto]"
                  className={cn(
                    "bg-background",
                    poNumberAuto && "text-muted-foreground",
                  )}
                />
              </FieldRow>
              <FieldRow label="Termin">
                <Input
                  type="number"
                  min={0}
                  value={paymentTerm}
                  onChange={(e) => setPaymentTerm(e.target.value)}
                  placeholder="0"
                  className="bg-background"
                />
              </FieldRow>
              <FieldRow label="Pemasok" required>
                <Combobox
                  options={contactOptions}
                  value={contactId}
                  onChange={(v) => setContactId(v ?? "")}
                  placeholder="Pilih pemasok"
                  searchPlaceholder="Cari pemasok..."
                  className="bg-background"
                />
              </FieldRow>
              <FieldRow label="Lokasi" required>
                <Combobox
                  options={locationOptions}
                  value={locationId}
                  onChange={(v) => setLocationId(v ?? "")}
                  placeholder="Pilih lokasi"
                  searchPlaceholder="Cari lokasi..."
                  className="bg-background"
                />
              </FieldRow>
              <FieldRow label="No. Ref">
                <Input
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  placeholder="No. ref"
                  className="bg-background"
                />
              </FieldRow>
              <div className="flex items-start gap-4 sm:col-start-2 sm:row-span-2 sm:row-start-3">
                <Label className="w-28 shrink-0 pt-2 text-sm text-muted-foreground">
                  Keterangan
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Masukkan keterangan"
                  rows={3}
                  className="flex-1 bg-background"
                />
              </div>
              <FieldRow label="Tanggal" required>
                <DatePicker
                  value={orderDate}
                  onChange={setOrderDate}
                  placeholder="Pilih tanggal"
                  className="bg-background"
                />
              </FieldRow>
            </div>
          </LiquidGlass>

          <LiquidGlass
            radius={16}
            intensity="subtle"
            className="bg-white/30 dark:bg-white/[0.04] p-5"
          >
            {showReceivedColumn && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-warning/20 bg-warning/10 p-4 text-sm text-warning">
                <AlertCircleIcon className="mt-0.5 size-5 shrink-0" />
                <div>
                  Sebagian produk di pesanan ini sudah diterima. Menurunkan
                  kuantitasnya di bawah jumlah yang sudah diterima — atau
                  menghapus barisnya — akan menarik balik stoknya dari rak. Jika
                  barangnya sudah dipicking, dipindah, atau terjual, perubahan
                  akan ditolak.
                </div>
              </div>
            )}
            {itemErrors.length > 0 && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertCircleIcon className="mt-0.5 size-5 shrink-0" />
                <div>
                  <div className="mb-1 font-semibold">
                    Terdapat kesalahan pada produk:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    {itemErrors.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <div className="rounded-lg border border-border/40 bg-background/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-[260px] min-w-[200px] max-w-[300px]">
                      Produk
                    </TableHead>
                    <TableHead className="w-28 text-right">Harga</TableHead>
                    {showReceivedColumn && (
                      <TableHead className="w-20 text-right">
                        Diterima
                      </TableHead>
                    )}
                    <TableHead className="w-20 text-right">Qty</TableHead>
                    <TableHead className="w-32 text-right">Total</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeItems.map((item) => {
                    const lineTotal = item.qty * item.unit_price;
                    const discPct = lineTotal * (item.disc / 100);
                    const discAmt = Number(item.disc_amount ?? 0);
                    const ship = Number(item.shipping_cost ?? 0);
                    const total = lineTotal - discPct - discAmt + ship;
                    const landed =
                      item.qty > 0
                        ? item.unit_price - discAmt / item.qty + ship / item.qty
                        : item.unit_price;
                    const receivedQty = Number(item.received_qty ?? 0);
                    const isReceived = receivedQty > 0;
                    return (
                      <TableRow key={item.item_id}>
                        <TableCell className="w-[260px] min-w-[200px] max-w-[300px] whitespace-normal">
                          <div
                            className="flex items-start gap-3"
                            style={{ maxWidth: 260 }}
                          >
                            <ProductImage
                              src={item.thumbnail}
                              alt={item.product_name ?? ""}
                            />
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="font-medium whitespace-normal break-words text-foreground">
                                {item.product_name}
                              </span>
                              {item.variant_label && (
                                <span className="whitespace-normal break-words text-xs text-foreground">
                                  {item.variant_label}
                                </span>
                              )}
                              {item.product_sku && (
                                <span className="break-all font-mono text-2xs text-foreground/80">
                                  {item.product_sku}
                                </span>
                              )}
                              {(discAmt > 0 || ship > 0) && (
                                <span className="mt-0.5 text-2xs tabular-nums text-foreground">
                                  Landed: {formatCurrency(landed)}/unit
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            inputMode="numeric"
                            required
                            value={
                              item.unit_price
                                ? item.unit_price.toLocaleString("id-ID")
                                : ""
                            }
                            onChange={(e) =>
                              updateItem(
                                item.item_id,
                                "unit_price",
                                Number(e.target.value.replace(/\D/g, "")),
                              )
                            }
                            placeholder="0"
                            aria-invalid={
                              item.item_id ? item.unit_price <= 0 : undefined
                            }
                            className={cn(
                              "h-8 text-right bg-background tabular-nums",
                              item.item_id &&
                                item.unit_price <= 0 &&
                                "border-destructive focus-visible:ring-destructive/30",
                            )}
                          />
                        </TableCell>
                        {showReceivedColumn && (
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {isReceived ? receivedQty : "—"}
                          </TableCell>
                        )}
                        <TableCell>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={item.qty}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) => {
                              const n = Number(
                                e.target.value.replace(/\D/g, ""),
                              );
                              updateItem(item.item_id, "qty", n < 0 ? 0 : n);
                            }}
                            title={
                              isReceived && item.qty < receivedQty
                                ? `${receivedQty - item.qty} unit yang sudah diterima akan ditarik balik dari rak`
                                : undefined
                            }
                            className="h-8 text-right bg-background tabular-nums"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-foreground">
                          {formatCurrency(total)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeItem(item.item_id)}
                            title={
                              isReceived
                                ? `Menghapus baris ini akan menarik balik ${receivedQty} unit yang sudah diterima dari rak`
                                : undefined
                            }
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {activeItems.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={showReceivedColumn ? 6 : 5}
                        className="h-32 text-center text-muted-foreground"
                      >
                        <EmptyState
                          icon={PackageIcon}
                          title="Belum ada produk"
                          description="Klik tombol di bawah untuk menambahkan."
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setPickerOpen(true)}
              >
                <PlusIcon className="mr-1.5 size-3.5" />
                Tambah Baru
              </Button>
            </div>
          </LiquidGlass>
        </div>

        <div>
          <LiquidGlass
            radius={16}
            intensity="subtle"
            className="bg-white/30 dark:bg-white/[0.04] p-5 sticky top-4"
          >
            <SectionTitle className="mb-4">Rincian</SectionTitle>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {totals.count} Produk ({totals.totalQty} Qty)
                </span>
                <span className="tabular-nums">
                  {formatCurrency(totals.subTotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Diskon</span>
                <span className="tabular-nums">
                  {formatCurrency(totals.totalDisc)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ongkos Angkut</span>
                <span className="tabular-nums">
                  {formatCurrency(totals.totalShipping)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pajak</span>
                <span className="tabular-nums">{formatCurrency(0)}</span>
              </div>
              <div className="border-t border-border/40 pt-3">
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatCurrency(totals.grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </LiquidGlass>
        </div>
      </div>

      <FormFooter>
        <Button variant="outline" asChild>
          <Link href="/dashboard/transaksi-pembelian">Batal</Link>
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isPending}
          variant="primary"
        >
          {isPending ? (
            <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <SaveIcon className="mr-1.5 size-3.5" />
          )}
          Simpan
        </Button>
      </FormFooter>

      <ProductPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={handlePickProducts}
        excludeIds={existingItemIds}
        excludeBundles
      />
    </div>
  );
}
