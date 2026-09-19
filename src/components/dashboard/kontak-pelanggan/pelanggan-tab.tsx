"use client";
import { EmptyState } from "@/components/ui/empty-state";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  LockIcon,
  UsersIcon,
  DownloadIcon,
  ArrowLeftRightIcon,
  Loader2Icon,
} from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterToolbar } from "@/components/dashboard/master-produk/filter-toolbar";
import { useListState } from "@/hooks/use-list-state";
import { useUrlTab } from "@/hooks/use-url-tab";
import { Can } from "@/components/auth/can";
import { usePermissions } from "@/hooks/auth/use-permissions";
import {
  useContacts,
  useContactCategories,
  useDeleteContact,
} from "@/hooks/kontak-pemasok/use-contacts";
import { exportCsv } from "@/lib/export-csv";
import type {
  ContactItem,
  ContactListParams,
} from "@/types/kontak-pemasok/contact";

type TypeFilter = "CUSTOMER" | "BOTH";

const TYPE_TABS: { key: TypeFilter; label: string; icon: typeof UsersIcon }[] =
  [
    { key: "CUSTOMER", label: "Pelanggan", icon: UsersIcon },
    { key: "BOTH", label: "Pemasok dan Pelanggan", icon: ArrowLeftRightIcon },
  ];

const TYPE_VALUES: readonly TypeFilter[] = ["CUSTOMER", "BOTH"];

interface FilterState {
  category_id: string;
  status: string;
}

const EMPTY_FILTERS: FilterState = { category_id: "", status: "" };

export function PelangganTab() {
  const list = useListState<FilterState>(EMPTY_FILTERS, {
    perPage: 20,
    namespace: "pelanggan",
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
    "pelanggan_type",
    "CUSTOMER",
    { validValues: TYPE_VALUES },
  );
  const [deleteTarget, setDeleteTarget] = useState<ContactItem | null>(null);

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

  const items = useMemo(() => data?.items ?? [], [data]);
  const meta = data?.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: perPage,
    total: 0,
  };

  const columns = useMemo<ColumnDef<ContactItem>[]>(
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
          <span className="font-medium">
            <Link
              href={`/dashboard/kontak-pelanggan/${row.original.id}`}
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
        id: "phone",
        header: "Telepon",
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.phone || row.original.mobile || "—"}
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
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div
              className="flex items-center justify-end gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {can("edit-kontak-pelanggan") && (
                <Button variant="ghost" size="icon-sm" asChild>
                  <Link
                    href={`/dashboard/kontak-pelanggan/${item.id}/edit`}
                    aria-label="Edit"
                  >
                    <PencilIcon className="size-3.5" />
                  </Link>
                </Button>
              )}
              {!item.is_system && can("delete-kontak-pelanggan") && (
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
      ...categories
        .filter((c) => !c.type || c.type === "CUSTOMER" || c.type === "BOTH")
        .map((c) => ({
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

  const handleExport = useCallback(() => {
    if (items.length === 0) return;
    exportCsv(
      "kontak-pelanggan.csv",
      [
        "Kode",
        "Nama",
        "Kategori",
        "Telepon",
        "Email",
        "Kota",
        "Provinsi",
        "Status",
      ],
      items.map((item: ContactItem) => [
        item.code,
        item.name,
        item.category?.name ?? "",
        item.phone ?? item.mobile ?? "",
        item.email ?? "",
        item.city ?? "",
        item.province ?? "",
        item.status,
      ]),
    );
  }, [items]);

  return (
    <div className="flex flex-col gap-4">
      <LiquidGlass
        radius={20}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/[0.04]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
          {filterTabs}
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
          leading={
            <Can permission="export-kontak-pelanggan">
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-full"
                onClick={handleExport}
                disabled={items.length === 0}
              >
                <DownloadIcon className="mr-1.5 size-4" />
                Export CSV
              </Button>
            </Can>
          }
          trailing={
            <Can permission="create-kontak-pelanggan">
              <Button variant="primary" asChild>
                <Link href="/dashboard/kontak-pelanggan/tambah">
                  <PlusIcon className="size-4" />
                  Buat Pelanggan
                </Link>
              </Button>
            </Can>
          }
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
                icon={UsersIcon}
                title="Belum ada kontak pelanggan"
                description="Buat pelanggan baru untuk mulai mengelola kontak."
              />
            }
          />
        </div>
      </LiquidGlass>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus Pelanggan"
        description={`Apakah Anda yakin ingin menghapus kontak "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
