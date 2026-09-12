"use client";

import * as React from "react";
import {
  HistoryIcon,
  UserIcon,
  CheckCircle2Icon,
  ClockIcon,
  CalendarIcon,
  MapPinIcon,
  PackageCheckIcon,
  UsersIcon,
  LayersIcon,
} from "lucide-react";
import { formatDateTime } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePutawayHistory } from "@/hooks/barang-masuk/use-putaway-actions";
import type {
  PutawayHistory,
  PutawayLifecycleEvent,
} from "@/types/barang-masuk/putaway";

interface RiwayatPenempatanDialogProps {
  putawayId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EventIcon({ type }: { type: PutawayLifecycleEvent["type"] }) {
  switch (type) {
    case "CREATED":
      return (
        <div className="grid size-9 place-items-center rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-4 ring-card shadow-xs border border-blue-500/30 shrink-0">
          <CalendarIcon className="size-4.5" />
        </div>
      );
    case "ASSIGNED":
      return (
        <div className="grid size-9 place-items-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-4 ring-card shadow-xs border border-amber-500/30 shrink-0">
          <UserIcon className="size-4.5" />
        </div>
      );
    case "STARTED":
      return (
        <div className="grid size-9 place-items-center rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 ring-4 ring-card shadow-xs border border-indigo-500/30 shrink-0">
          <ClockIcon className="size-4.5" />
        </div>
      );
    case "COMPLETED":
      return (
        <div className="grid size-9 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-4 ring-card shadow-xs border border-emerald-500/30 shrink-0">
          <CheckCircle2Icon className="size-4.5" />
        </div>
      );
    default:
      return (
        <div className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground ring-4 ring-card shadow-xs border border-border shrink-0">
          <HistoryIcon className="size-4.5" />
        </div>
      );
  }
}

export function RiwayatPenempatanDialog({
  putawayId,
  open,
  onOpenChange,
}: RiwayatPenempatanDialogProps) {
  const { data: history, isLoading } = usePutawayHistory(putawayId, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(88vh,860px)] w-full sm:max-w-4xl lg:max-w-5xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl">
        {/* Dialog Header with pr-16 to avoid overlapping close button */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 bg-muted/20 pr-16">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary shrink-0">
                <HistoryIcon className="size-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <DialogTitle className="text-base font-semibold text-foreground">
                    Riwayat & Jejak Audit Penempatan
                  </DialogTitle>
                  {history && (
                    <StatusBadge
                      domain="putaway"
                      status={history.status}
                      className="capitalize text-xs font-semibold px-2.5 py-0.5"
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Dokumen:{" "}
                  <span className="font-mono font-medium text-foreground">
                    {history?.putaway_no ?? "—"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Dialog Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-2xl" />
                ))}
              </div>
              <Skeleton className="h-48 rounded-2xl" />
            </div>
          ) : !history ? (
            <EmptyState
              icon={HistoryIcon}
              title="Riwayat tidak ditemukan"
              description="Data riwayat untuk dokumen penempatan ini tidak dapat dimuat."
            />
          ) : (
            <>
              {/* Top 3 Summary Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* Dibuat Oleh */}
                <div className="rounded-2xl border border-border/60 bg-card p-4 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between text-muted-foreground mb-2">
                    <span className="text-2xs font-semibold uppercase tracking-wider">
                      Dibuat Oleh
                    </span>
                    <CalendarIcon className="size-3.5 text-blue-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-foreground truncate">
                      {history.summary.creator?.name ?? "System"}
                    </div>
                    <div className="text-2xs text-muted-foreground truncate mt-0.5">
                      {history.summary.creator?.email ?? "—"}
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2.5 border-t border-border/40 text-2xs text-muted-foreground">
                    {history.summary.created_at
                      ? formatDateTime(history.summary.created_at)
                      : "—"}
                  </div>
                </div>

                {/* Ditugaskan Oleh */}
                <div className="rounded-2xl border border-border/60 bg-card p-4 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between text-muted-foreground mb-2">
                    <span className="text-2xs font-semibold uppercase tracking-wider">
                      Ditugaskan Oleh
                    </span>
                    <UserIcon className="size-3.5 text-amber-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-foreground truncate">
                      {history.summary.assigned_by?.name ??
                        history.summary.creator?.name ??
                        "—"}
                    </div>
                    <div className="text-2xs text-muted-foreground truncate mt-0.5">
                      {history.summary.assigned_by?.email ??
                        history.summary.creator?.email ??
                        "—"}
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2.5 border-t border-border/40 text-2xs text-muted-foreground">
                    Pemberi Tugas
                  </div>
                </div>

                {/* Dikerjakan Oleh */}
                <div className="rounded-2xl border border-border/60 bg-card p-4 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between text-muted-foreground mb-2">
                    <span className="text-2xs font-semibold uppercase tracking-wider">
                      Dikerjakan Oleh
                    </span>
                    <PackageCheckIcon className="size-3.5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-foreground truncate">
                      {history.summary.assigned_to?.name ?? "Belum Ditugaskan"}
                    </div>
                    <div className="text-2xs text-muted-foreground truncate mt-0.5">
                      {history.summary.assigned_to?.email ?? "—"}
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2.5 border-t border-border/40 text-2xs text-muted-foreground">
                    {history.summary.completed_at
                      ? `Selesai: ${formatDateTime(history.summary.completed_at)}`
                      : history.summary.started_at
                        ? `Mulai: ${formatDateTime(history.summary.started_at)}`
                        : "Belum Dikerjakan"}
                  </div>
                </div>
              </div>

              {/* Tabs Section */}
              <Tabs defaultValue="timeline" className="w-full">
                <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-muted/40 p-1">
                  <TabsTrigger
                    value="timeline"
                    className="rounded-xl text-xs font-medium gap-1.5"
                  >
                    <ClockIcon className="size-3.5" />
                    <span>Timeline Status</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="placements"
                    className="rounded-xl text-xs font-medium gap-1.5"
                  >
                    <LayersIcon className="size-3.5" />
                    <span>Scan Rak ({history.placements?.length ?? 0})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="team"
                    className="rounded-xl text-xs font-medium gap-1.5"
                  >
                    <UsersIcon className="size-3.5" />
                    <span>Tim & Partisipan</span>
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Timeline */}
                <TabsContent value="timeline" className="mt-4 space-y-4">
                  <div className="space-y-4 pt-1">
                    {history.events.map((event, idx) => {
                      const isLast = idx === history.events.length - 1;
                      return (
                        <div
                          key={idx}
                          className="relative flex items-start gap-4"
                        >
                          {/* Left: Icon node & vertical connector line */}
                          <div className="relative flex flex-col items-center shrink-0 self-stretch">
                            <EventIcon type={event.type} />
                            {!isLast && (
                              <div className="w-0.5 grow bg-border/80 my-1 min-h-[2rem]" />
                            )}
                          </div>

                          {/* Right: Event card with clean spacing */}
                          <div className="flex-1 rounded-2xl border border-border/60 bg-card p-4 shadow-2xs transition-colors hover:border-border">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="text-sm font-semibold text-foreground">
                                {event.title}
                              </h4>
                              <span className="text-xs font-mono text-muted-foreground">
                                {event.timestamp
                                  ? formatDateTime(event.timestamp)
                                  : "—"}
                              </span>
                            </div>
                            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                              {event.description}
                            </p>

                            {event.actor && (
                              <div className="mt-3 flex items-center gap-2 pt-2.5 border-t border-border/40 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">
                                  Oleh: {event.actor.name}
                                </span>
                                {event.actor.email && (
                                  <span className="text-muted-foreground/80">
                                    ({event.actor.email})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* Tab 2: Placements */}
                <TabsContent value="placements" className="mt-4">
                  {history.placements.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
                      Belum ada catatan mutasi fisik rak yang tersimpan.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow>
                            <TableHead className="min-w-[220px]">
                              SKU / Produk
                            </TableHead>
                            <TableHead className="min-w-[140px]">
                              Kode Rak
                            </TableHead>
                            <TableHead className="min-w-[90px] text-right">
                              Qty
                            </TableHead>
                            <TableHead className="min-w-[170px]">
                              Waktu Scan
                            </TableHead>
                            <TableHead className="min-w-[150px]">
                              Eksekutor
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {history.placements.map((p) => (
                            <TableRow key={p.id} className="text-xs">
                              <TableCell>
                                <div className="font-mono font-semibold text-primary">
                                  {p.sku}
                                </div>
                                {p.product_name && (
                                  <div className="text-2xs text-muted-foreground truncate max-w-xs mt-0.5">
                                    {p.product_name}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="font-mono text-2xs gap-1.5 px-2.5 py-1"
                                >
                                  <MapPinIcon className="size-3 text-primary" />
                                  <span>{p.bin_code}</span>
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-bold font-mono text-xs">
                                +{p.qty}
                              </TableCell>
                              <TableCell className="text-2xs font-mono text-muted-foreground">
                                {formatDateTime(p.timestamp)}
                              </TableCell>
                              <TableCell>
                                <span className="font-medium text-foreground">
                                  {p.actor?.name ?? "System"}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 3: Team */}
                <TabsContent value="team" className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                      <UsersIcon className="size-4 text-primary" />
                      <span>Akun Terlibat dalam Dokumen Ini</span>
                    </h4>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs">
                        <div className="text-2xs text-muted-foreground font-medium uppercase">
                          Pembuat Dokumen
                        </div>
                        <div className="font-semibold text-foreground mt-0.5">
                          {history.summary.creator?.name ?? "—"}
                        </div>
                        <div className="text-2xs text-muted-foreground">
                          {history.summary.creator?.email ?? "—"}
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs">
                        <div className="text-2xs text-muted-foreground font-medium uppercase">
                          Petugas Pelaksana
                        </div>
                        <div className="font-semibold text-foreground mt-0.5">
                          {history.summary.assigned_to?.name ?? "—"}
                        </div>
                        <div className="text-2xs text-muted-foreground">
                          {history.summary.assigned_to?.email ?? "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {history.participants && history.participants.length > 0 && (
                    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                        <UsersIcon className="size-4 text-primary" />
                        <span>Partisipan Sesi Penerimaan Terkait</span>
                      </h4>
                      <div className="divide-y divide-border/40">
                        {history.participants.map((part) => (
                          <div
                            key={part.id}
                            className="flex items-center justify-between py-2 text-xs"
                          >
                            <div>
                              <div className="font-medium text-foreground">
                                {part.name}
                              </div>
                              <div className="text-2xs text-muted-foreground">
                                {part.email}
                              </div>
                            </div>
                            <div className="text-right text-2xs text-muted-foreground">
                              <Badge
                                variant="secondary"
                                className="text-2xs font-normal"
                              >
                                {part.status}
                              </Badge>
                              {part.joined_at && (
                                <div className="mt-0.5">
                                  {formatDateTime(part.joined_at)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
