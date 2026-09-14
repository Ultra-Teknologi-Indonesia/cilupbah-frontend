import { toast } from "@/components/ui/sonner";

type ApiErrorBody = {
  status?: number;
  title?: string | null;
  message?: string | null;
  request_id?: string | null;
  errors?: Record<string, unknown> | null;
};

const SERVER_ERROR_TITLE = "Terjadi kesalahan server";
const SERVER_ERROR_DESCRIPTION =
  "Silakan laporkan ke admin/developer terkait masalah ini.";
const UNAVAILABLE_TITLE = "Layanan sementara tidak tersedia";
const UNAVAILABLE_DESCRIPTION =
  "Server sedang padat. Silakan coba lagi beberapa saat.";

function extractValidationSummary(
  errors?: ApiErrorBody["errors"],
): string | null {
  if (!errors || typeof errors !== "object") return null;
  const flat: string[] = [];

  const collect = (value: unknown): void => {
    if (typeof value === "string") {
      if (value.trim()) flat.push(value.trim());
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value).forEach(collect);
    }
  };

  Object.values(errors).forEach(collect);
  return flat.length ? flat.join(" ") : null;
}

function normalize(err: unknown): ApiErrorBody {
  if (err && typeof err === "object") return err as ApiErrorBody;
  if (typeof err === "string") return { message: err };
  return {};
}

export function getApiErrorStatus(err: unknown): number | undefined {
  return normalize(err).status;
}

export function getApiErrorPresentation(
  err: unknown,
  fallbackTitle = "Terjadi kesalahan",
): { title: string; description?: string } {
  const body = normalize(err);
  const status = body.status;

  if (status === 503) {
    return {
      title: body.title?.trim() || UNAVAILABLE_TITLE,
      description: body.message?.trim() || UNAVAILABLE_DESCRIPTION,
    };
  }

  if (status !== undefined && status >= 500) {
    const requestId = body.request_id?.trim();
    return {
      title: SERVER_ERROR_TITLE,
      description: requestId
        ? `${SERVER_ERROR_DESCRIPTION} Kode laporan: ${requestId}`
        : SERVER_ERROR_DESCRIPTION,
    };
  }

  const beTitle = body.title?.trim() || undefined;
  const beMessage = body.message?.trim() || undefined;
  const validationSummary = extractValidationSummary(body.errors) ?? undefined;

  const title = beTitle ?? fallbackTitle;
  let description = beMessage ?? validationSummary;

  if (validationSummary && beMessage && validationSummary !== beMessage) {
    if (beTitle) {
      description = `${beMessage} — ${validationSummary}`;
    } else {
      description = validationSummary;
    }
  }

  if (description && description !== title) {
    return { title, description };
  }

  return { title };
}

export function apiError(err: unknown, fallbackTitle = "Terjadi kesalahan") {
  const presentation = getApiErrorPresentation(err, fallbackTitle);

  if (presentation.description) {
    toast.error(presentation.title, { description: presentation.description });
  } else {
    toast.error(presentation.title);
  }
}

type ApiSuccessBody = {
  title?: string | null;
  message?: string | null;
};

export function apiSuccess(
  res: ApiSuccessBody | null | undefined,
  fallbackTitle: string,
) {
  const beTitle = res?.title?.trim() || undefined;
  const beMessage = res?.message?.trim() || undefined;

  const title = beTitle ?? fallbackTitle;
  const description = beMessage;

  if (description && description !== title) {
    toast.success(title, { description });
  } else {
    toast.success(title);
  }
}
