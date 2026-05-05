export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://qaaed-keystroke-api.hf.space";

const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

type ApiFetchOptions = RequestInit & {
  retries?: number;
  retryDelayMs?: number;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isSafeMethod(method: string | undefined) {
  return !method || method === "GET" || method === "HEAD";
}

function shouldRetryResponse(response: Response) {
  return TRANSIENT_STATUSES.has(response.status);
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const { retries, retryDelayMs = 900, ...fetchOptions } = options;
  const maxRetries = retries ?? (isSafeMethod(fetchOptions.method) ? 3 : 0);
  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(`${API_URL}${path}`, fetchOptions);

      if (response.ok || !shouldRetryResponse(response) || attempt === maxRetries) {
        return response;
      }

      lastResponse = response;
    } catch (err) {
      lastError = err;

      if (attempt === maxRetries) {
        throw err;
      }
    }

    await sleep(retryDelayMs * (attempt + 1));
  }

  if (lastResponse) return lastResponse;
  throw lastError;
}

export async function requireOk(response: Response) {
  if (response.ok) return response;

  let message = "";

  try {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = await response.json();
      if (typeof payload?.detail === "string") {
        message = payload.detail;
      } else if (Array.isArray(payload?.detail)) {
        message = payload.detail
          .map((item: { msg?: string }) => item.msg)
          .filter(Boolean)
          .join("; ");
      } else {
        message = JSON.stringify(payload);
      }
    } else {
      message = await response.text();
    }
  } catch {
    message = "";
  }

  throw new ApiError(
    response.status,
    message || `API request failed with status ${response.status}`,
  );
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
