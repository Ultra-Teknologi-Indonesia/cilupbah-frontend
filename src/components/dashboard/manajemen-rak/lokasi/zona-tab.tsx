"use client";

import * as React from "react";
import {
  PlusIcon,
  Trash2Icon,
  PencilIcon,
  MapPinIcon,
  SearchIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useZones,
  useCreateZone,
  useUpdateZone,
  useDeleteZone,
} from "@/hooks/manajemen-rak/use-zones";
import { useListState } from "@/hooks/use-list-state";
import type { LocationZone, LocationBin } from "@/types/manajemen-rak/location";
import { usePermissions } from "@/hooks/auth/use-permissions";

interface ZonaTabProps {
  locationId?: string;
  bins: LocationBin[];
  disabled?: boolean;
}

interface ZoneFormState {
  zone_code: string;
  zone_name: string;
  bin_ids: string[];
}

const EMPTY_FORM: ZoneFormState = { zone_code: "", zone_name: "", bin_ids: [] };

function BinPicker({
  bins,
  selectedIds,
  onChange,
  assignedMap,
  currentZoneId,
}: {
  bins: LocationBin[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  assignedMap: Map<string, string>;
  currentZoneId?: string;
}) {
  const [search, setSearch] = React.useState("");
  const selected = new Set(selectedIds);

  const available = bins.filter((b) => {
    if (b.isInbound || b.binFinalCode === "DEFAULT") return false;
    const assignedTo = assignedMap.get(b.id);
    if (assignedTo && assignedTo !== currentZoneId) return false;
    return true;
  });

  const filtered = search.trim()
    ? available.filter((b) =>
        b.binFinalCode.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : available;

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((b) => selected.has(b.id));

  const toggleAll = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filtered.map((b) => b.id));
      onChange(selectedIds.filter((id) => !filteredSet.has(id)));
    } else {
      const next = new Set(selectedIds);
      filtered.forEach((b) => next.add(b.id));
      onChange(Array.from(next));
    }
  };

  return (
    <div className="space-y-2">
      <Label>Rak di Zona Ini</Label>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari kode rak..."
          className="h-8 pl-8 text-xs"
        />
      </div>
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
        {available.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            Semua rak sudah di-assign ke zona lain
          </p>
        ) : (
          <>
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-muted/60 px-3 py-1.5">
              <Checkbox
                checked={
                  allFilteredSelected
                    ? true
                    : filtered.some((b) => selected.has(b.id))
                      ? "indeterminate"
                      : false
                }
                onCheckedChange={toggleAll}
              />
              <span className="text-2xs text-muted-foreground">
                {selected.size} dipilih dari {available.length} rak tersedia
              </span>
            </div>
            {filtered.slice(0, 100).map((b) => (
              <label
                key={b.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-muted/40",
                  selected.has(b.id) && "bg-primary/5",
                )}
              >
                <Checkbox
                  checked={selected.has(b.id)}
                  onCheckedChange={() => toggle(b.id)}
                />
                <span className="font-mono">{b.binFinalCode}</span>
              </label>
            ))}
            {filtered.length > 100 && (
              <p className="px-3 py-1.5 text-center text-2xs text-muted-foreground">
                Menampilkan 100 dari {filtered.length}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ZoneFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  bins,
  assignedMap,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial: ZoneFormState;
  bins: LocationBin[];
  assignedMap: Map<string, string>;
  onSubmit: (data: ZoneFormState) => void;
  loading: boolean;
}) {
  const [form, setForm] = React.useState<ZoneFormState>(initial);
  const [prevOpen, setPrevOpen] = React.useState(open);
  const [prevInitial, setPrevInitial] = React.useState(initial);

  if (open !== prevOpen || initial !== prevInitial) {
    setPrevOpen(open);
    setPrevInitial(initial);
    if (open) setForm(initial);
  }

  const valid = form.zone_code.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Buat Zona" : "Edit Zona"}
          </DialogTitle>
          <DialogClose />
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="space-y-2">
            <Label>
              Kode Zona<span className="text-destructive"> *</span>
            </Label>
            <Input
              value={form.zone_code}
              onChange={(e) =>
                setForm((f) => ({ ...f, zone_code: e.target.value }))
              }
              placeholder="Contoh: Z-A"
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label>Nama Zona</Label>
            <Input
              value={form.zone_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, zone_name: e.target.value }))
              }
              placeholder="Contoh: Zona Elektronik"
              maxLength={100}
            />
          </div>

          <BinPicker
            bins={bins}
            selectedIds={form.bin_ids}
            onChange={(ids) => setForm((f) => ({ ...f, bin_ids: ids }))}
            assignedMap={assignedMap}
            currentZoneId={mode === "edit" ? undefined : undefined}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={() => onSubmit(form)}
            disabled={!valid || loading}
          >
            {mode === "create" ? "Buat" : "Simpan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ZonaTab({ locationId, bins, disabled }: ZonaTabProps) {
  const { can } = usePermissions();
  const canCreate = can("create-manajemen-rak");
  const canEdit = can("edit-manajemen-rak");
  const canDelete = can("delete-manajemen-rak");
  const { data: zones, isLoading } = useZones(locationId);
  const createZone = useCreateZone(locationId);
  const updateZone = useUpdateZone(locationId);
  const deleteZone = useDeleteZone(locationId);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">(
    "create",
  );
  const [editTarget, setEditTarget] = React.useState<LocationZone | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<LocationZone | null>(
    null,
  );
  const list = useListState<Record<string, never>>(
    {},
    { namespace: "zona" },
  );

  const assignedMap = React.useMemo(() => {
    const map = new Map<string, string>();
    if (!zones) return map;
    for (const zone of zones) {
      const detail = zones.find((z) => z.id === zone.id);
      if (!detail) continue;
    }
    return map;
  }, [zones]);

  const filtered = React.useMemo(() => {
    if (!zones) return [];
    const q = list.appliedSearch.toLowerCase();
    if (!q) return zones;
    return zones.filter(
      (z) =>
        z.zone_code.toLowerCase().includes(q) ||
        (z.zone_name ?? "").toLowerCase().includes(q),
    );
  }, [zones, list.appliedSearch]);

  function openCreate() {
    setDialogMode("create");
    setEditTarget(null);
    setDialogOpen(true);
  }

  function openEdit(zone: LocationZone) {
    setDialogMode("edit");
    setEditTarget(zone);
    setDialogOpen(true);
  }

  function handleSubmit(data: ZoneFormState) {
    if (dialogMode === "create") {
      createZone.mutate(
        {
          zone_code: data.zone_code.trim(),
          zone_name: data.zone_name.trim() || null,
          bin_ids: data.bin_ids,
        },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else if (editTarget) {
      updateZone.mutate(
        {
          zoneId: editTarget.id,
          data: {
            zone_code: data.zone_code.trim(),
            zone_name: data.zone_name.trim() || null,
            bin_ids: data.bin_ids,
          },
        },
        { onSuccess: () => setDialogOpen(false) },
      );
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteZone.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  const dialogInitial: ZoneFormState = editTarget
    ? {
        zone_code: editTarget.zone_code,
        zone_name: editTarget.zone_name ?? "",
        bin_ids: [],
      }
    : EMPTY_FORM;

  if (!locationId) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <MapPinIcon className="size-10" />
        <p className="text-sm">
          Simpan lokasi terlebih dahulu untuk mengelola zona.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                list.applySearch();
              }
            }}
            placeholder="Cari zona..."
            className="pl-9 pr-16"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => list.applySearch()}
            className="absolute right-1 top-1/2 h-7 -translate-y-1/2 rounded-full px-2.5 text-xs"
          >
            Cari
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Total <Badge className="ml-1">{zones?.length ?? 0}</Badge>
          </span>
          {!disabled && canCreate && (
            <Button variant="primary" size="sm" onClick={openCreate}>
              <PlusIcon className="mr-1.5 size-4" />
              Buat Zona
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MapPinIcon}
          title={
            list.appliedSearch ? "Zona tidak ditemukan" : "Belum ada zona"
          }
          description={
            list.appliedSearch
              ? "Coba kata kunci lain"
              : "Buat zona untuk mengelompokkan rak dalam gudang"
          }
          className="rounded-2xl border border-dashed border-border py-16"
        />
      ) : (
        <Table
          className="border-collapse"
          containerClassName="rounded-2xl border border-border"
        >
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/40">
              <TableHead className="px-4 py-3 font-medium text-muted-foreground">
                Kode Zona
              </TableHead>
              <TableHead className="px-4 py-3 font-medium text-muted-foreground">
                Nama Zona
              </TableHead>
              <TableHead className="px-4 py-3 text-center font-medium text-muted-foreground">
                Jumlah Rak
              </TableHead>
              {!disabled && (canEdit || canDelete) && (
                <TableHead className="w-24 px-4 py-3 text-center font-medium text-muted-foreground">
                  Aksi
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((zone) => (
              <TableRow
                key={zone.id}
                className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
              >
                <TableCell className="px-4 py-3 font-mono font-medium">
                  {zone.zone_code}
                </TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">
                  {zone.zone_name || "—"}
                </TableCell>
                <TableCell className="px-4 py-3 text-center">
                  <Badge variant="outline">{zone.bins_count}</Badge>
                </TableCell>
                {!disabled && (canEdit || canDelete) && (
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(zone)}
                        >
                          <PencilIcon className="size-3.5" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(zone)}
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ZoneFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        initial={dialogInitial}
        bins={bins}
        assignedMap={assignedMap}
        onSubmit={handleSubmit}
        loading={createZone.isPending || updateZone.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus Zona"
        description={`Apakah Anda yakin ingin menghapus zona "${deleteTarget?.zone_code}"? Rak yang ada di zona ini akan dilepas (tidak dihapus).`}
        confirmLabel="Hapus"
        variant="destructive"
        loading={deleteZone.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
