"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAsyncExport } from "@/hooks/laporan/use-async-export";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// eslint-disable-next-line no-restricted-imports
import { OrderService } from "@/services/pesanan/order.service";

export function ExportCancelDialog() {
  const [open, setOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [postPackOnly, setPostPackOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const exportMutation = useAsyncExport(OrderService.exportCancelled, {
    autoDownload: true,
  });
  const loading = exportMutation.isPending;

  const onSubmit = async () => {
    setError(null);
    try {
      await exportMutation.mutateAsync({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        post_pack_only: postPackOnly,
      });
      setOpen(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Gagal mengunduh data pesanan cancel.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="size-4" />
          Unduh Data Cancel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unduh Data Pesanan Cancel</DialogTitle>
          <DialogDescription>
            Rekap pesanan batal per tanggal untuk mencocokkan paket fisik.
            Kosongkan tanggal untuk mengambil semua data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label htmlFor="date-from" className="text-sm font-medium">
                Dari tanggal
              </label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="date-to" className="text-sm font-medium">
                Sampai tanggal
              </label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={postPackOnly}
              onCheckedChange={(v) => setPostPackOnly(v === true)}
            />
            <span>Hanya pesanan yang batal setelah packing</span>
          </label>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Batal
          </Button>
          <Button onClick={onSubmit} disabled={loading} className="gap-2">
            {loading && <Loader2 className="size-4 animate-spin" />}
            Unduh XLSX
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
