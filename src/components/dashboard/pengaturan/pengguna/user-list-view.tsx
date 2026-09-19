"use client";
import { EmptyState } from "@/components/ui/empty-state";

import * as React from "react";
import Link from "next/link";
import {
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  SearchXIcon,
  FileXIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { Can } from "@/components/auth/can";
import { useMe } from "@/hooks/auth/use-auth";
import { usePermissions } from "@/hooks/auth/use-permissions";
import {
  useUsers,
  useDeleteUser,
  useBulkDeleteUsers,
} from "@/hooks/pengaturan/use-users";
import { useListState } from "@/hooks/use-list-state";
import type { User } from "@/types/pengaturan/user";
import { apiError } from "@/lib/toast";

function formatRoles(roles: string[]): string {
  if (roles.length === 0) return "-";
  const first = roles[0].charAt(0).toUpperCase() + roles[0].slice(1);
  if (roles.length === 1) return first;
  return `${first} dan ${roles.length - 1} peran lainnya`;
}

function formatLocations(locations: User["locations"]): string {
  if (locations.length === 0) return "Semua gudang";

  const names = locations.map((location) => location.locationName);
  if (names.length <= 2) return names.join(", ");

  return `${names.slice(0, 2).join(", ")} dan ${names.length - 2} lokasi lainnya`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "-";
  }
}

export function UserListView() {
  const { data: me } = useMe();
  const { can } = usePermissions();
  const canEdit = can("edit-user");
  const canDelete = can("delete-user");

  const list = useListState<Record<string, never>>(
    {},
    { perPage: 20, namespace: "users" },
  );
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = React.useState<User | null>(null);
  const [bulkOpen, setBulkOpen] = React.useState(false);

  const { data, isLoading, isError } = useUsers({
    search: list.appliedSearch,
    page: list.page,
    perPage: list.perPage,
  });
  const deleteUser = useDeleteUser();
  const bulkDelete = useBulkDeleteUsers();

  const users = React.useMemo(() => data?.items ?? [], [data]);
  const total = data?.meta?.total ?? 0;

  const isProtected = React.useCallback(
    (u: User) => u.roles.includes("owner") || u.id === me?.id,
    [me?.id],
  );
  const selectableIds = React.useMemo(
    () => users.filter((u) => !isProtected(u)).map((u) => u.id),
    [users, isProtected],
  );

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const handleToggleAll = React.useCallback(() => {
    const allSelected =
      selectableIds.length > 0 &&
      selectableIds.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(selectableIds));
  }, [selectableIds, selectedIds]);

  const columns = React.useMemo<ColumnDef<User>[]>(
    () => [
      ...(canDelete
        ? [
            {
              id: "select",
              header: () => {
                const allSelected =
                  selectableIds.length > 0 &&
                  selectableIds.every((id) => selectedIds.has(id));
                return (
                  <Checkbox
                    checked={allSelected}
                    disabled={selectableIds.length === 0}
                    onCheckedChange={handleToggleAll}
                    aria-label="Pilih semua"
                  />
                );
              },
              cell: ({ row }) => {
                const protectedRow = isProtected(row.original);
                return (
                  <Checkbox
                    checked={selectedIds.has(row.original.id)}
                    disabled={protectedRow}
                    onCheckedChange={() => handleToggleSelect(row.original.id)}
                    aria-label={`Pilih ${row.original.name}`}
                  />
                );
              },
              enableSorting: false,
              enableHiding: false,
            } as ColumnDef<User>,
          ]
        : []),
      {
        accessorKey: "name",
        header: "Nama Pengguna",
        cell: ({ row }) => (
          <Link
            href={`/dashboard/pengaturan/pengguna/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.name || row.original.email}
          </Link>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-foreground">{row.original.email}</span>
        ),
      },
      {
        accessorKey: "roles",
        header: "Peran Pengguna",
        cell: ({ row }) => (
          <span className="text-foreground">
            {formatRoles(row.original.roles)}
          </span>
        ),
      },
      {
        id: "locations",
        header: "Lokasi",
        cell: ({ row }) => {
          const locations = row.original.locations;
          const fullLocationNames =
            locations.length > 0
              ? locations.map((location) => location.locationName).join(", ")
              : "Semua gudang";

          return (
            <span
              className="block max-w-[260px] truncate text-foreground"
              title={fullLocationNames}
            >
              {formatLocations(locations)}
            </span>
          );
        },
      },
      {
        accessorKey: "lastLoginAt",
        header: "Login Terakhir",
        cell: ({ row }) => (
          <span className="text-foreground">
            {formatDate(row.original.lastLoginAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => {
          const user = row.original;
          const showDelete = canDelete && !isProtected(user);
          return (
            <div className="flex justify-end gap-1">
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  asChild
                  aria-label={`Edit ${user.name}`}
                >
                  <Link href={`/dashboard/pengaturan/pengguna/${user.id}/edit`}>
                    <PencilIcon className="size-4" />
                  </Link>
                </Button>
              )}
              {showDelete && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(user)}
                  aria-label={`Hapus ${user.name}`}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [
      selectedIds,
      selectableIds,
      isProtected,
      canEdit,
      canDelete,
      handleToggleAll,
    ],
  );

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    deleteUser.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Pengguna berhasil dihapus.");
        setDeleteTarget(null);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(deleteTarget.id);
          return next;
        });
      },
      onError: (err) => apiError(err, "Gagal menghapus pengguna."),
    });
  }

  function handleConfirmBulkDelete() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    bulkDelete.mutate(ids, {
      onSuccess: ({ deleted, failed }) => {
        if (deleted.length > 0) {
          toast.success(`${deleted.length} pengguna berhasil dihapus.`);
        }
        if (failed.length > 0) {
          toast.error(
            `${failed.length} pengguna gagal dihapus: ${failed[0].message}`,
          );
        }
        setSelectedIds(new Set());
        setBulkOpen(false);
      },
      onError: (err) => apiError(err, "Gagal menghapus pengguna."),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <LiquidGlass radius={24} className="bg-white/40 dark:bg-white/[0.06]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
          <div className="relative w-full max-w-xs">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  list.applySearch();
                }
              }}
              placeholder="Cari pengguna"
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
            {canDelete && selectedIds.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setBulkOpen(true)}
              >
                <Trash2Icon className="mr-1 size-4" />
                Hapus ({selectedIds.size})
              </Button>
            )}
            <Can permission="create-user">
              <Button size="sm" asChild>
                <Link href="/dashboard/pengaturan/pengguna/buat">
                  <PlusIcon className="mr-1 size-4" />
                  Buat Pengguna
                </Link>
              </Button>
            </Can>
          </div>
        </div>

        <div className="flex items-center justify-end px-5 py-3 text-sm text-muted-foreground">
          Total <Badge className="ml-2">{total}</Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-sm text-destructive">
            Gagal memuat data pengguna.
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={list.appliedSearch ? SearchXIcon : FileXIcon}
            title={
              list.appliedSearch ? "Tidak ditemukan" : "Belum ada pengguna"
            }
          />
        ) : (
          <div className="px-5 pb-5">
            <DataTable
              columns={columns}
              data={users}
              hideToolbar
              manualPagination
              pagination={list.pagination}
              rowCount={total}
              onPaginationChange={list.onPaginationChange}
              tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
              emptyState={
                <EmptyState
                  icon={list.appliedSearch ? SearchXIcon : FileXIcon}
                  title={
                    list.appliedSearch
                      ? "Tidak ditemukan"
                      : "Belum ada pengguna"
                  }
                />
              }
            />
          </div>
        )}
      </LiquidGlass>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteUser.isPending) setDeleteTarget(null);
        }}
        title="Hapus Pengguna"
        description={`Apakah Anda yakin ingin menghapus pengguna ${deleteTarget?.name}? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        loading={deleteUser.isPending}
        onConfirm={handleConfirmDelete}
      />

      <ConfirmDialog
        open={bulkOpen}
        onOpenChange={(open) => {
          if (!open && !bulkDelete.isPending) setBulkOpen(false);
        }}
        title="Hapus Pengguna Terpilih"
        description={`Hapus ${selectedIds.size} pengguna terpilih? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        loading={bulkDelete.isPending}
        onConfirm={handleConfirmBulkDelete}
      />
    </div>
  );
}
