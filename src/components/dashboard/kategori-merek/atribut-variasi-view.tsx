"use client";

import * as React from "react";
import { Loader2Icon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterShell } from "@/components/dashboard/master-produk/filter-shell";
import { PageTitle } from "@/components/dashboard/page-title";
import { TambahAtributDialog } from "@/components/dashboard/kategori-merek/tambah-atribut-dialog";
import {
  useCategoryFormAttributes,
  useChannelAttributes,
  useDeleteCategoryAttribute,
  useMapAttributeToChannel,
} from "@/hooks/kategori-merek/use-kategori";
import { useListState } from "@/hooks/use-list-state";
import type { CategoryAttributeItem } from "@/types/kategori-merek/kategori";

const CHANNELS = [
  { code: "shopee", name: "Shopee" },
  { code: "tiktok", name: "TikTok Shop" },
  { code: "lazada", name: "Lazada" },
  { code: "blibli", name: "Blibli" },
] as const;

interface AtributVariasiViewProps {
  categoryId: number;
  type: "spec" | "sales";
}

export function AtributVariasiView({
  categoryId,
  type,
}: AtributVariasiViewProps) {
  const list = useListState<Record<string, never>>(
    {},
    { namespace: "atribut" },
  );
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] =
    React.useState<CategoryAttributeItem | null>(null);

  const label = type === "spec" ? "Atribut" : "Variasi";
  const pageLabel = type === "spec" ? "Atribut" : "Variasi";

  const { data, isLoading, isError } = useCategoryFormAttributes(categoryId);
  const deleteMut = useDeleteCategoryAttribute();

  const items = React.useMemo(() => {
    const source = type === "spec" ? data?.specifications : data?.variant_types;
    if (!source) return [];
    const q = list.appliedSearch.toLowerCase();
    if (!q) return source;
    return source.filter((a) => a.name.toLowerCase().includes(q));
  }, [data, type, list.appliedSearch]);

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMut.mutate(
      { categoryId, attributeId: deleteTarget.attribute_id },
      { onSuccess: () => setDeleteTarget(null) },
    );
  }

  return (
    <>
      <PageTitle
        title={pageLabel}
        backHref="/dashboard/kategori-merek/kategori"
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Katalog" },
          { label: "Kategori & Merek" },
          {
            label: "Pemetaan Kategori",
            href: "/dashboard/kategori-merek/kategori",
          },
          { label: pageLabel },
        ]}
        actions={
          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
            <PlusIcon className="size-4" />
            Tambah {label}
          </Button>
        }
      />

      <LiquidGlass radius={24} className="bg-white/40 dark:bg-white/[0.06]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 className="text-base font-medium">{pageLabel}</h2>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Memuat…" : `${items.length} ${label.toLowerCase()}`}
            </p>
          </div>
        </div>

        <FilterShell
          open={filterOpen}
          onOpenChange={setFilterOpen}
          activeCount={list.search ? 1 : 0}
          onReset={list.search ? () => list.applySearch("") : undefined}
        >
          <div className={cn("sm:col-span-2 lg:col-span-3")}>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              Pencarian
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={list.search}
                  onChange={(e) => list.setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      list.applySearch();
                    }
                  }}
                  placeholder={`Cari ${label.toLowerCase()}`}
                  className="h-10 pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => list.applySearch()}
                className="h-10"
              >
                Cari
              </Button>
            </div>
          </div>
        </FilterShell>

        <div className="px-5 py-5 sm:px-6">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-sm text-destructive">
              Gagal memuat data {label.toLowerCase()}.
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Belum ada {label.toLowerCase()} yang ditambahkan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-muted/50 min-w-[200px]">
                      Nama {label}
                    </TableHead>
                    {CHANNELS.map((ch) => (
                      <TableHead key={ch.code} className="min-w-[200px]">
                        {ch.name}
                      </TableHead>
                    ))}
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <AtributRow
                      key={item.attribute_id}
                      item={item}
                      categoryId={categoryId}
                      type={type}
                      onDelete={() => setDeleteTarget(item)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </LiquidGlass>

      <TambahAtributDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categoryId={categoryId}
        type={type}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={`Hapus ${label}`}
        description={`Apakah Anda yakin ingin menghapus ${label.toLowerCase()} "${deleteTarget?.name}"?`}
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
        variant="destructive"
      />
    </>
  );
}

function AtributRow({
  item,
  categoryId,
  type,
  onDelete,
}: {
  item: CategoryAttributeItem;
  categoryId: number;
  type: "spec" | "sales";
  onDelete: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="sticky left-0 z-10 bg-background font-medium whitespace-nowrap">
        {item.name}
      </TableCell>
      {CHANNELS.map((ch) => (
        <ChannelMappingCell
          key={ch.code}
          channelCode={ch.code}
          channelName={ch.name}
          attributeId={item.attribute_id}
          categoryId={categoryId}
          mapped={!!item.channels[ch.code]?.mapped}
          type={type}
        />
      ))}
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
          aria-label="Hapus item"
          onClick={onDelete}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function ChannelMappingCell({
  channelCode,
  channelName: _channelName,
  attributeId,
  categoryId,
  mapped,
  type,
}: {
  channelCode: string;
  channelName: string;
  attributeId: number;
  categoryId: number;
  mapped: boolean;
  type: "spec" | "sales";
}) {
  const [selecting, setSelecting] = React.useState(false);
  const mapMut = useMapAttributeToChannel();

  if (mapped) {
    return (
      <TableCell className="text-sm">
        <Badge variant="secondary" className="font-normal">
          Dipetakan
        </Badge>
      </TableCell>
    );
  }

  if (!selecting) {
    return (
      <TableCell className="text-sm">
        <Button variant="primary" size="sm" onClick={() => setSelecting(true)}>
          Petakan
        </Button>
      </TableCell>
    );
  }

  return (
    <TableCell className="text-sm">
      <ChannelAttributeSelect
        channelCode={channelCode}
        categoryId={categoryId}
        type={type}
        onSelect={(channelAttrId) => {
          mapMut.mutate(
            { attributeId, channelAttributeIds: [channelAttrId] },
            { onSuccess: () => setSelecting(false) },
          );
        }}
        onCancel={() => setSelecting(false)}
        loading={mapMut.isPending}
      />
    </TableCell>
  );
}

function ChannelAttributeSelect({
  channelCode,
  categoryId,
  type,
  onSelect,
  onCancel,
  loading,
}: {
  channelCode: string;
  categoryId: number;
  type: "spec" | "sales";
  onSelect: (id: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const { data: attrs, isLoading } = useChannelAttributes(
    channelCode,
    categoryId,
  );

  const filtered = React.useMemo(() => {
    if (!attrs) return [];
    return attrs.filter((a) =>
      type === "sales" ? a.is_sale_prop : !a.is_sale_prop,
    );
  }, [attrs, type]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Loader2Icon className="size-3 animate-spin" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Tidak tersedia</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onCancel}
        >
          Batal
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select onValueChange={(v) => onSelect(v)} disabled={loading}>
        <SelectTrigger className="h-8 min-w-[140px] text-xs">
          <SelectValue placeholder="Pilih atribut" />
        </SelectTrigger>
        <SelectContent>
          {filtered.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
              {a.is_required && " *"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={onCancel}
      >
        Batal
      </Button>
    </div>
  );
}
