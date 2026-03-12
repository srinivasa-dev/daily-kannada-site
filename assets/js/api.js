import { clearSession, getAuthToken } from "./auth.js";

const APP_KEY_HEADER_NAME = "X-App-Key";
const APP_KEY_HEADER_VALUE = "daily-kannada-mobile";

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function readApiBaseUrl() {
  const configUrl =
    window.DAILY_KANNADA_CONFIG &&
    typeof window.DAILY_KANNADA_CONFIG.apiBaseUrl === "string"
      ? window.DAILY_KANNADA_CONFIG.apiBaseUrl
      : "";
  const globalUrl =
    typeof window.DAILY_KANNADA_API_BASE_URL === "string"
      ? window.DAILY_KANNADA_API_BASE_URL
      : "";
  const baseUrl = (configUrl || globalUrl).trim().replace(/\/$/, "");

  if (!baseUrl) {
    throw new ApiError(
      "API base URL is not configured. Provide it via assets/js/config.js or Cloudflare runtime config.",
      500,
      "API_BASE_URL_MISSING"
    );
  }

  return baseUrl;
}

function buildUrl(path, query) {
  const baseUrl = readApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(
    `${baseUrl}${normalizedPath}`,
    baseUrl ? undefined : window.location.origin
  );

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : {};
}

export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    data,
    query,
    authenticated = true,
    includeHeaders = false,
  } = options;

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    [APP_KEY_HEADER_NAME]: APP_KEY_HEADER_VALUE,
  };

  if (authenticated) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: data === undefined ? undefined : JSON.stringify(data),
  });

  const payload = await parseResponse(response);

  if (response.status === 401 || response.status === 403) {
    clearSession();
    throw new ApiError(
      payload.message || "Your session expired. Please sign in again.",
      response.status,
      "AUTH_EXPIRED"
    );
  }

  if (!response.ok) {
    throw new ApiError(
      payload.message || "Request failed. Please try again.",
      response.status,
      payload.code || "REQUEST_FAILED"
    );
  }

  if (!includeHeaders) {
    return payload;
  }

  return {
    data: payload,
    headers: {
      count: response.headers.get("x-count"),
      hasMore: response.headers.get("x-has-more"),
      limit: response.headers.get("x-limit"),
      offset: response.headers.get("x-offset"),
      totalCount: response.headers.get("x-total-count"),
    },
  };
}

export function loginRequest(email, password) {
  return apiRequest("/auth/login", {
    method: "POST",
    authenticated: false,
    data: { email, password },
  });
}

export function fetchPhrases({ limit, offset }) {
  return apiRequest("/phrases", {
    method: "GET",
    includeHeaders: true,
    query: { limit, offset },
  });
}

export function patchPhrase(id, payload) {
  return apiRequest(`/admin/phrases/${id}`, {
    method: "PATCH",
    data: payload,
  });
}

export function fetchAdminHealth() {
  return apiRequest("/admin/health", {
    method: "GET",
  });
}
