"use client";
import { EmptyState } from "@/components/ui/empty-state";

import * as React from "react";
import { useState } from "react";
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  TagIcon,
  Loader2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterToolbar } from "@/components/dashboard/shared/filter-toolbar";
import { useListState } from "@/hooks/use-list-state";
import { usePermissions } from "@/hooks/auth/use-permissions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useContactCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/kontak-pemasok/use-contacts";
import type {
  ContactCategory,
  CategoryFormData,
} from "@/types/kontak-pemasok/contact";

function Req() {
  return <span className="text-destructive"> *</span>;
}

const EMPTY_FORM: CategoryFormData = {
  code: "",
  name: "",
};

const EMPTY_FILTERS = {};

export function KategoriTab() {
  const { search, setSearch, applySearch, appliedSearch } = useListState<
    typeof EMPTY_FILTERS
  >(EMPTY_FILTERS, {
    perPage: 20,
    namespace: "kat_pelanggan",
  });

  const {
    data: categories = [],
    isLoading,
    isFetching,
  } = useContactCategories(appliedSearch || undefined);
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();
  const deleteMut = useDeleteCategory();
  const { can } = usePermissions();
  const canEdit = can("edit-kontak-pelanggan");
  const canDelete = can("delete-kontak-pelanggan");

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ContactCategory | null>(null);
  const [form, setForm] = useState<CategoryFormData>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ContactCategory | null>(
    null,
  );

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(cat: ContactCategory) {
    setEditTarget(cat);
    setForm({
      code: cat.code ?? "",
      name: cat.name,
    });
    setModalOpen(true);
  }

  function set<K extends keyof CategoryFormData>(
    key: K,
    value: CategoryFormData[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim()) return;
    try {
      if (editTarget) {
        await updateMut.mutateAsync({ id: editTarget.id, data: form });
      } else {
        await createMut.mutateAsync(form);
      }
      setModalOpen(false);
      setEditTarget(null);
    } catch {}
  }

  const columns = React.useMemo<ColumnDef<ContactCategory>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Kode",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.code ?? "—"}
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
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const cat = row.original;
          return (
            <div
              className="flex items-center justify-end gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEdit(cat)}
                  aria-label="Edit"
                >
                  <PencilIcon className="size-3.5" />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleteTarget(cat)}
                  aria-label="Hapus"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [canEdit, canDelete],
  );

  const saving = createMut.isPending || updateMut.isPending;

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
          searchPlaceholder="Cari kode atau nama..."
          align="end"
          trailing={
            canEdit ? (
              <Button variant="primary" size="sm" onClick={openCreate}>
                <PlusIcon className="mr-1.5 size-4" />
                Buat Kategori
              </Button>
            ) : undefined
          }
        />

        {isFetching && !isLoading && (
          <div className="flex justify-center py-1">
            <Loader2Icon className="size-4 animate-spin text-primary" />
          </div>
        )}

        <div className="px-5 py-5 sm:px-6">
          <DataTable
            columns={columns}
            data={categories}
            isLoading={isLoading}
            hideToolbar
            manualPagination={false}
            tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
            emptyState={
              <EmptyState
                icon={TagIcon}
                title={
                  appliedSearch
                    ? "Kategori tidak ditemukan"
                    : "Belum ada kategori"
                }
                description={
                  appliedSearch
                    ? "Coba kata kunci lain."
                    : "Buat kategori untuk mengelompokkan kontak."
                }
              />
            }
          />
        </div>
      </LiquidGlass>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Kategori" : "Buat Kategori"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  Kode
                  <Req />
                </Label>
                <Input
                  value={form.code}
                  onChange={(e) => set("code", e.target.value)}
                  placeholder="Cth: KAT-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Nama
                  <Req />
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Nama kategori"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || !form.code.trim() || !form.name.trim()}
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
        title="Hapus Kategori"
        description={`Apakah Anda yakin ingin menghapus kategori "${deleteTarget?.name}"? Kategori yang masih digunakan oleh kontak tidak dapat dihapus.`}
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
