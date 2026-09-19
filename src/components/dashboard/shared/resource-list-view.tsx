"use client";
import { EmptyState } from "@/components/ui/empty-state";

import * as React from "react";
import type { ColumnDef, Table as TableInstance } from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";
import { DownloadIcon, SearchXIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { DataTable } from "@/components/ui/data-table/data-table";
import { FilterToolbar } from "@/components/dashboard/shared/filter-toolbar";
import type { useListState } from "@/hooks/use-list-state";

type ListState = ReturnType<typeof useListState<never>>;

interface ResourceListViewProps<T> {
  list: Pick<
    ListState,
    | "search"
    | "setSearch"
    | "appliedSearch"
    | "applySearch"
    | "hasActiveFilter"
    | "activeFilterCount"
    | "pagination"
    | "onPaginationChange"
    | "resetFilters"
    | "resetAll"
    | "reset"
    | "sorting"
    | "setSorting"
  >;
  columns: ColumnDef<T>[];
  rows: T[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  searchPlaceholder: string;

  filterControls?: React.ReactNode;
  filterGridCols?: 1 | 2 | 3 | 4;

  onExport?: () => void;

  toolbarLeading?: React.ReactNode;

  toolbarTrailing?: React.ReactNode;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;

  enableRowSelection?: boolean;
  bulkActions?: (selected: T[], table: TableInstance<T>) => React.ReactNode;
  getRowId?: (row: T, index: number) => string;
}

export function ResourceListView<T>({
  list,
  columns,
  rows,
  total,
  isLoading,
  isFetching,
  searchPlaceholder,
  filterControls,
  filterGridCols = 2,
  onExport,
  toolbarLeading,
  toolbarTrailing,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
  enableRowSelection,
  bulkActions,
  getRowId,
}: ResourceListViewProps<T>) {
  return (
    <LiquidGlass
      radius={20}
      intensity="subtle"
      className="bg-white/30 dark:bg-white/[0.04]"
    >
      <FilterToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        onSearch={list.applySearch}
        searchPlaceholder={searchPlaceholder}
        align="end"
        onReset={
          list.hasActiveFilter || !!list.search ? list.resetAll : undefined
        }
        hasFilter={list.hasActiveFilter || !!list.search}
        activeCount={list.activeFilterCount}
        gridCols={filterGridCols}
        leading={
          <>
            {toolbarLeading}
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                disabled={rows.length === 0}
              >
                <DownloadIcon className="mr-1.5 size-4" />
                Export CSV
              </Button>
            )}
          </>
        }
        trailing={toolbarTrailing}
      >
        {filterControls}
      </FilterToolbar>

      <div className="px-5 py-5 sm:px-6">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          isFetching={isFetching}
          hideToolbar
          manualPagination
          manualSorting
          sorting={list.sorting}
          onSortingChange={list.setSorting}
          pagination={list.pagination}
          rowCount={total}
          onPaginationChange={list.onPaginationChange}
          enableRowSelection={enableRowSelection}
          bulkActions={bulkActions}
          getRowId={getRowId}
          tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
          emptyState={
            list.appliedSearch ? (
              <EmptyState
                icon={SearchXIcon}
                title="Tidak ditemukan"
                description={`Tidak ada hasil untuk "${list.appliedSearch}"`}
              />
            ) : (
              <EmptyState
                icon={EmptyIcon}
                title={emptyTitle}
                description={emptyDescription}
              />
            )
          }
        />
      </div>
    </LiquidGlass>
  );
}
