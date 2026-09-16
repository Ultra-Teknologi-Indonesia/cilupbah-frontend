"use client";

import * as React from "react";
import { ChevronDownIcon, PlusIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  ChannelGroup as ChannelGroupType,
  ConnectedStore,
} from "@/types/channel";
import { ChannelLogo } from "./channel-logo";
import { StoreCard } from "./store-card";

export function ChannelGroup({
  group,
  onAdd,
  onToggleActive,
  onOpenSync,
  onRefresh,
  onReauth,
  onDisconnect,
}: {
  group: ChannelGroupType;
  onAdd: (group: ChannelGroupType) => void;
  onToggleActive: (id: string, value: boolean) => void;
  onOpenSync: (store: ConnectedStore) => void;
  onRefresh: (store: ConnectedStore) => void;
  onReauth: (store: ConnectedStore) => void;
  onDisconnect: (store: ConnectedStore) => void;
}) {
  const [open, setOpen] = React.useState(true);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <ChannelLogo code={group.code} name={group.name} />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{group.name}</h2>
            <span className="inline-flex items-center gap-1 text-xs text-success">
              <span aria-hidden className="size-1.5 rounded-full bg-success" />
              Tersambung
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {group.stores.length} Toko
          </span>
          <Button
            variant="primary"
            size="sm"
            disabled={!group.connectable}
            onClick={() => onAdd(group)}
            title={group.connectable ? undefined : "Belum didukung"}
          >
            <PlusIcon />
            Tambah Baru
          </Button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Tutup" : "Buka"}
            aria-expanded={open}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform",
                !open && "-rotate-90",
              )}
            />
          </button>
        </div>
      </header>

      {open && (
        <div className="grid grid-cols-1 gap-3 border-t border-border/60 p-4 md:grid-cols-2 xl:grid-cols-3">
          {group.stores.map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              onToggleActive={onToggleActive}
              onOpenSync={onOpenSync}
              onRefresh={onRefresh}
              onReauth={onReauth}
              onDisconnect={onDisconnect}
            />
          ))}
        </div>
      )}
    </section>
  );
}
