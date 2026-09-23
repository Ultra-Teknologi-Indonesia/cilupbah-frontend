"use client";

import * as React from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { FileSearchIcon, Loader2, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type SearchResult = {
  pageNumber: number;
  snippet: string;
};

type SearchStatus = "idle" | "searching" | "complete" | "error";

const MAX_VISIBLE_RESULTS = 200;
const SEARCH_WORKERS = 4;

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function getSnippet(text: string, matchIndex: number, queryLength: number) {
  const start = Math.max(0, matchIndex - 40);
  const end = Math.min(text.length, matchIndex + queryLength + 56);
  const before = start > 0 ? "…" : "";
  const after = end < text.length ? "…" : "";

  return `${before}${text.slice(start, end).trim()}${after}`;
}

export function PdfSearchPanel({
  document,
  open,
  onOpenChange,
  onSelectPage,
}: {
  document: PDFDocumentProxy | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPage: (pageNumber: number) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [submittedQuery, setSubmittedQuery] = React.useState("");
  const [status, setStatus] = React.useState<SearchStatus>("idle");
  const [scannedPages, setScannedPages] = React.useState(0);
  const [totalMatches, setTotalMatches] = React.useState(0);
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const searchRunRef = React.useRef(0);

  React.useEffect(() => {
    if (!open) return;

    return () => {
      searchRunRef.current += 1;
    };
  }, [open]);

  React.useEffect(() => {
    if (!document || !submittedQuery) return;

    const runId = searchRunRef.current + 1;
    searchRunRef.current = runId;
    const normalizedQuery = normalize(submittedQuery);
    let nextPage = 1;
    let completedPages = 0;
    let matches = 0;
    const found: SearchResult[] = [];

    const isCurrent = () => searchRunRef.current === runId;
    const publish = () => {
      if (!isCurrent()) return;
      setScannedPages(completedPages);
      setTotalMatches(matches);
      setResults([...found]);
    };

    const scanPage = async (pageNumber: number) => {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const matchIndex = normalize(text).indexOf(normalizedQuery);

      if (matchIndex >= 0) {
        matches += 1;
        if (found.length < MAX_VISIBLE_RESULTS) {
          found.push({
            pageNumber,
            snippet: getSnippet(text, matchIndex, submittedQuery.length),
          });
        }
      }
    };

    const worker = async () => {
      while (isCurrent()) {
        const pageNumber = nextPage;
        nextPage += 1;
        if (pageNumber > document.numPages) return;

        try {
          await scanPage(pageNumber);
        } catch {}

        completedPages += 1;
        if (completedPages % 20 === 0 || completedPages === document.numPages) {
          publish();
        }
      }
    };

    void Promise.all(
      Array.from(
        { length: Math.min(SEARCH_WORKERS, document.numPages) },
        () => worker(),
      ),
    )
      .then(() => {
        if (!isCurrent()) return;
        publish();
        setStatus("complete");
      })
      .catch(() => {
        if (isCurrent()) setStatus("error");
      });

    return () => {
      if (searchRunRef.current === runId) searchRunRef.current += 1;
    };
  }, [document, submittedQuery]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = query.trim();
    if (!nextQuery || !document) return;

    setStatus("searching");
    setScannedPages(0);
    setTotalMatches(0);
    setResults([]);

    if (nextQuery === submittedQuery) {
      searchRunRef.current += 1;
      setSubmittedQuery("");
      requestAnimationFrame(() => setSubmittedQuery(nextQuery));
      return;
    }

    setSubmittedQuery(nextQuery);
  };

  const handleSelect = (pageNumber: number) => {
    onSelectPage(pageNumber);
    onOpenChange(false);
  };

  const resultLabel =
    totalMatches === 1 ? "1 hasil ditemukan" : `${totalMatches} hasil ditemukan`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="z-[70] w-full p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 pr-14">
          <SheetTitle>Cari dalam dokumen</SheetTitle>
          <SheetDescription>
            Cari kode rak, nama lokasi, atau teks lain pada PDF.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex gap-2 border-b border-border/60 p-4"
        >
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Contoh: O-A2-K1-X30"
            aria-label="Cari isi dokumen"
            disabled={!document}
          />
          <Button type="submit" size="sm" disabled={!query.trim() || !document}>
            <SearchIcon className="size-4" />
            Cari
          </Button>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {status === "idle" && (
            <EmptyState
              icon={FileSearchIcon}
              title="Cari lokasi pada PDF"
              description="Masukkan kode lokasi untuk melihat halaman labelnya."
              className="py-16"
            />
          )}

          {status === "searching" && (
            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Memeriksa halaman {scannedPages} dari {document?.numPages ?? 0}
            </div>
          )}

          {status === "complete" && totalMatches === 0 && (
            <EmptyState
              icon={FileSearchIcon}
              title="Lokasi tidak ditemukan"
              description={`Tidak ada hasil untuk “${submittedQuery}”.`}
              className="py-16"
            />
          )}

          {status === "error" && (
            <EmptyState
              icon={FileSearchIcon}
              title="Pencarian belum dapat dilakukan"
              description="Coba cari kembali beberapa saat lagi."
              className="py-16"
            />
          )}

          {(status === "searching" || totalMatches > 0) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{resultLabel}</span>
                {results.length < totalMatches && (
                  <span>Menampilkan {results.length} pertama</span>
                )}
              </div>
              <div className="space-y-2">
                {results.map((result) => (
                  <Button
                    key={result.pageNumber}
                    type="button"
                    variant="outline"
                    className="h-auto w-full justify-start p-3 text-left"
                    onClick={() => handleSelect(result.pageNumber)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {result.snippet}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Halaman {result.pageNumber}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
