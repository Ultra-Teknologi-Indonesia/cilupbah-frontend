"use client";

import * as React from "react";
import {
  SearchIcon,
  Trash2Icon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowRightLeftIcon,
  PackageMinusIcon,
  Loader2Icon,
  PrinterIcon,
  CopyIcon,
  SparklesIcon,
  UploadIcon,
  DownloadIcon,
  BoxesIcon,
  PlusIcon,
  XIcon,
  ChevronDownIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { apiError } from "@/lib/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SimplePagination } from "@/components/ui/simple-pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BIN_QR_PAPER_DEFAULT,
  BIN_QR_PAPER_OPTIONS as PAPER_OPTIONS,
  type BinQrPaper,
} from "@/hooks/manajemen-rak/use-bin-qr";
import {
  buildBinPreview,
  binCombinationCount,
  MAX_BIN_COMBINATIONS,
} from "@/lib/manajemen-rak/bin-preview";
import {
  useLocationBins,
  useLocationBinsInfinite,
  useUniformApplyBins,
  useMoveSkuBin,
  useRemoveSkuBin,
} from "@/hooks/manajemen-rak/use-location-bins";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useEligibleSkusInfinite } from "@/hooks/manajemen-rak/use-eligible-skus";
import { useAssignBinSku } from "@/hooks/manajemen-rak/use-assign-bin-sku";
import {
  useDownloadBinImportTemplate,
  useImportBins,
  useImportBinsPreview,
} from "@/hooks/manajemen-rak/use-import-bins";
import { useZones } from "@/hooks/manajemen-rak/use-zones";
import {
  MultiSkuBadge,
  MultiSkuRulesCard,
} from "@/components/dashboard/manajemen-rak/lokasi/multi-sku-rules-card";
import { useListState } from "@/hooks/use-list-state";
import type {
  BinDraft,
  BinListParams,
  BinPreviewItem,
  GenerateBinsPayload,
  PendingPutawaySku,
} from "@/types/manajemen-rak/location";

export interface BinSkuAssignment {
  binId: string;
  itemId: string;
}

const PER_PAGE_OPTIONS = [50, 100, 200] as const;

interface DimensionRowProps {
  label: string;
  qty: string;
  code: string;
  onQty: (v: string) => void;
  onCode: (v: string) => void;
  disabled?: boolean;
}

function DimensionRow({
  label,
  qty,
  code,
  onQty,
  onCode,
  disabled,
}: DimensionRowProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>
          {label}
          <span className="text-destructive"> *</span>
        </Label>
        <Input
          type="number"
          min={1}
          inputMode="numeric"
          placeholder={`Jumlah ${label.toLowerCase()}`}
          value={qty}
          onChange={(e) => onQty(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label>Kode</Label>
        <Input
          value={code}
          onChange={(e) => onCode(e.target.value)}
          disabled={disabled}
          maxLength={10}
        />
      </div>
    </div>
  );
}

interface UniformDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (values: {
    isStockAcknowledged: boolean;
    isLargeBin: boolean;
    zoneId: string;
  }) => void;
  pending?: boolean;
  scopeLabel?: string;
  zoneOptions?: { value: string; label: string }[];
}

function UniformDialog({
  open,
  onOpenChange,
  onApply,
  pending,
  scopeLabel,
  zoneOptions = [],
}: UniformDialogProps) {
  const [isStockAcknowledged, setIsStockAcknowledged] = React.useState(true);
  const [isLargeBin, setIsLargeBin] = React.useState(false);
  const [zoneId, setZoneId] = React.useState("");

  const handleApply = () => {
    onApply({
      isStockAcknowledged,
      isLargeBin,
      zoneId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Seragamkan {scopeLabel ? `(${scopeLabel})` : ""}
          </DialogTitle>
          <DialogClose />
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {zoneOptions.length > 0 && (
            <div className="space-y-2">
              <Label>Zona</Label>
              <Select value={zoneId} onValueChange={setZoneId}>
                <SelectTrigger className="h-9 w-full border-border bg-background">
                  <SelectValue placeholder="Pilih zona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tidak diubah</SelectItem>
                  {zoneOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label>Gudang Besar</Label>
            <Switch checked={isLargeBin} onCheckedChange={setIsLargeBin} />
          </div>

          <div className="flex items-center justify-between">
            <Label>Akui Stok</Label>
            <Switch
              checked={isStockAcknowledged}
              onCheckedChange={setIsStockAcknowledged}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" onClick={handleApply} disabled={pending}>
            {pending && <Loader2Icon className="mr-2 size-3.5 animate-spin" />}
            Terapkan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ImportBinsDialog({
  open,
  onOpenChange,
  locationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<{
    total: number;
    new: number;
    existing: number;
    sample_new: string[];
  } | null>(null);
  const previewMut = useImportBinsPreview();
  const importMut = useImportBins();
  const templateMut = useDownloadBinImportTemplate();

  const reset = () => {
    setFile(null);
    setPreview(null);
  };

  const handleFile = (f: File | null) => {
    setFile(f);
    setPreview(null);
    if (f) {
      previewMut.mutate(
        { locationId, file: f },
        { onSuccess: (res) => setPreview(res.data ?? null) },
      );
    }
  };

  const handleImport = () => {
    if (!file) return;
    importMut.mutate(
      { locationId, file },
      {
        onSuccess: (res) => {
          toast.success(
            `Berhasil import: ${res.data?.created ?? 0} rak baru, ${res.data?.existing ?? 0} sudah ada.`,
          );
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Kode Rak</DialogTitle>
          <DialogClose />
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">
              Belum punya filenya? Unduh template — sudah berisi judul kolom
              yang benar dan contoh kode rak dari lokasi ini.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => templateMut.mutate(locationId)}
              disabled={templateMut.isPending}
            >
              {templateMut.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <DownloadIcon className="size-4" />
              )}
              Template
            </Button>
          </div>

          <div className="space-y-2">
            <Label>File (.xlsx / .csv)</Label>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-2xs text-muted-foreground">
              Butuh kolom kode rak (nama kolom{" "}
              <span className="font-mono">kode_rak</span>,{" "}
              <span className="font-mono">rak</span>, atau{" "}
              <span className="font-mono">No Rak</span>). Format bebas, mis.{" "}
              <span className="font-mono">IN-A1-K1-P1</span>.
            </p>
          </div>

          {previewMut.isPending && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" /> Membaca file…
            </p>
          )}

          {preview && (
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span>
                  Total kode:{" "}
                  <strong>{preview.total.toLocaleString("id-ID")}</strong>
                </span>
                <span className="text-primary">
                  Baru: <strong>{preview.new.toLocaleString("id-ID")}</strong>
                </span>
                <span className="text-muted-foreground">
                  Sudah ada:{" "}
                  <strong>{preview.existing.toLocaleString("id-ID")}</strong>
                </span>
              </div>
              {preview.sample_new.length > 0 && (
                <p className="mt-2 truncate font-mono text-2xs text-muted-foreground">
                  Contoh baru: {preview.sample_new.slice(0, 8).join(", ")}
                  {preview.new > 8 ? " …" : ""}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={!preview || preview.new === 0 || importMut.isPending}
          >
            {importMut.isPending && (
              <Loader2Icon className="mr-2 size-3.5 animate-spin" />
            )}
            Import{preview && preview.new > 0 ? ` ${preview.new} rak` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface WarehouseVisualProps {
  floors: number;
  rows: number;
  columns: number;
  bins: number;
}

function WarehouseVisual({
  floors,
  rows,
  columns,
  bins,
}: WarehouseVisualProps) {
  const empty = floors < 1 && rows < 1 && columns < 1 && bins < 1;

  if (empty) {
    return (
      <div className="flex h-full min-h-[240px] w-full items-center justify-center rounded-2xl border border-dashed border-border px-6 text-center text-xs text-muted-foreground">
        Isi jumlah lantai, baris, kolom, dan rak untuk melihat pratinjau gudang
        3D.
      </div>
    );
  }

  const F = Math.min(Math.max(floors, 1), 3);
  const R = Math.min(Math.max(rows, 1), 3);
  const C = Math.min(Math.max(columns, 1), 6);
  const B = Math.min(Math.max(bins, 1), 5);

  const COS = 0.866;
  const SIN = 0.5;
  const U = 24;
  const LH = 8;
  const RD = 0.62;
  const AISLE = 0.5;
  const M_BACK = 0.45;
  const M_FRONT = 0.45;
  const M_SIDE = 0.28;

  const GX = C;
  const depthRows = R * RD + (R - 1) * AISLE;
  const GY = M_BACK + depthRows + M_FRONT;
  const shelfH = B * LH;
  const headroom = 13;
  const floorH = shelfH + headroom;
  const maxZ = F * floorH;

  const padX = 18;
  const padY = 18;
  const W = (GX + GY) * COS * U + padX * 2;
  const H = maxZ + (GX + GY) * SIN * U + padY * 2;

  const ox = padX + GY * COS * U;
  const oy = padY + maxZ;

  const pt = (gx: number, gy: number, gz: number): [number, number] => [
    ox + (gx - gy) * COS * U,
    oy + (gx + gy) * SIN * U - gz,
  ];
  const ptsOf = (arr: [number, number][]) =>
    arr.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

  const WALL_BACK = "#e6e9ef";
  const WALL_SIDE = "#d3d8e1";
  const BLUE_TOP = "#4361ee";
  const BLUE_S1 = "#3550c0";
  const BLUE_S2 = "#2c44a8";
  const SHELF_TOP = "#f2f5f9";
  const SHELF_FRONT = "#dfe5ec";
  const SHELF_END = "#cad2dc";
  const ITEM = "#fbfcfe";
  const ITEM_STK = "#c3ccd8";
  const FACE_STK = "#b7c0cc";
  const POST = "#334155";

  let kid = 0;
  const poly = (
    target: React.ReactNode[],
    arr: [number, number][],
    fill: string,
    stroke = "none",
    sw = 0,
  ) =>
    target.push(
      <polygon
        key={`p${kid++}`}
        points={ptsOf(arr)}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinejoin="round"
      />,
    );
  const line = (
    target: React.ReactNode[],
    a: [number, number],
    b: [number, number],
    stroke: string,
    sw: number,
  ) =>
    target.push(
      <line
        key={`l${kid++}`}
        x1={a[0].toFixed(1)}
        y1={a[1].toFixed(1)}
        x2={b[0].toFixed(1)}
        y2={b[1].toFixed(1)}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
      />,
    );

  const wallEls: React.ReactNode[] = [];
  poly(
    wallEls,
    [pt(0, 0, 0), pt(0, GY, 0), pt(0, GY, maxZ), pt(0, 0, maxZ)],
    WALL_BACK,
  );
  poly(
    wallEls,
    [pt(0, 0, 0), pt(GX, 0, 0), pt(GX, 0, maxZ), pt(0, 0, maxZ)],
    WALL_SIDE,
  );

  const drawRack = (
    target: React.ReactNode[],
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    zb: number,
  ) => {
    const zt = zb + shelfH;
    poly(
      target,
      [pt(x0, y0, zt), pt(x1, y0, zt), pt(x1, y1, zt), pt(x0, y1, zt)],
      SHELF_TOP,
      FACE_STK,
      0.5,
    );
    poly(
      target,
      [pt(x1, y0, zb), pt(x1, y1, zb), pt(x1, y1, zt), pt(x1, y0, zt)],
      SHELF_END,
      FACE_STK,
      0.5,
    );
    poly(
      target,
      [pt(x0, y1, zb), pt(x1, y1, zb), pt(x1, y1, zt), pt(x0, y1, zt)],
      SHELF_FRONT,
      FACE_STK,
      0.5,
    );
    const bw = (x1 - x0) / C;
    for (let i = 0; i < C; i++) {
      for (let kk = 0; kk < B; kk++) {
        const cx0 = x0 + i * bw + 0.07 * bw;
        const cx1 = x0 + (i + 1) * bw - 0.07 * bw;
        const cz0 = zb + kk * LH + 1.6;
        const cz1 = zb + (kk + 1) * LH - 1.6;
        poly(
          target,
          [
            pt(cx0, y1, cz0),
            pt(cx1, y1, cz0),
            pt(cx1, y1, cz1),
            pt(cx0, y1, cz1),
          ],
          ITEM,
          ITEM_STK,
          0.4,
        );
      }
    }
    for (let kk = 0; kk <= B; kk++) {
      line(
        target,
        pt(x0, y1, zb + kk * LH),
        pt(x1, y1, zb + kk * LH),
        "#aab4c0",
        0.6,
      );
    }
    const posts: [number, number][] = [
      [x0, y0],
      [x1, y0],
      [x0, y1],
      [x1, y1],
    ];
    for (let i = 1; i < C; i++) posts.push([x0 + i * bw, y1]);
    for (const [vx, vy] of posts)
      line(target, pt(vx, vy, zb), pt(vx, vy, zt), POST, 1.7);
  };

  const floorEls: React.ReactNode[][] = [];
  for (let f = 0; f < F; f++) {
    const base = f * floorH;
    const ST = 4;
    const fe: React.ReactNode[] = [];
    poly(
      fe,
      [pt(0, 0, base), pt(GX, 0, base), pt(GX, GY, base), pt(0, GY, base)],
      BLUE_TOP,
    );
    poly(
      fe,
      [
        pt(0, GY, base),
        pt(GX, GY, base),
        pt(GX, GY, base - ST),
        pt(0, GY, base - ST),
      ],
      BLUE_S1,
    );
    poly(
      fe,
      [
        pt(GX, 0, base),
        pt(GX, GY, base),
        pt(GX, GY, base - ST),
        pt(GX, 0, base - ST),
      ],
      BLUE_S2,
    );
    for (let r = 0; r < R; r++) {
      const y0 = M_BACK + r * (RD + AISLE);
      const y1 = y0 + RD;
      drawRack(fe, M_SIDE, GX - M_SIDE, y0, y1, base);
    }
    floorEls.push(fe);
  }

  const sig = `${F}-${R}-${C}-${B}`;

  return (
    <div className="flex flex-col items-center gap-3">
      <style>
        {"@keyframes wvFloorIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}" +
          ".wv-floor{animation:wvFloorIn .45s cubic-bezier(.22,.61,.36,1) both}" +
          "@media (prefers-reduced-motion:reduce){.wv-floor{animation:none}}"}
      </style>
      <svg
        key={sig}
        viewBox={`0 0 ${Math.ceil(W)} ${Math.ceil(H)}`}
        className="w-full max-w-[300px]"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Pratinjau gudang ${floors} lantai, ${rows} baris, ${columns} kolom, ${bins} rak`}
      >
        {wallEls}
        {floorEls.map((fe, i) => (
          <g
            key={i}
            className="wv-floor"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            {fe}
          </g>
        ))}
      </svg>

      <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-2xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-[3px]"
            style={{ background: BLUE_TOP }}
          />{" "}
          Lantai ({floors || 0})
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-[3px]"
            style={{ background: SHELF_END }}
          />{" "}
          Baris ({rows || 0})
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-[3px]"
            style={{ background: SHELF_FRONT }}
          />{" "}
          Kolom ({columns || 0})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[3px]" style={{ background: POST }} />{" "}
          Rak ({bins || 0})
        </span>
      </div>
    </div>
  );
}

type BinSkuEntry = {
  variantId: string;
  sku: string;
  name: string;
  onHand: number;
  reserved: number;
};

type BinRow = BinPreviewItem & {
  id: string;
  binId?: string;
  skus?: BinSkuEntry[];
  isNew?: boolean;
  isInbound?: boolean;
  allowsMultiSku?: boolean;
};

function CopyableSku({ sku }: { sku: string }) {
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sku);
      toast.success("SKU berhasil disalin");
    } catch {
      toast.error("Gagal menyalin SKU");
    }
  }, [sku]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-xl px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      aria-label={`Salin SKU ${sku}`}
    >
      <span className="truncate font-mono">{sku}</span>
      <CopyIcon className="size-3 opacity-70" />
    </button>
  );
}

interface IsiRakActions {
  onMove: (sku: BinSkuEntry) => void;
  onRemove: (sku: BinSkuEntry) => void;
  disabled?: boolean;
}

function SkuActions({
  sku,
  actions,
}: {
  sku: BinSkuEntry;
  actions: IsiRakActions;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => actions.onMove(sku)}
            disabled={actions.disabled}
            aria-label={`Pindah ${sku.sku} ke rak lain`}
          >
            <ArrowRightLeftIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Pindah ke rak lain</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
            onClick={() => actions.onRemove(sku)}
            disabled={actions.disabled}
            aria-label={`Keluarkan ${sku.sku} dari rak`}
          >
            <PackageMinusIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Keluarkan dari rak</TooltipContent>
      </Tooltip>
    </div>
  );
}

function AddSkuToBinButton({
  locationId,
  binId,
  binCode,
  stagedVariantIds,
  disabled,
  onAssign,
}: {
  locationId: string;
  binId: string;
  binCode: string;
  stagedVariantIds: Set<string>;
  disabled?: boolean;
  onAssign: (sku: PendingPutawaySku) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [rawQuery, setRawQuery] = React.useState("");
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const { data, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useEligibleSkusInfinite(locationId, binId, query, open);

  const pendingSkus = React.useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );

  const options: ComboboxOption[] = React.useMemo(() => {
    return pendingSkus
      .filter((s) => !stagedVariantIds.has(s.variantId))
      .map((s) => ({
        value: s.variantId,
        label: s.name,
        hint: s.sku,
        badgeLabel: s.sku,
        imageUrl: s.thumbnail ?? undefined,
      }));
  }, [pendingSkus, stagedVariantIds]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={disabled}
          className="h-6 px-2 text-2xs font-semibold gap-1 border-dashed border-primary/40 text-primary hover:border-primary hover:bg-primary/5 hover:text-primary transition-all rounded-lg shadow-2xs cursor-pointer"
        >
          <PlusIcon className="size-3" />
          <span>Tambah SKU</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[320px] p-3 shadow-2xl rounded-2xl border bg-popover space-y-2.5 z-50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <PlusIcon className="size-3.5 text-primary" />
            <span>Tambah SKU ke Rak {binCode}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setOpen(false)}
            className="size-5 rounded-md text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3" />
          </Button>
        </div>
        <Combobox
          options={options}
          value={null}
          placeholder="Cari SKU / nama produk..."
          searchPlaceholder="Ketik untuk mencari..."
          emptyText={
            isFetching && !isFetchingNextPage
              ? "Memuat data SKU..."
              : "Tidak ada SKU yang cocok"
          }
          onChange={(val) => {
            if (val) {
              const selected = pendingSkus.find((s) => s.variantId === val);
              if (selected) {
                onAssign(selected);
                setOpen(false);
              }
            }
          }}
          onQueryChange={setRawQuery}
          loading={isFetching && !isFetchingNextPage}
          onLoadMore={fetchNextPage}
          hasMore={hasNextPage}
          loadingMore={isFetchingNextPage}
          wrap
        />
        <p className="text-2xs text-muted-foreground leading-tight">
          Pilih produk/SKU untuk ditempatkan ke rak multi-SKU ini.
        </p>
      </PopoverContent>
    </Popover>
  );
}

function IsiRakCell({
  skus,
  actions,
  allowsMultiSku,
  binId,
  binCode,
  locationId,
  stagedVariantIds,
  disabled,
  onAssignSku,
}: {
  skus?: BinSkuEntry[];
  actions?: IsiRakActions;
  allowsMultiSku?: boolean;
  binId?: string;
  binCode?: string;
  locationId?: string;
  stagedVariantIds?: Set<string>;
  disabled?: boolean;
  onAssignSku?: (sku: PendingPutawaySku) => void;
}) {
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const safeSkus = React.useMemo(() => skus ?? [], [skus]);

  const filteredSkus = React.useMemo(() => {
    if (!searchQuery.trim()) return safeSkus;
    const q = searchQuery.toLowerCase();
    return safeSkus.filter(
      (s) =>
        s.sku.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
    );
  }, [safeSkus, searchQuery]);

  if (safeSkus.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const VISIBLE_LIMIT = 2;
  const visibleSkus = safeSkus.slice(0, VISIBLE_LIMIT);
  const hasMore = safeSkus.length > VISIBLE_LIMIT;
  const remainingCount = safeSkus.length - VISIBLE_LIMIT;

  return (
    <div className="flex flex-col gap-1.5">
      {visibleSkus.map((s) => (
        <div
          key={s.variantId}
          className="flex items-center justify-between gap-2 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors px-2 py-1 border border-border/40"
        >
          <div className="flex min-w-0 flex-col leading-tight">
            <span
              className="truncate text-xs font-medium text-foreground max-w-[200px]"
              title={s.name}
            >
              {s.name}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <CopyableSku sku={s.sku} />
              {s.onHand > 0 && (
                <span className="text-2xs text-muted-foreground font-medium">
                  • {s.onHand} pcs
                </span>
              )}
            </div>
          </div>
          {actions && <SkuActions sku={s} actions={actions} />}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
        {hasMore && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 transition-all shadow-2xs cursor-pointer group"
              >
                <BoxesIcon className="size-3 transition-transform group-hover:scale-110" />
                <span>+{remainingCount} SKU Lainnya</span>
                <ChevronDownIcon className="size-2.5 opacity-70" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[380px] p-0 shadow-2xl rounded-2xl border bg-popover z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b px-3.5 py-2.5 bg-muted/40">
                <div className="flex items-center gap-1.5">
                  <BoxesIcon className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Semua SKU di Rak {binCode || ""}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="text-2xs px-2 py-0 font-bold"
                >
                  {safeSkus.length} Total SKU
                </Badge>
              </div>

              <div className="p-2.5 border-b bg-background">
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari SKU atau nama produk..."
                    className="h-7.5 pl-8 text-xs rounded-lg"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <XIcon className="size-3" />
                    </button>
                  )}
                </div>
              </div>

              <ScrollArea className="max-h-[280px] p-2.5">
                {filteredSkus.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Tidak ada SKU yang cocok dengan pencarian
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {filteredSkus.map((s) => (
                      <div
                        key={s.variantId}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl border border-border/50 bg-background/80 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex min-w-0 flex-col leading-tight">
                          <span
                            className="truncate text-xs font-medium text-foreground max-w-[210px]"
                            title={s.name}
                          >
                            {s.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <CopyableSku sku={s.sku} />
                            {s.onHand > 0 && (
                              <Badge
                                variant="outline"
                                className="text-2xs px-1.5 py-0 h-4 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40"
                              >
                                Stok: {s.onHand}
                              </Badge>
                            )}
                            {s.reserved > 0 && (
                              <Badge
                                variant="outline"
                                className="text-2xs px-1.5 py-0 h-4 font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40"
                              >
                                Order: {s.reserved}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {actions && <SkuActions sku={s} actions={actions} />}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {allowsMultiSku && locationId && binId && onAssignSku && (
                <div className="p-2 border-t bg-muted/20 flex items-center justify-between">
                  <span className="text-2xs text-muted-foreground">
                    Rak ini mendukung multi-SKU
                  </span>
                  <AddSkuToBinButton
                    locationId={locationId}
                    binId={binId}
                    binCode={binCode || ""}
                    stagedVariantIds={stagedVariantIds ?? new Set()}
                    disabled={disabled}
                    onAssign={onAssignSku}
                  />
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}

        {allowsMultiSku && locationId && binId && onAssignSku && (
          <AddSkuToBinButton
            locationId={locationId}
            binId={binId}
            binCode={binCode || ""}
            stagedVariantIds={stagedVariantIds ?? new Set()}
            disabled={disabled}
            onAssign={onAssignSku}
          />
        )}
      </div>
    </div>
  );
}

const DEBOUNCE_MS = 300;

function BinSkuAssignCell({
  locationId,
  binId,
  staged,
  stagedVariantIds,
  disabled,
  onChange,
}: {
  locationId: string;
  binId: string;
  staged: PendingPutawaySku | null;
  stagedVariantIds: Set<string>;
  disabled?: boolean;
  onChange: (sku: PendingPutawaySku | null) => void;
}) {
  const [rawQuery, setRawQuery] = React.useState("");
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const { data, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useEligibleSkusInfinite(locationId, binId, query);

  const pendingSkus = React.useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );

  const options: ComboboxOption[] = React.useMemo(() => {
    const opts = pendingSkus
      .filter(
        (s) =>
          s.variantId === staged?.variantId ||
          !stagedVariantIds.has(s.variantId),
      )
      .map((s) => ({
        value: s.variantId,
        label: s.name,
        hint: s.sku,
        badgeLabel: s.sku,
        imageUrl: s.thumbnail ?? undefined,
      }));

    if (staged && !opts.find((o) => o.value === staged.variantId)) {
      opts.push({
        value: staged.variantId,
        label: staged.name,
        hint: staged.sku,
        badgeLabel: staged.sku,
        imageUrl: staged.thumbnail ?? undefined,
      });
    }

    return opts;
  }, [pendingSkus, stagedVariantIds, staged]);

  return (
    <div className="min-w-[260px] max-w-[340px] space-y-1">
      <Combobox
        options={options}
        value={staged?.variantId ?? null}
        onChange={(val) => {
          if (!val) onChange(null);
          else {
            const found =
              pendingSkus.find((s) => s.variantId === val) || staged;
            onChange(found || null);
          }
        }}
        onQueryChange={setRawQuery}
        loading={isFetching && !isFetchingNextPage}
        onLoadMore={fetchNextPage}
        hasMore={hasNextPage}
        loadingMore={isFetchingNextPage}
        placeholder="Pilih SKU..."
        searchPlaceholder="Cari SKU / nama"
        emptyText={
          isFetching && !isFetchingNextPage ? "Memuat…" : "Tidak ada SKU valid."
        }
        disabled={disabled}
        wrap
      />
      {staged && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <Badge variant="outline" className="font-mono bg-background">
            {staged.sku}
          </Badge>
          <span className="truncate flex-1">{staged.name}</span>
        </div>
      )}
    </div>
  );
}

function MoveSkuDialog({
  open,
  onOpenChange,
  locationId,
  sourceBinId,
  sourceBinCode,
  sku,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  sourceBinId: string;
  sourceBinCode: string;
  sku: BinSkuEntry | null;
  pending?: boolean;
  onConfirm: (destinationBinId: string) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [destId, setDestId] = React.useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const candidatesQuery = useLocationBinsInfinite(
    open ? locationId : undefined,
    { search: debouncedSearch || undefined, perPage: 20 },
  );

  const options: ComboboxOption[] = React.useMemo(() => {
    const items = candidatesQuery.data?.pages.flatMap((p) => p.items) ?? [];
    return items
      .filter((b) => {
        if (b.id === sourceBinId || b.isInbound) return false;
        const occupied = (b.skus?.length ?? 0) > 0;

        return b.allowsMultiSku || !occupied;
      })
      .map((b) => {
        const count = b.skus?.length ?? 0;
        return {
          value: b.id,
          label: b.binFinalCode,
          hint: b.allowsMultiSku
            ? count > 0
              ? `Multi-SKU · berisi ${count} SKU`
              : "Multi-SKU · kosong"
            : undefined,
        };
      });
  }, [candidatesQuery.data, sourceBinId]);

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pindah SKU ke rak lain</DialogTitle>
          <DialogClose />
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {sku && (
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{sku.name}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {sku.sku}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Dari rak <span className="font-mono">{sourceBinCode}</span> ·{" "}
                {sku.onHand.toLocaleString("id-ID")} pcs akan dipindah
                seluruhnya
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Rak tujuan</Label>
            <Combobox
              options={options}
              value={destId}
              onChange={setDestId}
              onQueryChange={setSearch}
              loading={candidatesQuery.isLoading}
              onLoadMore={() => candidatesQuery.fetchNextPage()}
              hasMore={candidatesQuery.hasNextPage}
              loadingMore={candidatesQuery.isFetchingNextPage}
              placeholder="Pilih rak tujuan"
              searchPlaceholder="Cari kode rak"
              emptyText={
                candidatesQuery.isLoading
                  ? "Memuat…"
                  : "Tidak ada rak yang cocok."
              }
            />
            <p className="text-2xs text-muted-foreground">
              Rak kosong, atau rak multi-SKU yang boleh menampung lebih dari
              satu SKU. Stok pindah utuh dalam satu proses (tanpa penyesuaian
              manual).
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={() => destId && onConfirm(destId)}
            disabled={!destId || pending}
          >
            {pending && <Loader2Icon className="mr-2 size-3.5 animate-spin" />}
            Pindahkan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const NEW_ZONE_VALUE = "__new__";

let binRowSeq = 0;
function clientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `bin-${Date.now()}-${binRowSeq++}`;
}

function toRow(item: BinDraft): BinRow {
  return { ...item, id: clientId(), binId: item.id };
}

function toNewRow(item: BinPreviewItem): BinRow {
  return { ...item, id: clientId(), isNew: true };
}

function toDraft(row: BinRow): BinDraft {
  const { id: __clientId, binId, isNew: __isNew, ...rest } = row;
  return { ...rest, id: binId };
}

function SortableHeader({
  label,
  field,
  currentSort,
  onSort,
}: {
  label: string;
  field: string;
  currentSort: string | undefined;
  onSort: (sort: string | undefined) => void;
}) {
  const isActive = currentSort === field || currentSort === `-${field}`;
  const isDesc = currentSort === `-${field}`;

  const handleClick = () => {
    if (!isActive) onSort(field);
    else if (!isDesc) onSort(`-${field}`);
    else onSort(undefined);
  };

  return (
    <button
      type="button"
      className="flex items-center gap-1 text-left font-medium text-muted-foreground hover:text-foreground"
      onClick={handleClick}
    >
      {label}
      {!isActive && <ArrowUpDownIcon className="size-3 opacity-60" />}
      {isActive && !isDesc && <ArrowUpIcon className="size-3" />}
      {isActive && isDesc && <ArrowDownIcon className="size-3" />}
    </button>
  );
}

interface LayoutGudangTabProps {
  disabled?: boolean;
  locationId?: string;
  locationCode?: string;
  isSmallWarehouse?: boolean;
  initialBins?: BinDraft[];
  onApply: (payload: GenerateBinsPayload | null) => void;

  onBinsChange?: (bins: BinDraft[]) => void;
  onAssignmentsChange?: (assignments: BinSkuAssignment[]) => void;
}

export function LayoutGudangTab({
  disabled = false,
  locationId,
  locationCode: _locationCode,
  isSmallWarehouse: isSmallWarehouseProp,
  initialBins,
  onApply,
  onBinsChange,
  onAssignmentsChange,
}: LayoutGudangTabProps) {
  const serverMode = !!locationId;
  const isSmallWarehouse = serverMode && Boolean(isSmallWarehouseProp);

  const [zoneCode, setZoneCode] = React.useState("");
  const [zoneIsNew, setZoneIsNew] = React.useState(false);
  const [rowCode, setRowCode] = React.useState("B");
  const [columnCode, setColumnCode] = React.useState("K");
  const [binCode, setBinCode] = React.useState("R");
  const [qtyRow, setQtyRow] = React.useState("");
  const [qtyColumn, setQtyColumn] = React.useState("");
  const [qtyBin, setQtyBin] = React.useState("");

  const [localBins, setLocalBins] = React.useState<BinRow[]>(() =>
    serverMode ? [] : (initialBins ?? []).map(toRow),
  );

  const [pendingBins, setPendingBins] = React.useState<BinRow[]>([]);

  const [assignMap, setAssignMap] = React.useState<
    Map<string, PendingPutawaySku>
  >(() => new Map());

  const [editedMap, setEditedMap] = React.useState<Map<string, BinDraft>>(
    () => new Map(),
  );

  const list = useListState<Record<string, never>>(
    {},
    { perPage: 50, debounceMs: 300, namespace: "layout" },
  );
  const sort = list.sorting.length
    ? `${list.sorting[0].desc ? "-" : ""}${list.sorting[0].id}`
    : undefined;
  const handleSortChange = (next: string | undefined) => {
    if (!next) list.setSorting([]);
    else if (next.startsWith("-"))
      list.setSorting([{ id: next.slice(1), desc: true }]);
    else list.setSorting([{ id: next, desc: false }]);
    list.resetPage();
  };
  const filter: BinListParams["filter"] = { is_inbound: false };
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [selectAllAcrossPages, setSelectAllAcrossPages] = React.useState(false);
  const [uniformOpen, setUniformOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [paperSize, setPaperSize] =
    React.useState<BinQrPaper>(BIN_QR_PAPER_DEFAULT);

  const params: BinListParams = {
    page: list.page,
    perPage: list.perPage,
    search: list.debouncedSearch || undefined,
    sort,
    filter,
  };

  const binsQuery = useLocationBins(locationId, params);
  const uniformMut = useUniformApplyBins(locationId);
  const moveSkuMut = useMoveSkuBin(locationId);
  const removeSkuMut = useRemoveSkuBin(locationId);

  const [moveTarget, setMoveTarget] = React.useState<{
    binId: string;
    binCode: string;
    sku: BinSkuEntry;
  } | null>(null);
  const [removeTarget, setRemoveTarget] = React.useState<{
    binId: string;
    binCode: string;
    sku: BinSkuEntry;
  } | null>(null);

  const handleConfirmMove = (destinationBinId: string) => {
    if (!moveTarget) return;
    moveSkuMut.mutate(
      {
        sourceBinId: moveTarget.binId,
        itemId: moveTarget.sku.variantId,
        destinationBinId,
      },
      { onSuccess: () => setMoveTarget(null) },
    );
  };

  const handleConfirmRemove = () => {
    if (!removeTarget) return;
    removeSkuMut.mutate(
      { binId: removeTarget.binId, itemId: removeTarget.sku.variantId },
      { onSuccess: () => setRemoveTarget(null) },
    );
  };

  const removeDescription = removeTarget
    ? removeTarget.sku.onHand > 0
      ? `Sistem membuat dokumen Koreksi Stok untuk menurunkan ${removeTarget.sku.onHand.toLocaleString("id-ID")} pcs "${removeTarget.sku.sku}" di rak ${removeTarget.binCode} menjadi 0, lalu rak dikosongkan. Dokumen tercatat di Transaksi Stok › Koreksi Stok. Kalau stok masih terpakai, gunakan Pindah.`
      : `SKU "${removeTarget.sku.sku}" akan dikeluarkan dari rak ${removeTarget.binCode}. Stok fisik sudah 0, jadi tidak ada koreksi stok.`
    : "";
  const stagedVariantIds = React.useMemo(
    () => new Set(Array.from(assignMap.values()).map((s) => s.variantId)),
    [assignMap],
  );

  const assignBinSku = useAssignBinSku(locationId);

  const handleAssignChange = React.useCallback(
    (binId: string, sku: PendingPutawaySku | null) => {
      setAssignMap((prev) => {
        const next = new Map(prev);
        if (!sku) {
          next.delete(binId);
        } else {
          next.set(binId, sku);
        }
        return next;
      });
    },
    [],
  );

  const handleDirectOrStagedAssign = React.useCallback(
    async (binId: string, binCode: string, sku: PendingPutawaySku) => {
      if (serverMode && locationId) {
        try {
          await assignBinSku.mutateAsync({ binId, itemId: sku.variantId });
          toast.success(
            `SKU "${sku.sku}" berhasil ditambahkan ke rak ${binCode}.`,
          );
        } catch (error) {
          apiError(error, "Gagal menambahkan SKU ke rak.");
        }
      } else {
        handleAssignChange(binId, sku);
        toast.success(`SKU "${sku.sku}" ditambahkan ke rak.`);
      }
    },
    [serverMode, locationId, assignBinSku, handleAssignChange],
  );

  const onAssignmentsChangeRef = React.useRef(onAssignmentsChange);
  React.useEffect(() => {
    onAssignmentsChangeRef.current = onAssignmentsChange;
  });
  React.useEffect(() => {
    const items: BinSkuAssignment[] = Array.from(assignMap.entries()).map(
      ([binId, sku]) => ({ binId, itemId: sku.variantId }),
    );
    onAssignmentsChangeRef.current?.(items);
  }, [assignMap]);

  const { data: zonesData } = useZones(locationId);
  const zoneSelectOptions = React.useMemo(
    () =>
      (zonesData ?? []).map((z) => ({
        value: z.id,
        label: z.zone_name || z.zone_code,
      })),
    [zonesData],
  );
  const zoneCodeOptions = React.useMemo(
    () =>
      Array.from(
        new Set((zonesData ?? []).map((z) => z.zone_code).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [zonesData],
  );

  const onBinsChangeRef = React.useRef(onBinsChange);
  React.useEffect(() => {
    onBinsChangeRef.current = onBinsChange;
  });
  React.useEffect(() => {
    if (serverMode) {
      // Keep complete snapshots of edited rows. Looking up a row only in the
      // current page used to discard edits after pagination or a new search.
      onBinsChangeRef.current?.(Array.from(editedMap.values()));
    } else {
      onBinsChangeRef.current?.(localBins.map(toDraft));
    }
  }, [serverMode, localBins, editedMap, binsQuery.data]);

  function handleGenerate() {
    const zone = zoneCode.trim();
    if (!zone) {
      toast.error("Kode zona wajib diisi.");
      return;
    }

    const payload: GenerateBinsPayload = {
      zone_code: zone,
      row_code: rowCode || "B",
      qty_row: Number.parseInt(qtyRow, 10) || 0,
      column_code: columnCode || "K",
      qty_column: Number.parseInt(qtyColumn, 10) || 0,
      bin_code: binCode || "R",
      qty_bin: Number.parseInt(qtyBin, 10) || 0,
    };

    if (payload.qty_row < 1 || payload.qty_column < 1 || payload.qty_bin < 1) {
      toast.error("Jumlah baris, kolom, dan rak minimal 1.");
      return;
    }

    const total = binCombinationCount(payload);
    if (total > MAX_BIN_COMBINATIONS) {
      toast.error(
        `Maksimum kombinasi rak adalah ${MAX_BIN_COMBINATIONS}. Anda mencoba membuat ${total}.`,
      );
      return;
    }

    const generated = buildBinPreview(payload).map(toNewRow);
    if (serverMode) {
      setPendingBins(generated);
      list.resetPage();
    } else {
      setLocalBins(generated);
    }
    onApply(payload);
    toast.success(
      serverMode
        ? `${total} kombinasi rak baru muncul sebagai pratinjau. Klik Simpan untuk menambah ke gudang.`
        : `${total} kombinasi rak siap disimpan.`,
    );
  }

  const clearPending = () => {
    setPendingBins([]);
    onApply(null);
  };

  const updateLocalBin = (
    id: string,
    field: keyof BinPreviewItem,
    value: unknown,
  ) => {
    setLocalBins((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
    );
  };

  const patchEdit = (
    row: BinRow,
    field: keyof BinPreviewItem,
    value: unknown,
  ) => {
    setEditedMap((prev) => {
      const next = new Map(prev);
      const existing = next.get(row.id) ?? toDraft(row);
      next.set(row.id, { ...existing, [field]: value });
      return next;
    });
  };

  const serverRows: BinRow[] = serverMode
    ? (binsQuery.data?.items ?? []).map((row) => {
        const patch = editedMap.get(row.id);
        return {
          id: row.id,
          binId: row.id,
          floorCode: row.floorCode ?? "",
          rowCode: row.rowCode ?? "",
          columnCode: row.columnCode ?? "",
          binCode: row.binCode ?? "",
          binFinalCode: patch?.binFinalCode ?? row.binFinalCode,
          isStockAcknowledged:
            patch?.isStockAcknowledged ?? row.isStockAcknowledged,
          isLargeBin: patch?.isLargeBin ?? row.isLargeBin,
          isInbound: row.isInbound,
          allowsMultiSku: row.allowsMultiSku,
          skus: row.skus,
        };
      })
    : [];

  const pendingVisible: BinRow[] =
    serverMode && list.page === 1
      ? list.debouncedSearch
        ? pendingBins.filter((b) =>
            b.binFinalCode
              .toLowerCase()
              .includes(list.debouncedSearch.toLowerCase()),
          )
        : pendingBins
      : [];

  const pageItems: BinRow[] = serverMode
    ? [...pendingVisible, ...serverRows]
    : list.debouncedSearch
      ? localBins.filter((b) =>
          b.binFinalCode
            .toLowerCase()
            .includes(list.debouncedSearch.toLowerCase()),
        )
      : localBins;

  const meta = binsQuery.data?.meta;
  const totalAll = serverMode ? (meta?.total ?? 0) : localBins.length;
  const lastPage = serverMode ? (meta?.last_page ?? 1) : 1;

  const pageIds = pageItems.filter((b) => !b.isNew).map((b) => b.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  const togglePageAll = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
      setSelectAllAcrossPages(false);
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (selectAllAcrossPages) setSelectAllAcrossPages(false);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectAllAcrossPages(false);
  };

  const deleteLocalBin = (id: string) => {
    setLocalBins((prev) => prev.filter((b) => b.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const deleteLocalSelected = () => {
    setLocalBins((prev) => prev.filter((b) => !selectedIds.has(b.id)));
    clearSelection();
  };

  const handleUniformApplyLocal = (values: {
    isStockAcknowledged: boolean;
    isLargeBin: boolean;
    zoneId: string;
  }) => {
    setLocalBins((prev) =>
      prev.map((b) =>
        selectedIds.has(b.id)
          ? {
              ...b,
              isStockAcknowledged: values.isStockAcknowledged,
              isLargeBin: values.isLargeBin,
            }
          : b,
      ),
    );
    clearSelection();
    setUniformOpen(false);
    toast.success("Pengaturan rak terpilih diseragamkan.");
  };

  const handleUniformApplyServer = async (values: {
    isStockAcknowledged: boolean;
    isLargeBin: boolean;
    zoneId: string;
  }) => {
    if (selectedIds.size === 0 && !selectAllAcrossPages) {
      toast.error("Pilih minimal satu rak.");
      return;
    }
    try {
      await uniformMut.mutateAsync({
        scope: selectAllAcrossPages ? "all" : "selected",
        ids: selectAllAcrossPages ? undefined : Array.from(selectedIds),
        values: {
          is_stock_acknowledged: values.isStockAcknowledged,
          is_large_bin: values.isLargeBin,
          zone_id: values.zoneId || null,
        },
        search: selectAllAcrossPages
          ? list.debouncedSearch || undefined
          : undefined,
        filter: selectAllAcrossPages ? filter : undefined,
      });
      clearSelection();
      setUniformOpen(false);
    } catch {}
  };

  const handleUniformApply = serverMode
    ? handleUniformApplyServer
    : handleUniformApplyLocal;

  const canPrintQr = serverMode && Boolean(locationId);

  const openQrPreview = (binIds: string[]) => {
    if (!canPrintQr || !locationId) return;
    const params = new URLSearchParams({ paper: paperSize });

    const cleanIds = binIds.filter(
      (s) => typeof s === "string" && s.length > 0,
    );
    if (cleanIds.length > 0) params.set("bin_ids", cleanIds.join(","));
    const url = `/dashboard/document-preview/bin-qr/${locationId}?${params.toString()}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const printQrSelected = () => {
    if (selectAllAcrossPages) {
      openQrPreview([]);
      return;
    }
    if (selectedIds.size === 0) {
      toast.error("Pilih minimal satu rak.");
      return;
    }
    openQrPreview(Array.from(selectedIds));
  };

  const printQrAll = () => openQrPreview([]);

  const selectionScopeLabel = selectAllAcrossPages
    ? `semua ${totalAll} rak`
    : `${selectedIds.size} rak terpilih`;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Zona
                <span className="text-destructive"> *</span>
              </Label>
              {zoneIsNew ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={zoneCode}
                    onChange={(e) => setZoneCode(e.target.value)}
                    disabled={disabled}
                    maxLength={20}
                    placeholder="mis. IN, O, GK"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setZoneIsNew(false);
                      setZoneCode("");
                    }}
                    disabled={disabled}
                  >
                    Batal
                  </Button>
                </div>
              ) : (
                <Select
                  value={zoneCode}
                  onValueChange={(v) => {
                    if (v === NEW_ZONE_VALUE) {
                      setZoneIsNew(true);
                      setZoneCode("");
                      return;
                    }
                    setZoneCode(v);
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih zona" />
                  </SelectTrigger>
                  <SelectContent>
                    {zoneCodeOptions.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                    <SelectItem value={NEW_ZONE_VALUE}>+ Zona baru…</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Contoh kode</Label>
              <p className="pt-2 font-mono text-xs text-muted-foreground">
                {`${zoneCode.trim() || "ZONA"}-${rowCode || "B"}1-${columnCode || "K"}1-${binCode || "R"}1`}
              </p>
            </div>
          </div>
          <DimensionRow
            label="Baris"
            qty={qtyRow}
            code={rowCode}
            onQty={setQtyRow}
            onCode={setRowCode}
            disabled={disabled}
          />
          <DimensionRow
            label="Kolom"
            qty={qtyColumn}
            code={columnCode}
            onQty={setQtyColumn}
            onCode={setColumnCode}
            disabled={disabled}
          />
          <DimensionRow
            label="Rak"
            qty={qtyBin}
            code={binCode}
            onQty={setQtyBin}
            onCode={setBinCode}
            disabled={disabled}
          />

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleGenerate}
                disabled={disabled}
              >
                Buat
              </Button>
              {serverMode && locationId && (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setImportOpen(true)}
                  disabled={disabled}
                >
                  <UploadIcon className="size-4" />
                  Import Excel
                </Button>
              )}
            </div>
            <p className="mt-2 text-xs text-destructive">
              * Maksimum kombinasi rak adalah{" "}
              {MAX_BIN_COMBINATIONS.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-start justify-center">
          <WarehouseVisual
            floors={qtyRow || qtyColumn || qtyBin ? 1 : 0}
            rows={Number.parseInt(qtyRow, 10) || 0}
            columns={Number.parseInt(qtyColumn, 10) || 0}
            bins={Number.parseInt(qtyBin, 10) || 0}
          />
        </div>
      </div>

      {isSmallWarehouse && (
        <MultiSkuRulesCard locationId={locationId} disabled={disabled} />
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
              placeholder="Cari kode rak atau SKU"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              Total
              <Badge>{totalAll.toLocaleString("id-ID")}</Badge>
              {serverMode && pendingBins.length > 0 && (
                <Badge variant="outline" className="gap-1 text-primary">
                  <SparklesIcon className="size-3" />+
                  {pendingBins.length.toLocaleString("id-ID")} baru
                </Badge>
              )}
            </span>
            {canPrintQr && totalAll > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">
                    Ukuran QR:
                  </Label>
                  <Select
                    value={paperSize}
                    onValueChange={(v) => setPaperSize(v as BinQrPaper)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-9 w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAPER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={printQrAll}
                  disabled={disabled}
                >
                  <PrinterIcon className="size-4" />
                  Cetak Semua QR
                </Button>
              </>
            )}
          </div>
        </div>

        {serverMode && binsQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
            <Loader2Icon className="size-4 animate-spin" />
          </div>
        ) : pageItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            Belum ada data rak.
          </div>
        ) : (
          <div className="rounded-2xl border border-border">
            <Table className="min-w-[960px] border-collapse">
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40">
                  <TableHead className="w-10 px-3 py-3">
                    <Checkbox
                      checked={
                        allPageSelected
                          ? true
                          : somePageSelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={togglePageAll}
                      disabled={disabled}
                    />
                  </TableHead>
                  <TableHead className="px-3 py-3 text-left">
                    <SortableHeader
                      label="Kode Rak"
                      field="bin_final_code"
                      currentSort={sort}
                      onSort={handleSortChange}
                    />
                  </TableHead>
                  <TableHead className="px-3 py-3 text-left font-medium text-muted-foreground">
                    Isi Rak
                  </TableHead>
                  <TableHead className="px-3 py-3 text-center font-medium text-muted-foreground">
                    Akui Stok
                  </TableHead>
                  <TableHead className="px-3 py-3 text-center font-medium text-muted-foreground">
                    Gudang Besar
                  </TableHead>
                  <TableHead className="w-24 px-3 py-3" />
                </TableRow>

                {serverMode &&
                  allPageSelected &&
                  !selectAllAcrossPages &&
                  totalAll > pageIds.length && (
                    <TableRow className="border-b border-primary/20 bg-primary/5">
                      <TableCell
                        colSpan={6}
                        className="px-3 py-2 text-center text-sm"
                      >
                        Memilih {pageIds.length} rak di halaman ini.{" "}
                        <button
                          type="button"
                          className="font-medium text-primary underline"
                          onClick={() => setSelectAllAcrossPages(true)}
                        >
                          Pilih semua {totalAll.toLocaleString("id-ID")} rak.
                        </button>
                      </TableCell>
                    </TableRow>
                  )}
                {serverMode && selectAllAcrossPages && (
                  <TableRow className="border-b border-primary/20 bg-primary/5">
                    <TableCell
                      colSpan={6}
                      className="px-3 py-2 text-center text-sm"
                    >
                      Memilih semua {totalAll.toLocaleString("id-ID")} rak.{" "}
                      <button
                        type="button"
                        className="font-medium text-primary underline"
                        onClick={clearSelection}
                      >
                        Batalkan.
                      </button>
                    </TableCell>
                  </TableRow>
                )}

                {(selectedIds.size > 0 || selectAllAcrossPages) && (
                  <TableRow className="border-b border-primary/20 bg-primary/5">
                    <TableCell colSpan={6} className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={allPageSelected ? true : "indeterminate"}
                          onCheckedChange={togglePageAll}
                        />
                        <span className="text-sm font-medium">
                          {selectionScopeLabel}
                        </span>
                        {!serverMode && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            onClick={deleteLocalSelected}
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setUniformOpen(true)}
                        >
                          Seragamkan
                        </Button>
                        {canPrintQr && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={printQrSelected}
                            disabled={disabled}
                          >
                            <PrinterIcon className="size-4" />
                            Cetak QR
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableHeader>
              <TableBody>
                {pageItems.map((b) => {
                  const isPending = serverMode && b.isNew === true;
                  const isSelected =
                    !isPending &&
                    (selectedIds.has(b.id) || selectAllAcrossPages);
                  return (
                    <TableRow
                      key={b.id}
                      className={cn(
                        "border-b border-border/60 last:border-0",
                        (isSelected || isPending) && "bg-primary/5",
                      )}
                    >
                      <TableCell className="px-3 py-2.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOne(b.id)}
                          disabled={
                            disabled || selectAllAcrossPages || isPending
                          }
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Input
                            value={b.binFinalCode}
                            onChange={(e) =>
                              serverMode && b.binId
                                ? patchEdit(b, "binFinalCode", e.target.value)
                                : updateLocalBin(
                                    b.id,
                                    "binFinalCode",
                                    e.target.value,
                                  )
                            }
                            disabled={disabled || isPending}
                            placeholder="Kode rak"
                            className="h-9 max-w-[200px]"
                          />
                          {b.isNew && (
                            <Badge className="shrink-0 gap-1 px-2 py-0.5 text-2xs">
                              <SparklesIcon className="size-3" />
                              Baru
                            </Badge>
                          )}
                          {b.allowsMultiSku && <MultiSkuBadge />}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 align-top">
                        {b.skus && b.skus.length > 0 ? (
                          <IsiRakCell
                            skus={b.skus}
                            allowsMultiSku={b.allowsMultiSku}
                            binId={b.binId}
                            binCode={b.binFinalCode}
                            locationId={locationId}
                            stagedVariantIds={stagedVariantIds}
                            disabled={
                              disabled || isPending || assignBinSku.isPending
                            }
                            onAssignSku={
                              isSmallWarehouse &&
                              b.binId &&
                              !isPending &&
                              !b.isInbound
                                ? (sku) =>
                                    handleDirectOrStagedAssign(
                                      b.binId!,
                                      b.binFinalCode,
                                      sku,
                                    )
                                : undefined
                            }
                            actions={
                              isSmallWarehouse &&
                              b.binId &&
                              !isPending &&
                              !b.isInbound
                                ? {
                                    onMove: (sku) =>
                                      setMoveTarget({
                                        binId: b.binId!,
                                        binCode: b.binFinalCode,
                                        sku,
                                      }),
                                    onRemove: (sku) =>
                                      setRemoveTarget({
                                        binId: b.binId!,
                                        binCode: b.binFinalCode,
                                        sku,
                                      }),
                                    disabled:
                                      disabled || assignBinSku.isPending,
                                  }
                                : undefined
                            }
                          />
                        ) : isSmallWarehouse && b.binId && !isPending ? (
                          <BinSkuAssignCell
                            locationId={locationId}
                            binId={b.binId}
                            staged={assignMap.get(b.binId) ?? null}
                            stagedVariantIds={stagedVariantIds}
                            disabled={disabled || assignBinSku.isPending}
                            onChange={(sku) => {
                              if (sku) {
                                handleDirectOrStagedAssign(
                                  b.binId!,
                                  b.binFinalCode,
                                  sku,
                                );
                              } else {
                                handleAssignChange(b.binId!, null);
                              }
                            }}
                          />
                        ) : (
                          <IsiRakCell
                            skus={b.skus}
                            allowsMultiSku={b.allowsMultiSku}
                            binId={b.binId}
                            binCode={b.binFinalCode}
                            locationId={locationId}
                            stagedVariantIds={stagedVariantIds}
                            disabled={disabled || assignBinSku.isPending}
                            onAssignSku={
                              isSmallWarehouse &&
                              b.binId &&
                              !isPending &&
                              !b.isInbound
                                ? (sku) =>
                                    handleDirectOrStagedAssign(
                                      b.binId!,
                                      b.binFinalCode,
                                      sku,
                                    )
                                : undefined
                            }
                          />
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-center">
                        <Switch
                          checked={b.isStockAcknowledged}
                          onCheckedChange={(v) =>
                            serverMode && b.binId
                              ? patchEdit(b, "isStockAcknowledged", v)
                              : updateLocalBin(b.id, "isStockAcknowledged", v)
                          }
                          disabled={disabled || isPending}
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-center">
                        <Switch
                          checked={b.isLargeBin}
                          onCheckedChange={(v) =>
                            serverMode && b.binId
                              ? patchEdit(b, "isLargeBin", v)
                              : updateLocalBin(b.id, "isLargeBin", v)
                          }
                          disabled={disabled || isPending}
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {canPrintQr && b.binId && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => openQrPreview([b.binId!])}
                                  aria-label="Cetak QR Rak"
                                  disabled={disabled}
                                >
                                  <PrinterIcon className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cetak QR Rak</TooltipContent>
                            </Tooltip>
                          )}
                          {!disabled && !serverMode && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteLocalBin(b.id)}
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {serverMode && lastPage > 1 && (
              <div className="border-t border-border px-3 py-2">
                <SimplePagination
                  page={list.page}
                  lastPage={lastPage}
                  onPageChange={list.setPage}
                  perPage={list.perPage}
                  onPerPageChange={(pp) => {
                    list.setPerPage(pp);
                    list.resetPage();
                  }}
                  pageSizeOptions={[...PER_PAGE_OPTIONS]}
                  total={totalAll}
                  isFetching={binsQuery.isFetching}
                />
              </div>
            )}
          </div>
        )}

        {serverMode && pendingBins.length > 0 && (
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <SparklesIcon className="size-3.5 text-primary" />
            {pendingBins.length.toLocaleString("id-ID")} kombinasi rak baru
            ditandai <strong>Baru</strong> dan belum disimpan. Klik{" "}
            <strong>Simpan</strong> untuk menambah ke gudang.
            <button
              type="button"
              className="font-medium text-primary underline"
              onClick={clearPending}
              disabled={disabled}
            >
              Batalkan
            </button>
          </p>
        )}

        {serverMode && editedMap.size > 0 && (
          <p className="text-xs text-muted-foreground">
            {editedMap.size} rak diubah belum disimpan. Klik{" "}
            <strong>Simpan</strong> di atas untuk menerapkan.
          </p>
        )}

        {isSmallWarehouse && assignMap.size > 0 && (
          <p className="text-xs text-muted-foreground">
            {assignMap.size} SKU akan ditempatkan ke rak kosong. Klik{" "}
            <strong>Simpan</strong> untuk menjalankan penempatan (putaway).
          </p>
        )}
      </div>

      <UniformDialog
        open={uniformOpen}
        onOpenChange={setUniformOpen}
        onApply={handleUniformApply}
        pending={uniformMut.isPending}
        scopeLabel={selectionScopeLabel}
        zoneOptions={zoneSelectOptions}
      />

      {isSmallWarehouse && locationId && (
        <MoveSkuDialog
          key={
            moveTarget
              ? `${moveTarget.binId}:${moveTarget.sku.variantId}`
              : "closed"
          }
          open={!!moveTarget}
          onOpenChange={(o) => {
            if (!o) setMoveTarget(null);
          }}
          locationId={locationId}
          sourceBinId={moveTarget?.binId ?? ""}
          sourceBinCode={moveTarget?.binCode ?? ""}
          sku={moveTarget?.sku ?? null}
          pending={moveSkuMut.isPending}
          onConfirm={handleConfirmMove}
        />
      )}

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => {
          if (!o) setRemoveTarget(null);
        }}
        title="Keluarkan SKU dari rak?"
        description={removeDescription}
        confirmLabel="Keluarkan"
        variant="destructive"
        loading={removeSkuMut.isPending}
        onConfirm={handleConfirmRemove}
      />

      {serverMode && locationId && (
        <ImportBinsDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          locationId={locationId}
        />
      )}
    </div>
  );
}
