"use client";
import React from "react";
import { EmptyState } from "@/components/ui/empty-state";

import { useState, useMemo, useCallback } from "react";
import { useListState } from "@/hooks/use-list-state";
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  BadgeCheckIcon,
  DownloadIcon,
  Loader2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { isValidPhone } from "@/lib/phone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterToolbar } from "@/components/dashboard/master-produk/filter-toolbar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useSalesmen,
  useSalesmanDetail,
  useCreateSalesman,
  useUpdateSalesman,
  useDeleteSalesman,
} from "@/hooks/kontak-pemasok/use-salesman";
import { exportCsv } from "@/lib/export-csv";
import type {
  SalesmanItem,
  SalesmanFormData,
} from "@/types/kontak-pemasok/salesman";

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
];

function Req() {
  return <span className="text-destructive"> *</span>;
}

const EMPTY_FORM: SalesmanFormData = {
  name: "",
  phone: "",
  email: "",
  status: "active",
  notes: "",
};

interface SalesmanFilters {
  status: string;
}

const EMPTY_FILTERS: SalesmanFilters = { status: "" };

export function SalesmanTab() {
  const list = useListState<SalesmanFilters>(EMPTY_FILTERS, {
    perPage: 20,
    namespace: "salesman",
  });
  const {
    search,
    setSearch,
    applySearch,
    appliedSearch,
    perPage,
    filters,
    setFilters,
    pagination,
    onPaginationChange,
  } = list;
  const statusFilter = filters.status;

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SalesmanFormData>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<SalesmanItem | null>(null);

  const params = useMemo(
    () => ({
      search: appliedSearch || undefined,
      page: pagination.pageIndex + 1,
      per_page: perPage,
      "filter[status]": statusFilter || undefined,
    }),
    [appliedSearch, pagination.pageIndex, perPage, statusFilter],
  );

  const { data, isLoading, isFetching } = useSalesmen(params);
  const { data: editDetail } = useSalesmanDetail(editId ?? undefined);
  const createMut = useCreateSalesman();
  const updateMut = useUpdateSalesman();
  const deleteMut = useDeleteSalesman();

  const items = useMemo(() => data?.items ?? [], [data]);
  const meta = data?.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: perPage,
    total: 0,
  };

  const [prevEditId, setPrevEditId] = React.useState(editId);
  const [prevEditDetail, setPrevEditDetail] = React.useState(editDetail);
  if (editId !== prevEditId || editDetail !== prevEditDetail) {
    setPrevEditId(editId);
    setPrevEditDetail(editDetail);
    if (editId && editDetail) {
      setForm({
        name: editDetail.name,
        phone: editDetail.phone ?? "",
        email: editDetail.email ?? "",
        status: editDetail.status ?? "active",
        notes: editDetail.notes ?? "",
      });
    }
  }

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(item: SalesmanItem) {
    setEditId(item.id);
    setForm({
      name: item.name,
      phone: item.phone ?? "",
      email: item.email ?? "",
      status: item.status ?? "active",
      notes: item.notes ?? "",
    });
    setModalOpen(true);
  }

  function set<K extends keyof SalesmanFormData>(
    key: K,
    value: SalesmanFormData[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    if (form.phone && !isValidPhone(form.phone)) {
      toast.error("Format Telepon tidak valid.");
      return;
    }
    try {
      if (editId) {
        await updateMut.mutateAsync({ id: editId, data: form });
      } else {
        await createMut.mutateAsync(form);
      }
      setModalOpen(false);
      setEditId(null);
    } catch {}
  }

  const saving = createMut.isPending || updateMut.isPending;

  const handleExport = useCallback(() => {
    if (items.length === 0) return;
    exportCsv(
      "salesman.csv",
      ["Kode", "Nama", "Telepon", "Email", "Status"],
      items.map((s: SalesmanItem) => [
        s.code,
        s.name,
        s.phone ?? "",
        s.email ?? "",
        s.status,
      ]),
    );
  }, [items]);

  const columns = useMemo<ColumnDef<SalesmanItem>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Kode",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.code}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Nama",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "phone",
        header: "Telepon",
        cell: ({ row }) => (
          <span className="text-foreground">{row.original.phone || "—"}</span>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-foreground">{row.original.email || "—"}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(
              "text-2xs leading-tight",
              row.original.status === "active"
                ? "border-success/30 text-success"
                : "border-slate-300 text-slate-600 dark:border-slate-500/30 dark:text-slate-400",
            )}
          >
            {row.original.status === "active" ? "Aktif" : "Nonaktif"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div
              className="flex items-center justify-end gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => openEdit(item)}
                aria-label="Edit"
              >
                <PencilIcon className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDeleteTarget(item)}
                aria-label="Hapus"
                className="text-destructive hover:text-destructive"
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  const activeCount = statusFilter ? 1 : 0;
  const hasFilter = Boolean(statusFilter || search);

  return (
    <>
      <LiquidGlass
        radius={20}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/[0.04]"
      >
        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          onSearch={applySearch}
          searchPlaceholder="Cari nama, kode, email..."
          align="end"
          onReset={
            hasFilter
              ? list.resetAll
              : undefined
          }
          hasFilter={hasFilter}
          activeCount={activeCount}
          gridCols={2}
          leading={
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={items.length === 0}
            >
              <DownloadIcon className="mr-1.5 size-4" />
              Export CSV
            </Button>
          }
          trailing={
            <Button variant="primary" size="sm" onClick={openCreate}>
              <PlusIcon className="mr-1.5 size-4" />
              Buat Salesman
            </Button>
          }
        >
          <Combobox
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(v) => setFilters({ status: v ?? "" })}
            placeholder="Status"
            searchPlaceholder="Cari status"
            className="h-9 bg-background"
          />
        </FilterToolbar>

        {isFetching && !isLoading && (
          <div className="flex justify-center py-1">
            <Loader2Icon className="size-4 animate-spin text-primary" />
          </div>
        )}

        <div className="px-5 py-5 sm:px-6">
          <DataTable
            columns={columns}
            data={items}
            isLoading={isLoading}
            hideToolbar
            manualPagination
            pagination={pagination}
            rowCount={meta.total}
            onPaginationChange={onPaginationChange}
            tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
            emptyState={
              <EmptyState
                icon={BadgeCheckIcon}
                title="Belum ada salesman"
                description="Buat salesman baru untuk mengelola tim penjualan."
              />
            }
          />
        </div>
      </LiquidGlass>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Salesman" : "Buat Salesman"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Nama
                <Req />
              </Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Masukkan nama salesman"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Telepon</Label>
                <PhoneInput
                  value={form.phone ?? ""}
                  onChange={(v) => set("phone", v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="email@contoh.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Combobox
                options={[
                  { value: "active", label: "Aktif" },
                  { value: "inactive", label: "Nonaktif" },
                ]}
                value={form.status ?? "active"}
                onChange={(v) =>
                  set("status", (v as "active" | "inactive") ?? "active")
                }
                placeholder="Pilih status"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Catatan opsional"
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
            >
              {saving && <Loader2Icon className="animate-spin" />}
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus Salesman"
        description={`Apakah Anda yakin ingin menghapus salesman "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMut.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />
    </>
  );
}
