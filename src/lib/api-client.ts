import axios, { AxiosRequestConfig } from "axios";
import { clearLoginSession } from "@/app/actions/auth.actions";

const apiClient = axios.create({
  baseURL: "/api/app",
  headers: {
    "Content-Type": "application/json",
    "X-Client-Type": "web",
  },
});

let sessionExpiredHandled = false;
apiClient.interceptors.response.use(undefined, async (error) => {
  const isSessionExpired =
    axios.isAxiosError(error) &&
    error.response?.status === 401 &&
    (error.response?.data as { code?: string } | undefined)?.code ===
      "SESSION_EXPIRED";

  if (
    typeof window !== "undefined" &&
    isSessionExpired &&
    !window.location.pathname.startsWith("/login") &&
    !sessionExpiredHandled
  ) {
    sessionExpiredHandled = true;
    try {
      await clearLoginSession();
    } catch {}
    const callbackUrl = encodeURIComponent(
      window.location.pathname + window.location.search,
    );
    window.location.href = `/login?callbackUrl=${callbackUrl}`;
  }
  return Promise.reject(error);
});

function payloadFromBody(body: unknown): Record<string, unknown> {
  return body && typeof body === "object"
    ? { ...(body as Record<string, unknown>) }
    : { message: body };
}

function throwRequestError(
  payload: Record<string, unknown>,
  status: number,
): never {
  const message =
    typeof payload.message === "string" && payload.message.trim()
      ? payload.message
      : "Permintaan tidak dapat diproses.";
  const requestError = new Error(message);

  Object.assign(requestError, payload, { status });
  throw requestError;
}

async function normalizeRequestError(error: unknown): Promise<never> {
  if (axios.isAxiosError(error) && error.response) {
    let body: unknown = error.response.data;

    if (typeof Blob !== "undefined" && body instanceof Blob) {
      try {
        const text = await body.text();
        body = JSON.parse(text);
      } catch {
        body = undefined;
      }
    }

    return throwRequestError(payloadFromBody(body), error.response.status);
  }

  if (axios.isAxiosError(error)) {
    return throwRequestError(
      {
        title: "Tidak dapat terhubung ke server",
        message:
          "Periksa koneksi internet Anda, lalu coba lagi. Jika masalah berlanjut, laporkan ke admin/developer terkait masalah ini.",
      },
      0,
    );
  }

  throw error;
}

type ServerFetcher = <T>(
  endpoint: string,
  options?: AxiosRequestConfig,
) => Promise<T>;
let serverFetcher: ServerFetcher | null = null;
export function setServerFetcher(fetcher: ServerFetcher | null): void {
  serverFetcher = fetcher;
}

export async function fetchClient<T>(
  endpoint: string,
  options?: AxiosRequestConfig,
): Promise<T> {
  if (serverFetcher) {
    return serverFetcher<T>(endpoint, options);
  }

  const formattedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const requestOptions: AxiosRequestConfig = { ...options };
  if (typeof FormData !== "undefined" && options?.data instanceof FormData) {
    requestOptions.headers = {
      ...(options.headers || {}),
      "Content-Type": undefined,
    };
  }

  try {
    const response = await apiClient(formattedEndpoint, requestOptions);
    return response.data;
  } catch (error) {
    return normalizeRequestError(error);
  }
}

export async function fetchBlob(
  endpoint: string,
  filename: string,
  mimeType?: string,
): Promise<void> {
  const formattedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  try {
    const response = await apiClient(formattedEndpoint, {
      responseType: "blob",
      headers: { Accept: "*/*" },
    });

    const blob = mimeType
      ? new Blob([response.data], { type: mimeType })
      : response.data;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    return normalizeRequestError(error);
  }
}

export async function fetchBlobRaw(
  endpoint: string,
  mimeType?: string,
): Promise<Blob> {
  const formattedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  try {
    const response = await apiClient(formattedEndpoint, {
      responseType: "blob",
      headers: { Accept: "*/*" },
    });

    return mimeType
      ? new Blob([response.data], { type: mimeType })
      : response.data;
  } catch (error) {
    return normalizeRequestError(error);
  }
}

export async function fetchBlobPost(
  endpoint: string,
  data: unknown,
  mimeType?: string,
): Promise<Blob> {
  const formattedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  try {
    const response = await apiClient(formattedEndpoint, {
      method: "POST",
      data,
      responseType: "blob",
      headers: { Accept: "*/*" },
    });

    return mimeType
      ? new Blob([response.data], { type: mimeType })
      : response.data;
  } catch (error) {
    return normalizeRequestError(error);
  }
}
