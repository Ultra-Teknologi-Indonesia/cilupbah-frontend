"use client";

import * as React from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export interface PdfViewerProps {
  file: string | File | null;
  numPages: number;
  scale: number;
  onLoadSuccess: (document: PDFDocumentProxy) => void;
  onLoadError: (err: Error) => void;
  className?: string;
  pageWidth?: number;
  onVisiblePageChange?: (pageNumber: number) => void;
}

const loadingNode = (
  <div className="flex h-[60vh] w-full items-center justify-center text-sm text-muted-foreground">
    Memuat dokumen…
  </div>
);

const errorNode = (
  <div className="flex h-[60vh] w-full items-center justify-center text-sm text-destructive">
    Dokumen gagal dimuat
  </div>
);

export function PdfViewer({
  file,
  numPages,
  scale,
  onLoadSuccess,
  onLoadError,
  className,
  pageWidth = 820,
  onVisiblePageChange,
}: PdfViewerProps) {
  const fileProp = React.useMemo(() => file ?? null, [file]);
  const pageList = React.useMemo(() => {
    const total = numPages > 0 ? numPages : 1;
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [numPages]);

  // Track active page in viewport
  React.useEffect(() => {
    if (!onVisiblePageChange || numPages <= 0) return;

    const visibleRatios = new Map<number, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pageStr = entry.target.getAttribute("data-page-number");
          if (!pageStr) continue;
          const pageNum = parseInt(pageStr, 10);
          if (entry.isIntersecting) {
            visibleRatios.set(pageNum, entry.intersectionRatio);
          } else {
            visibleRatios.delete(pageNum);
          }
        }

        let bestPage = 0;
        let highestRatio = -1;
        for (const [page, ratio] of visibleRatios.entries()) {
          if (ratio > highestRatio) {
            highestRatio = ratio;
            bestPage = page;
          }
        }

        if (bestPage > 0) {
          onVisiblePageChange(bestPage);
        }
      },
      {
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: "-80px 0px -40% 0px",
      },
    );

    const elements = document.querySelectorAll("[data-page-number]");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [numPages, onVisiblePageChange]);

  return (
    <div className={cn("flex w-full flex-col items-center gap-6", className)}>
      {fileProp ? (
        <Document
          file={fileProp}
          onLoadSuccess={onLoadSuccess}
          onLoadError={onLoadError}
          loading={loadingNode}
          error={errorNode}
          className="flex flex-col items-center gap-6"
        >
          {pageList.map((pageNum) => (
            <PdfPageItem
              key={pageNum}
              pageNumber={pageNum}
              scale={scale}
              width={pageWidth}
            />
          ))}
        </Document>
      ) : (
        loadingNode
      )}
    </div>
  );
}

function PdfPageItem({
  pageNumber,
  scale,
  width,
}: {
  pageNumber: number;
  scale: number;
  width: number;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [isNearViewport, setIsNearViewport] = React.useState(pageNumber <= 2);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsNearViewport(true);
        }
      },
      {
        rootMargin: "800px 0px",
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      id={`pdf-page-${pageNumber}`}
      data-page-number={pageNumber}
      ref={containerRef}
      className="overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_-12px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.04]"
      style={{
        width: `min(${width * scale}px, 95vw)`,
        minHeight: `min(${width * 1.414 * scale}px, 130vw)`,
      }}
    >
      {isNearViewport ? (
        <Page
          pageNumber={pageNumber}
          scale={scale}
          renderTextLayer
          renderAnnotationLayer
          width={width}
          loading={
            <div className="flex aspect-[1/1.414] w-full items-center justify-center text-sm text-muted-foreground">
              Merender halaman {pageNumber}…
            </div>
          }
        />
      ) : (
        <div className="flex aspect-[1/1.414] w-full items-center justify-center text-xs text-muted-foreground">
          Halaman {pageNumber}
        </div>
      )}
    </div>
  );
}
