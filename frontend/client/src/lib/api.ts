function normalizeApiBaseUrl(value?: string) {
  return value?.trim().replace(/\/+$/, "") || "";
}

export const API_BASE = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

console.info(
  `[api] Using API base URL: ${API_BASE || "(same-origin fallback; set VITE_API_URL for Render)"}`
);

export class ApiError extends Error {
  status: number;
  responseText: string;

  constructor(status: number, responseText: string) {
    super(responseText || `Request failed: ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.responseText = responseText;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = buildApiUrl(path);
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || `Request failed: ${res.status}`);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return (await res.json()) as T;
}
