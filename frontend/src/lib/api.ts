export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://qaaed-keystroke-api.hf.space";

const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

type ApiFetchOptions = RequestInit & {
  retries?: number;
  retryDelayMs?: number;
};

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

  const message = await response.text();
  throw new Error(message || `API request failed with status ${response.status}`);
}
