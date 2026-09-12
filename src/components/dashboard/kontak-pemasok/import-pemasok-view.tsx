"use client";

import { useState, useRef, useCallback } from "react";
import {
  UploadIcon,
  FileSpreadsheetIcon,
  CheckCircle2Icon,
  XCircleIcon,
  SaveIcon,
  AlertTriangleIcon,
  FileDownIcon,
  Loader2Icon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  useValidateImport,
  useSaveImport,
  useDownloadImportTemplate,
} from "@/hooks/kontak-pemasok/use-contact-import";
import type {
  ImportValidateResult,
  ImportValidRow,
  ImportInvalidRow,
} from "@/types/kontak-pemasok/import";

type ViewTab = "valid" | "invalid";

const COLUMNS = [
  "Nama",
  "Tipe",
  "PKP/Non PKP",
  "NPWP",
  "NIK",
  "Kategori",
  "Termin",
  "No. Telepon",
  "Email",
  "Detail Alamat",
  "Provinsi",
  "Kota",
  "Kecamatan",
  "Kelurahan",
] as const;

interface ImportPemasokDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportPemasokDialog({
  open,
  onOpenChange,
}: ImportPemasokDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportValidateResult | null>(null);
  const [tab, setTab] = useState<ViewTab>("valid");

  const validateMut = useValidateImport();
  const saveMut = useSaveImport();
  const downloadTemplate = useDownloadImportTemplate();

  const handleReset = useCallback(() => {
    setFile(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleClose = useCallback(
    (v: boolean) => {
      if (!v) handleReset();
      onOpenChange(v);
    },
    [onOpenChange, handleReset],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setFile(f);
      setResult(null);
    },
    [],
  );

  const handleImport = useCallback(() => {
    if (!file) return;
    validateMut.mutate(file, {
      onSuccess: (data) => {
        setResult(data);
        setTab(data.invalid_count > 0 ? "invalid" : "valid");
      },
    });
  }, [file, validateMut]);

  const handleSave = useCallback(() => {
    if (!result || result.valid_count === 0) return;
    saveMut.mutate(result.valid, {
      onSuccess: () => handleClose(false),
    });
  }, [result, saveMut, handleClose]);

  const showUploadStep = !result;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          "flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0",
          result
            ? "h-[min(90vh,860px)] w-[calc(100vw-2rem)] max-w-[95vw] sm:max-w-6xl"
            : "w-full sm:max-w-lg",
        )}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Import</DialogTitle>
        </DialogHeader>

        <ScrollArea
          className="min-h-0 flex-1 overflow-hidden"
          viewportClassName="h-full w-full"
        >
          <div className="flex flex-col gap-4 p-6">
            {showUploadStep && (
              <>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors cursor-pointer",
                    file
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:border-primary/30",
                  )}
                  onClick={() => fileRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <span
                    className={cn(
                      "flex-1 text-sm truncate",
                      file
                        ? "text-foreground font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {file ? file.name : "Pilih file yang akan di import"}
                  </span>
                  <UploadIcon className="size-4 shrink-0 text-muted-foreground" />
                </div>

                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Import menggunakan file *.xlsx yang diexport dari excel.
                    <br />
                    Dengan melakukan import kontak, data kontak baru akan
                    ditambahkan sesuai dengan data dari file yang Anda unggah.
                  </p>
                  <p>
                    Untuk mempermudah pengisian data, gunakan template yang
                    telah kami sediakan :
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => downloadTemplate()}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline w-fit"
                >
                  <FileDownIcon className="size-4" />
                  Template Kontak
                </button>
              </>
            )}

            {result && (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border/40 p-3">
                    <p className="text-xs text-muted-foreground">Total Baris</p>
                    <p className="text-xl font-bold tabular-nums">
                      {result.total}
                    </p>
                  </div>
                  <div className="rounded-xl border border-success/20 bg-success/10 p-3">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2Icon className="size-3.5 text-success" />
                      <p className="text-xs text-muted-foreground">Valid</p>
                    </div>
                    <p className="text-xl font-bold tabular-nums text-success">
                      {result.valid_count}
                    </p>
                  </div>
                  <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3">
                    <div className="flex items-center gap-1.5">
                      <XCircleIcon className="size-3.5 text-destructive" />
                      <p className="text-xs text-muted-foreground">
                        Tidak Valid
                      </p>
                    </div>
                    <p className="text-xl font-bold tabular-nums text-destructive">
                      {result.invalid_count}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setTab("valid")}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                        tab === "valid"
                          ? "bg-success/15 text-success"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      Valid ({result.valid_count})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab("invalid")}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                        tab === "invalid"
                          ? "bg-destructive/15 text-destructive"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      Tidak Valid ({result.invalid_count})
                    </button>
                  </div>

                  {result.valid_count > 0 && (
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saveMut.isPending}
                      className="bg-success text-success-foreground hover:bg-success/90"
                    >
                      {saveMut.isPending ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : (
                        <SaveIcon className="mr-1.5 size-3.5" />
                      )}
                      {saveMut.isPending
                        ? "Menyimpan..."
                        : `Simpan ${result.valid_count} Data Valid`}
                    </Button>
                  )}
                </div>

                {tab === "invalid" && result.invalid_count > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                    <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      Baris yang tidak valid tidak akan disimpan. Perbaiki data
                      di Excel lalu upload ulang.
                    </span>
                  </div>
                )}

                <ScrollArea className="w-full rounded-lg border border-border/40">
                  <Table
                    containerClassName="w-max overflow-visible"
                    className="min-w-max"
                  >
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="h-9 py-2 text-2xs uppercase tracking-wider text-muted-foreground">
                          #
                        </TableHead>
                        {COLUMNS.map((h) => (
                          <TableHead
                            key={h}
                            className="h-9 py-2 text-2xs uppercase tracking-wider text-muted-foreground"
                          >
                            {h}
                          </TableHead>
                        ))}
                        {tab === "invalid" && (
                          <TableHead className="h-9 py-2 text-2xs uppercase tracking-wider text-muted-foreground">
                            Error
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tab === "valid" &&
                        result.valid.map((item, i) => (
                          <ValidRow key={item.row} item={item} index={i} />
                        ))}
                      {tab === "invalid" &&
                        result.invalid.map((item, i) => (
                          <InvalidRow key={item.row} item={item} index={i} />
                        ))}
                      {((tab === "valid" && result.valid_count === 0) ||
                        (tab === "invalid" && result.invalid_count === 0)) && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell
                            colSpan={COLUMNS.length + 2}
                            className="py-8 text-center text-muted-foreground text-sm"
                          >
                            Belum ada data.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </>
            )}
          </div>
        </ScrollArea>

        {showUploadStep && (
          <div className="shrink-0 border-t bg-background px-6 py-4 flex justify-end">
            <Button
              onClick={handleImport}
              disabled={!file || validateMut.isPending}
            >
              {validateMut.isPending ? (
                <Loader2Icon className="size-4 animate-spin text-primary" />
              ) : (
                <FileSpreadsheetIcon className="mr-1.5 size-3.5" />
              )}
              {validateMut.isPending ? "Memproses..." : "Import"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ValidRow({ item, index }: { item: ImportValidRow; index: number }) {
  return (
    <TableRow>
      <TableCell className="py-2 text-xs text-muted-foreground">
        {index + 1}
      </TableCell>
      {COLUMNS.map((col) => (
        <TableCell key={col} className="py-2 text-xs">
          {item.raw[col as keyof typeof item.raw] || "—"}
        </TableCell>
      ))}
    </TableRow>
  );
}

function InvalidRow({
  item,
  index,
}: {
  item: ImportInvalidRow;
  index: number;
}) {
  return (
    <TableRow className="bg-destructive/5 hover:bg-destructive/10">
      <TableCell className="py-2 text-xs text-muted-foreground">
        {index + 1}
      </TableCell>
      {COLUMNS.map((col) => {
        const isInvalid = item.error_fields?.includes(col);
        return (
          <TableCell
            key={col}
            className={cn(
              "py-2 text-xs",
              isInvalid && "bg-destructive/15 font-semibold text-destructive",
            )}
            title={isInvalid ? "Nilai tidak valid" : undefined}
          >
            {item.raw[col as keyof typeof item.raw] || "—"}
          </TableCell>
        );
      })}
      <TableCell className="py-2 align-top">
        <div className="flex flex-col gap-0.5">
          {item.errors.map((err, i) => (
            <span
              key={i}
              className="whitespace-nowrap text-2xs text-destructive"
            >
              {err}
            </span>
          ))}
        </div>
      </TableCell>
    </TableRow>
  );
}
