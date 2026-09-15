"use client";

import { AlertTriangleIcon, XIcon } from "lucide-react";

import type { ServerErrorItem } from "@/lib/master-produk/humanize-server-errors";

export function FormErrorAlert({
  items,
  onDismiss,
  title = "Perbaiki kesalahan berikut sebelum menyimpan:",
  description,
}: {
  items: ServerErrorItem[];
  onDismiss?: () => void;
  title?: string;
  description?: string;
}) {
  if (!items.length && !description) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
      <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium text-destructive">{title}</p>
        {description ? (
          <p className="whitespace-pre-line break-words text-sm text-destructive/90">
            {description}
          </p>
        ) : null}
        {items.length > 0 ? (
          <ul className="max-h-72 list-disc space-y-0.5 overflow-y-auto pl-4 text-sm text-destructive/90">
            {items.map((it, i) => (
              <li
                key={`${it.label}-${i}`}
                className="whitespace-pre-line break-words"
              >
                {it.label ? (
                  <span className="font-medium">{it.label}: </span>
                ) : null}
                {it.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-destructive/60 transition-colors hover:text-destructive"
          aria-label="Tutup"
        >
          <XIcon className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
