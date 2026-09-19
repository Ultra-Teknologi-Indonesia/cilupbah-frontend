"use client";
import { EmptyState } from "@/components/ui/empty-state";

import { useState, useMemo, useCallback } from "react";
import { useListState } from "@/hooks/use-list-state";
import { useUrlTab } from "@/hooks/use-url-tab";
import Link from "next/link";
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  LockIcon,
  UsersIcon,
  TruckIcon,
  ArrowLeftRightIcon,
  UploadIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterToolbar } from "@/components/dashboard/master-produk/filter-toolbar";
import { ImportPemasokDialog } from "@/components/dashboard/kontak-pemasok/import-pemasok-view";
import { Can } from "@/components/auth/can";
import { usePermissions } from "@/hooks/auth/use-permissions";
import {
  useContacts,
  useContactCategories,
  useDeleteContact,
} from "@/hooks/kontak-pemasok/use-contacts";
import type {
  ContactItem,
  ContactListParams,
} from "@/types/kontak-pemasok/contact";

type TypeFilter = "SUPPLIER" | "BOTH";

const TYPE_TABS: { key: TypeFilter; label: string; icon: typeof UsersIcon }[] =
  [
    { key: "SUPPLIER", label: "Pemasok", icon: TruckIcon },
    { key: "BOTH", label: "Pemasok dan Pelanggan", icon: ArrowLeftRightIcon },
  ];

const TYPE_LABELS: Record<string, string> = {
  SUPPLIER: "Pemasok",
  BOTH: "Pemasok dan Pelanggan",
  CUSTOMER: "Pelanggan",
};

interface FilterState {
  category_id: string;
  status: string;
}

const EMPTY_FILTERS: FilterState = { category_id: "", status: "" };

const TYPE_VALUES: readonly TypeFilter[] = ["SUPPLIER", "BOTH"];

export function KontakPemasokView() {
  const list = useListState<FilterState>(EMPTY_FILTERS, {
    perPage: 20,
    namespace: "pemasok",
  });
  const {
    search,
    setSearch,
    applySearch,
    appliedSearch,
    page,
    perPage,
    filters,
    setFilters,
    resetPage,
    pagination,
    onPaginationChange,
  } = list;
  const [typeFilter, setTypeFilter] = useUrlTab<TypeFilter>(
    "pemasok_type",
    "SUPPLIER",
    { validValues: TYPE_VALUES },
  );
  const [deleteTarget, setDeleteTarget] = useState<ContactItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const handleTypeFilter = useCallback(
    (t: TypeFilter) => {
      setTypeFilter(t);
      resetPage();
    },
    [setTypeFilter, resetPage],
  );

  const params = useMemo<ContactListParams>(
    () => ({
      search: appliedSearch || undefined,
      page,
      per_page: perPage,
      "filter[type]": typeFilter,
      "filter[category_id]": filters.category_id || undefined,
      "filter[status]": filters.status || undefined,
    }),
    [appliedSearch, page, perPage, typeFilter, filters],
  );

  const { data, isLoading, isFetching } = useContacts(params);
  const { data: categories = [] } = useContactCategories();
  const deleteMut = useDeleteContact();
  const { can } = usePermissions();

  const items = data?.items ?? [];
  const meta = data?.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: perPage,
    total: 0,
  };

  const columns = useMemo<ColumnDef<ContactItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Nama",
        cell: ({ row }) => (
          <span className="font-medium">
            <Link
              href={`/dashboard/kontak-pemasok/${row.original.id}`}
              className="inline-flex items-center gap-1.5 hover:text-primary hover:underline"
            >
              {row.original.is_system && (
                <LockIcon className="size-3 text-warning" />
              )}
              {row.original.name}
            </Link>
          </span>
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
        id: "phone",
        header: "Telepon",
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.phone || row.original.mobile || "—"}
          </span>
        ),
      },
      {
        id: "category",
        header: "Kategori",
        cell: ({ row }) => {
          const cat = row.original.category;
          return (
            <span className="text-foreground">
              {cat ? (cat.code ? `${cat.code} - ${cat.name}` : cat.name) : "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "type",
        header: "Tipe",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(
              "text-2xs leading-tight",
              row.original.type === "BOTH"
                ? "border-purple-300 text-purple-600 dark:border-purple-500/30 dark:text-purple-400"
                : "border-blue-300 text-blue-600 dark:border-blue-500/30 dark:text-blue-400",
            )}
          >
            {TYPE_LABELS[row.original.type] ?? row.original.type}
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
              {can("edit-kontak-pemasok") && (
                <Button variant="ghost" size="icon-sm" asChild>
                  <Link
                    href={`/dashboard/kontak-pemasok/${item.id}/edit`}
                    aria-label="Edit"
                  >
                    <PencilIcon className="size-3.5" />
                  </Link>
                </Button>
              )}
              {!item.is_system && can("delete-kontak-pemasok") && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleteTarget(item)}
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
    [can],
  );

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "Semua Kategori" },
      ...categories.map((c) => ({
        value: c.id,
        label: c.code ? `${c.code} - ${c.name}` : c.name,
      })),
    ],
    [categories],
  );

  const statusOptions = [
    { value: "", label: "Semua Status" },
    { value: "active", label: "Aktif" },
    { value: "inactive", label: "Nonaktif" },
  ];

  const hasActiveFilter = Object.values(filters).some(Boolean);
  const activeCount = [filters.category_id, filters.status].filter(
    Boolean,
  ).length;

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  const filterTabs = (
    <Tabs
      value={typeFilter || ""}
      onValueChange={(val) => handleTypeFilter(val as TypeFilter)}
    >
      <TabsList variant="line" className="h-auto">
        {TYPE_TABS.map(({ key, label, icon: Icon }) => (
          <TabsTrigger key={key} value={key}>
            <Icon />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  return (
    <div className="flex flex-col gap-4">
      <LiquidGlass
        radius={20}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/[0.04]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
          {filterTabs}
          <div className="flex items-center gap-2">
            <Can permission="import-kontak-pemasok">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <UploadIcon className="size-4" />
                Import
              </Button>
            </Can>
            <Can permission="create-kontak-pemasok">
              <Button variant="primary" asChild>
                <Link href="/dashboard/kontak-pemasok/tambah">
                  <PlusIcon className="size-4" />
                  Buat Pemasok
                </Link>
              </Button>
            </Can>
          </div>
        </div>

        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          onSearch={applySearch}
          searchPlaceholder="Cari nama, perusahaan, email..."
          align="end"
          onReset={
            hasActiveFilter || !!search
              ? list.resetAll
              : undefined
          }
          hasFilter={hasActiveFilter || !!search}
          activeCount={activeCount}
          gridCols={2}
        >
          <Combobox
            options={categoryOptions}
            value={filters.category_id}
            onChange={(v) => setFilters({ ...filters, category_id: v ?? "" })}
            placeholder="Kategori"
            searchPlaceholder="Cari kategori"
            className="h-9 bg-background"
          />
          <Combobox
            options={statusOptions}
            value={filters.status}
            onChange={(v) => setFilters({ ...filters, status: v ?? "" })}
            placeholder="Status"
            searchPlaceholder="Cari status"
            className="h-9 bg-background"
          />
        </FilterToolbar>

        <div className="px-5 py-5 sm:px-6">
          <DataTable
            columns={columns}
            data={items}
            isLoading={isLoading}
            isFetching={isFetching}
            hideToolbar
            manualPagination
            pagination={pagination}
            rowCount={meta.total}
            onPaginationChange={onPaginationChange}
            tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
            emptyState={
              <EmptyState
                icon={TruckIcon}
                title="Belum ada kontak pemasok"
                description="Buat pemasok baru untuk mulai mengelola kontak."
              />
            }
          />
        </div>
      </LiquidGlass>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus Pemasok"
        description={`Apakah Anda yakin ingin menghapus kontak "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
      />

      <ImportPemasokDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
