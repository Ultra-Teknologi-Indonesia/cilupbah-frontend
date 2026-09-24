import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const dateShort = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const dateLong = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const dateTime = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

const dateTimeWithSeconds = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Asia/Jakarta",
});

const timeOnly = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

const dateTimeFull = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
  timeZoneName: "short",
});

const currencyIdr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberId = new Intl.NumberFormat("id-ID");

function toDate(d: string | number | Date | null | undefined): Date | null {
  if (d == null || d === "") return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(
  d: string | number | Date | null | undefined,
): string {
  const date = toDate(d);
  return date ? dateShort.format(date) : "—";
}

export function formatDateLong(
  d: string | number | Date | null | undefined,
): string {
  const date = toDate(d);
  return date ? dateLong.format(date) : "—";
}

/**
 * Serializes a date-picker calendar value without converting it through UTC.
 * Date-only filters are calendar dates in WIB, not instants in time.
 */
export function formatDateInput(
  d: Date | null | undefined,
): string {
  if (!d || Number.isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/** Parses a date-only filter as a local calendar value (not UTC midnight). */
export function parseDateInput(value: string | null | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateTime(
  d: string | number | Date | null | undefined,
): string {
  const date = toDate(d);
  return date ? dateTime.format(date) : "—";
}

/** Formats an ISO timestamp as `02 Sep 2026, 10:28:01` in WIB. */
export function formatDateTimeWithSeconds(
  d: string | number | Date | null | undefined,
): string {
  const date = toDate(d);
  if (!date) return "—";

  const parts = Object.fromEntries(
    dateTimeWithSeconds
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );

  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute}:${parts.second}`;
}

/** Formats an ISO timestamp in the application's business timezone. */
export function formatDateTimeWib(
  d: string | number | Date | null | undefined,
): string {
  const date = toDate(d);
  return date ? `${dateTime.format(date)} WIB` : "—";
}

export function formatTime(
  d: string | number | Date | null | undefined,
): string {
  const date = toDate(d);
  return date ? timeOnly.format(date) : "—";
}

export function formatDateTimeFull(
  d: string | number | Date | null | undefined,
): string {
  const date = toDate(d);
  return date ? dateTimeFull.format(date) : "—";
}

export function formatCurrency(n: number | null | undefined): string {
  return n == null || Number.isNaN(n) ? "—" : currencyIdr.format(n);
}

export function formatNumber(n: number | null | undefined): string {
  return n == null || Number.isNaN(n) ? "—" : numberId.format(n);
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatPickingDuration(
  startedAt: string | null | undefined,
  completedAt: string | null | undefined,
  status: string | null | undefined,
  now: Date | number = new Date(),
): string {
  if (status === "DRAFT" || status === "FAILED" || status === "CANCELLED") {
    return "—";
  }
  const start = toDate(startedAt);
  const end = completedAt ? toDate(completedAt) : toDate(now);
  if (!start || !end) return "—";

  const totalMinutes = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60000),
  );
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

export function relativeTime(
  value: string | null | undefined,
  fallback = "Belum pernah",
): string {
  const date = toDate(value);
  if (!date) return fallback;
  try {
    return formatDistanceToNow(date, { locale: idLocale, addSuffix: true });
  } catch {
    return fallback;
  }
}
