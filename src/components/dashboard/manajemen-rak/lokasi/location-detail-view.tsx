"use client";

import Link from "next/link";
import {
  Edit3Icon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  WarehouseIcon,
} from "lucide-react";

import { PageTitle } from "@/components/dashboard/page-title";
import { DetailSkeleton } from "@/components/ui/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { useLocationDetail } from "@/hooks/manajemen-rak/use-location-detail";
import { usePermissions } from "@/hooks/auth/use-permissions";

const LIST_HREF = "/dashboard/lokasi";

function valueOrDash(value: string | null | undefined): string {
  return value?.trim() || "-";
}

function formatType(value: string | null): string {
  return valueOrDash(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}

export function LocationDetailView({ id }: { id: string }) {
  const { can } = usePermissions();
  const { data: location, isLoading, isError, refetch } = useLocationDetail(id);

  if (isLoading) return <DetailSkeleton />;

  if (isError || !location) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
        <WarehouseIcon className="size-7 text-muted-foreground" />
        <p className="text-sm font-medium">Lokasi tidak ditemukan</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Coba lagi
          </Button>
          <Button variant="primary" size="sm" asChild>
            <Link href={LIST_HREF}>Kembali ke daftar</Link>
          </Button>
        </div>
      </div>
    );
  }

  const protectedLocation = location.isSystem || location.isLocked;
  const canEdit = can("edit-manajemen-rak");
  const village = location.village;
  const region = [
    village?.nama,
    village?.district?.nama,
    village?.district?.city?.nama,
    village?.district?.city?.province?.nama,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        title={location.locationName}
        description="Detail lokasi gudang dan informasi penyimpanannya."
        backHref={LIST_HREF}
        actions={
          canEdit ? (
            <Button variant="primary" size="sm" asChild>
              <Link href={`${LIST_HREF}/${location.id}/edit`}>
                <Edit3Icon />
                Edit lokasi
              </Link>
            </Button>
          ) : undefined
        }
        breadcrumb={[
          { label: "Gudang" },
          { label: "Manajemen Rak & Lokasi" },
          { label: "Lokasi Gudang", href: LIST_HREF },
          { label: location.locationName },
        ]}
      />

      {protectedLocation && (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <LockIcon className="size-4" />
          Lokasi ini dilindungi: tetap dapat diedit sesuai permission, tetapi
          tidak dapat dihapus atau dinonaktifkan.
        </div>
      )}

      <LiquidGlass radius={24} className="bg-white/40 dark:bg-white/[0.06]">
        <div className="space-y-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Informasi Lokasi</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Identitas dan status lokasi gudang.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={location.isActive ? "success" : "muted"}>
                {location.isActive ? "Aktif" : "Tidak aktif"}
              </Badge>
              {location.isSystem && <Badge variant="outline">Sistem</Badge>}
              {location.isLocked && <Badge variant="warning">Terkunci</Badge>}
            </div>
          </div>

          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem
              label="Nama lokasi"
              value={valueOrDash(location.locationName)}
            />
            <InfoItem
              label="Kode lokasi"
              value={valueOrDash(location.locationCode)}
            />
            <InfoItem
              label="Tipe lokasi"
              value={formatType(location.locationType)}
            />
            <InfoItem
              label="Gudang"
              value={location.isWarehouse ? "Ya" : "Tidak"}
            />
            <InfoItem label="POS" value={location.isPos ? "Ya" : "Tidak"} />
            <InfoItem
              label="Multi-origin"
              value={location.isMultiOrigin ? "Ya" : "Tidak"}
            />
          </div>
        </div>
      </LiquidGlass>

      <LiquidGlass radius={24} className="bg-white/40 dark:bg-white/[0.06]">
        <div className="space-y-6 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">Alamat & Kontak</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Informasi operasional yang terdaftar pada lokasi ini.
            </p>
          </div>

          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <InfoItem label="Alamat" value={valueOrDash(location.address)} />
            <InfoItem label="Wilayah" value={valueOrDash(region)} />
            <InfoItem label="Kode pos" value={valueOrDash(location.postCode)} />
            <InfoItem
              label="Penanggung jawab"
              value={valueOrDash(location.defaultWarehouseUser)}
            />
            <div className="flex min-w-0 items-start gap-2">
              <PhoneIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <InfoItem label="Telepon" value={valueOrDash(location.phone)} />
            </div>
            <div className="flex min-w-0 items-start gap-2">
              <MailIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <InfoItem label="Email" value={valueOrDash(location.email)} />
            </div>
            <div className="flex min-w-0 items-start gap-2 sm:col-span-2">
              <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <InfoItem
                label="Koordinat"
                value={valueOrDash(location.coordinate)}
              />
            </div>
          </div>
        </div>
      </LiquidGlass>
    </div>
  );
}
