"use client";

import { FormSkeleton } from "@/components/ui/page-skeleton";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, LockIcon } from "lucide-react";
import { toast } from "sonner";

import { PageTitle } from "@/components/dashboard/page-title";
import { FormFooter } from "@/components/dashboard/shared/form-footer";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import {
  locationFormSchema,
  type LocationFormValues,
} from "@/lib/manajemen-rak/location-schema";
import { useLocationDetail } from "@/hooks/manajemen-rak/use-location-detail";
import { useCreateLocation } from "@/hooks/manajemen-rak/use-create-location";
import { useUpdateLocation } from "@/hooks/manajemen-rak/use-update-location";
import { useGenerateBins } from "@/hooks/manajemen-rak/use-generate-bins";
import { useBulkUpdateBins } from "@/hooks/manajemen-rak/use-bulk-update-bins";
import { useAssignBinSku } from "@/hooks/manajemen-rak/use-assign-bin-sku";
import { useWarehouseLayoutSetting } from "@/hooks/manajemen-rak/use-warehouse-layout-setting";
import type {
  BinDraft,
  GenerateBinsPayload,
  Location,
  LocationPayload,
} from "@/types/manajemen-rak/location";
import { apiError } from "@/lib/toast";
import { usePermissions } from "@/hooks/auth/use-permissions";

import { InformasiTab } from "./informasi-tab";
import { LayoutGudangTab, type BinSkuAssignment } from "./layout-gudang-tab";
import { ZonaTab } from "./zona-tab";

const LIST_HREF = "/dashboard/lokasi";

type Section = "informasi" | "layout" | "zona";

const createDefaults: LocationFormValues = {
  locationName: "",
  locationCode: "",
  address: "",
  coordinate: "",
  provinceId: "",
  cityId: "",
  districtId: "",
  villageId: "",
  postCode: "",
  phone: "",
  email: "",
  defaultWarehouseUser: "",
  isWarehouse: true,
  isActive: true,
  isPos: false,
};

function toFormValues(loc: Location): LocationFormValues {
  return {
    locationName: loc.locationName ?? "",
    locationCode: loc.locationCode ?? "",
    address: loc.address ?? "",
    coordinate: loc.coordinate ?? "",
    provinceId: loc.village?.district?.city?.province?.id ?? "",
    cityId: loc.village?.district?.city?.id ?? "",
    districtId: loc.village?.district?.id ?? "",
    villageId: loc.villageId ?? "",
    postCode: loc.postCode ?? "",
    phone: loc.phone ?? "",
    email: loc.email ?? "",
    defaultWarehouseUser: loc.defaultWarehouseUser ?? "",
    isWarehouse: Boolean(loc.isWarehouse),
    isActive: Boolean(loc.isActive),
    isPos: Boolean(loc.isPos),
  };
}

function buildPayload(values: LocationFormValues): LocationPayload {
  return {
    location_code: values.locationCode.trim(),
    location_name: values.locationName.trim(),
    address: values.address?.trim() || null,
    village_id: values.villageId || null,
    post_code: values.postCode?.trim() || null,
    phone: values.phone?.trim() || null,
    email: values.email?.trim() || null,
    coordinate: values.coordinate?.trim() || null,
    default_warehouse_user: values.defaultWarehouseUser?.trim() || null,
    is_warehouse: values.isWarehouse,
    is_active: values.isActive,
    is_pos: values.isPos,
  };
}

interface LocationFormPageProps {
  mode: "create" | "edit";
  id?: string;
}

export function LocationFormPage({ mode, id }: LocationFormPageProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const canSaveLocation = can(
    mode === "create" ? "create-manajemen-rak" : "edit-manajemen-rak",
  );
  const canEditLayout = can("edit-manajemen-rak");
  const [section, setSection] = React.useState<Section>("informasi");
  const [appliedPayload, setAppliedPayload] =
    React.useState<GenerateBinsPayload | null>(null);

  const detail = useLocationDetail(mode === "edit" ? id : undefined);
  const layoutSetting = useWarehouseLayoutSetting(canEditLayout);
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const generateBins = useGenerateBins();
  const bulkUpdate = useBulkUpdateBins(id);
  const assignBinSku = useAssignBinSku(id);
  const binsRef = React.useRef<BinDraft[]>([]);
  const assignmentsRef = React.useRef<BinSkuAssignment[]>([]);

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: createDefaults,
  });

  React.useEffect(() => {
    if (mode === "edit" && detail.data) {
      form.reset(toFormValues(detail.data));
    }
  }, [mode, detail.data, form]);

  const protectedLocation =
    mode === "edit" && Boolean(detail.data?.isSystem || detail.data?.isLocked);
  const layoutEnabled = layoutSetting.data?.useWarehouseLayout ?? false;
  const saving =
    createLocation.isPending ||
    updateLocation.isPending ||
    generateBins.isPending ||
    bulkUpdate.isPending ||
    assignBinSku.isPending;

  const initialBins: BinDraft[] = React.useMemo(
    () =>
      (detail.data?.bins ?? [])
        .filter((b) => !b.isInbound && b.binFinalCode !== "DEFAULT")
        .map((b) => ({
          id: b.id,
          floorCode: b.floorCode ?? "",
          rowCode: b.rowCode ?? "",
          columnCode: b.columnCode ?? "",
          binCode: b.binCode ?? "",
          binFinalCode: b.binFinalCode,
          isStockAcknowledged: b.isStockAcknowledged,
          isLargeBin: b.isLargeBin,
        })),
    [detail.data],
  );

  const onSubmit = form.handleSubmit(
    // eslint-disable-next-line react-hooks/refs
    async (values) => {
      try {
        const payload = buildPayload(values);
        if (protectedLocation) {
          // The active state of a protected location is immutable. Omitting it
          // also keeps edits safe for legacy protected locations already inactive.
          delete payload.is_active;
        }
        let locationId = id;

        if (mode === "create") {
          const created = await createLocation.mutateAsync(payload);
          locationId = created.id;
        } else if (id) {
          await updateLocation.mutateAsync({ id, payload });
        }

        if (layoutEnabled && canEditLayout && appliedPayload && locationId) {
          await generateBins.mutateAsync({
            locationId,
            payload: appliedPayload,
          });
        }

        if (
          layoutEnabled &&
          canEditLayout &&
          !appliedPayload &&
          locationId &&
          binsRef.current.length > 0
        ) {
          const existingBins = binsRef.current
            .filter((b) => b.id)
            .map((b) => ({
              id: b.id!,
              bin_final_code: b.binFinalCode,
              is_stock_acknowledged: b.isStockAcknowledged,
              is_large_bin: b.isLargeBin,
            }));
          if (existingBins.length > 0) {
            await bulkUpdate.mutateAsync(existingBins);
          }
        }

        if (
          layoutEnabled &&
          canEditLayout &&
          locationId &&
          assignmentsRef.current.length > 0
        ) {
          for (const a of assignmentsRef.current) {
            await assignBinSku.mutateAsync({
              binId: a.binId,
              itemId: a.itemId,
            });
          }
        }

        toast.success(
          mode === "create"
            ? "Lokasi berhasil dibuat."
            : "Lokasi berhasil diperbarui.",
        );
        router.push(LIST_HREF);
      } catch (err) {
        apiError(err, "Gagal menyimpan lokasi.");
      }
    },
    (errors) => {
      const errorKeys = Object.keys(errors);
      const firstError =
        errorKeys.length > 0
          ? (errors as Record<string, { message?: string }>)[errorKeys[0]]
              ?.message
          : null;
      setSection("informasi");
      toast.error(
        firstError || "Lengkapi field wajib di tab Informasi Lokasi.",
      );
    },
  );

  const title = mode === "create" ? "Buat Lokasi" : "Edit Lokasi";

  if (mode === "edit" && detail.isLoading) {
    return <FormSkeleton />;
  }

  if (mode === "edit" && detail.isError) {
    return (
      <div className="py-24 text-center text-sm text-destructive">
        Gagal memuat lokasi.
      </div>
    );
  }

  const formDisabled = !canSaveLocation;
  const navItems: { key: Section; label: string; show: boolean }[] = [
    { key: "informasi", label: "Informasi Lokasi", show: true },
    { key: "layout", label: "Layout Gudang", show: layoutEnabled },
    { key: "zona", label: "Zona", show: mode === "edit" },
  ];

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <PageTitle
          title={title}
          backHref={LIST_HREF}
          breadcrumb={[
            { label: "Gudang" },
            { label: "Manajemen Rak & Lokasi" },
            { label: "Lokasi Gudang", href: LIST_HREF },
            { label: title },
          ]}
        />

        {protectedLocation && (
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <LockIcon className="size-4" />
            Lokasi ini dilindungi: data tetap dapat diedit sesuai permission,
            tetapi tidak dapat dihapus atau dinonaktifkan.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <nav className="flex flex-col gap-2">
            {navItems
              .filter((n) => n.show)
              .map((n) => (
                <button
                  key={n.key}
                  type="button"
                  onClick={() => setSection(n.key)}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                    section === n.key
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-background hover:bg-muted",
                  )}
                >
                  {n.label}
                </button>
              ))}
          </nav>

          <div className="rounded-2xl border border-border bg-card p-6">
            {section === "informasi" ? (
              <InformasiTab
                disabled={formDisabled}
                activeDisabled={formDisabled || protectedLocation}
              />
            ) : section === "layout" ? (
              <LayoutGudangTab
                disabled={formDisabled || !canEditLayout}
                locationId={mode === "edit" ? id : undefined}
                locationCode={detail.data?.locationCode}
                isSmallWarehouse={
                  detail.data?.isSmallWarehouse ??
                  detail.data?.enforcesStrictBinSku
                }
                initialBins={initialBins}
                onApply={setAppliedPayload}
                onBinsChange={(bins) => {
                  binsRef.current = bins;
                }}
                onAssignmentsChange={(assignments) => {
                  assignmentsRef.current = assignments;
                }}
              />
            ) : (
              <ZonaTab
                locationId={id}
                bins={detail.data?.bins ?? []}
                disabled={formDisabled}
              />
            )}
          </div>
        </div>

        <FormFooter>
          <Button variant="outline" asChild>
            <Link href={LIST_HREF}>Batal</Link>
          </Button>
          {canSaveLocation && (
            <Button type="submit" variant="primary" disabled={saving}>
              {saving && <Loader2Icon className="animate-spin" />}
              Simpan
            </Button>
          )}
        </FormFooter>
      </form>
    </Form>
  );
}
