"use client";

import { useState } from "react";
import { Clock3Icon, Loader2Icon, RefreshCwIcon } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { cn } from "@/lib/utils";
import {
  useChannelSyncSetting,
  useSetChannelSyncSetting,
} from "@/hooks/channel/use-channel-sync-setting";

export function GlobalSyncToggle({ className }: { className?: string }) {
  const { data: setting, isLoading } = useChannelSyncSetting();
  const setSync = useSetChannelSyncSetting();
  const [confirmPause, setConfirmPause] = useState(false);

  const isOn = setting?.sync_enabled ?? true;
  const pending = isLoading || setSync.isPending;

  const handleChange = (checked: boolean) => {
    if (!checked) {
      setConfirmPause(true);
      return;
    }
    setSync.mutate(true);
  };

  return (
    <LiquidGlass
      radius={20}
      intensity="subtle"
      className={cn("bg-white/30 dark:bg-white/[0.04]", className)}
    >
      <div className="flex items-center gap-4 px-4 py-3 sm:px-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60">
          <RefreshCwIcon className="size-5 text-muted-foreground" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              Penerimaan & Sinkronisasi Channel
            </span>
            {!isLoading && (
              <span
                className={cn(
                  "text-xs font-medium",
                  isOn ? "text-success" : "text-warning",
                )}
              >
                {isOn ? "Aktif" : "Dijeda"}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Global untuk semua marketplace. Saat dijeda, webhook valid dibalas
            tanpa disimpan, pull/push tidak dijalankan, dan queue internal WMS
            tetap berjalan.
          </p>
        </div>
        {pending ? (
          <Loader2Icon className="size-5 shrink-0 animate-spin text-primary" />
        ) : (
          <Switch
            checked={isOn}
            onCheckedChange={handleChange}
            aria-label="Sinkronisasi channel global"
          />
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border/60 px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
        <Clock3Icon className="size-3.5 shrink-0" />
        <span>
          Auto-pause setiap hari pukul 12.00 WIB
          {setting?.pause_reason === "auto_schedule" && !isOn
            ? " · sedang dijeda otomatis"
            : ""}
        </span>
      </div>

      <ConfirmDialog
        open={confirmPause}
        onOpenChange={(o) => !o && setConfirmPause(false)}
        title="Jeda Sinkronisasi Channel"
        description="Menghentikan penerimaan dan pengiriman data marketplace untuk semua toko. Webhook yang datang selama jeda tidak disimpan dan tidak akan diproses ulang. Pesanan marketplace yang sudah masuk sebelum jeda juga tidak ditarik ulang saat dinyalakan kembali. Lanjutkan?"
        confirmLabel="Jeda sync"
        variant="destructive"
        loading={setSync.isPending}
        onConfirm={() =>
          setSync.mutate(false, { onSuccess: () => setConfirmPause(false) })
        }
      />
    </LiquidGlass>
  );
}
