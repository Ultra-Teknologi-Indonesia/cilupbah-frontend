import { NextRequest, NextResponse } from "next/server";

import { getValidAccessToken, refreshSession } from "@/lib/auth/token-refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

function sessionExpiredResponse() {
  return NextResponse.json(
    { code: "SESSION_EXPIRED", message: "Sesi Anda telah berakhir." },
    { status: 401 },
  );
}

function refreshUnavailableResponse() {
  return NextResponse.json(
    {
      code: "REFRESH_UNAVAILABLE",
      title: "Gagal menyegarkan sesi",
      message:
        "Server sedang sibuk menyegarkan sesi Anda. Coba lakukan lagi sebentar lagi.",
    },
    { status: 503 },
  );
}

function gatewayTimeoutResponse() {
  return NextResponse.json(
    {
      code: "GATEWAY_TIMEOUT",
      title: "Permintaan terlalu lama",
      message:
        "Server tidak merespons tepat waktu. Coba lagi beberapa saat lagi.",
    },
    { status: 504 },
  );
}

const PROXY_TIMEOUT_MS = 30_000;

async function proxyRequest(
  request: NextRequest,
  { params: _params }: { params: Promise<{ path: string[] }> },
) {
  const url = new URL(request.url);
  const targetPath = url.pathname.replace(/^\/api\/app\//, "/api/v1/");
  const targetUrl = `${BACKEND_URL}${targetPath}${url.search}`;
  const isEventStream = targetPath === "/api/v1/realtime/stream";

  const headers = new Headers();
  const incomingAccept = request.headers.get("accept");
  headers.set("accept", incomingAccept || "application/json");
  headers.set("x-client-type", "web");

  const lastEventId = request.headers.get("last-event-id");
  if (lastEventId) headers.set("last-event-id", lastEventId);

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const userAgent = request.headers.get("user-agent");
  if (userAgent) {
    headers.set("user-agent", userAgent);
  }

  const clientIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (clientIp) {
    headers.set("x-client-ip", clientIp);
  }

  const session = await getValidAccessToken();

  if (session.status === "expired") {
    return sessionExpiredResponse();
  }

  if (session.status === "unavailable") {
    return refreshUnavailableResponse();
  }

  if (session.status === "ok") {
    headers.set("authorization", `Bearer ${session.accessToken}`);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const body = hasBody ? await request.arrayBuffer() : undefined;

  const controller = new AbortController();
  const timeoutId = isEventStream
    ? undefined
    : setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    let response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      signal: controller.signal,
    });

    if (response.status === 401 && session.status === "ok") {
      const result = await refreshSession();

      if (result.status === "retryable") {
        return refreshUnavailableResponse();
      }

      if (result.status !== "ok") {
        return sessionExpiredResponse();
      }

      headers.set("authorization", `Bearer ${result.pair.access_token}`);
      response = await fetch(targetUrl, {
        method: request.method,
        headers,
        body,
        signal: controller.signal,
      });

      if (response.status === 401) {
        return sessionExpiredResponse();
      }
    }

    if (timeoutId) clearTimeout(timeoutId);

    const passthroughHeaders = new Headers();
    for (const header of [
      "content-type",
      "content-disposition",
      "cache-control",
      "content-length",
      "x-accel-buffering",
      "retry-after",
    ]) {
      const value = response.headers.get(header);
      if (value) passthroughHeaders.set(header, value);
    }

    // Keep the upstream body as a stream. This is important for large files
    // such as QR PDFs: buffering the entire response in the Next.js process
    // can cause unnecessary memory pressure and 5xx responses.
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: passthroughHeaders,
    });
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);

    if (controller.signal.aborted && !isEventStream) {
      console.error("API Proxy Timeout:", targetUrl);
      return gatewayTimeoutResponse();
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error("API Proxy Error:", targetUrl, message);

    return NextResponse.json(
      {
        status: "error",
        code: "BACKEND_UNAVAILABLE",
        title: "Layanan sementara tidak tersedia",
        message: "Server sedang padat. Silakan coba lagi beberapa saat.",
      },
      {
        status: 503,
        headers: { "Retry-After": "10" },
      },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
