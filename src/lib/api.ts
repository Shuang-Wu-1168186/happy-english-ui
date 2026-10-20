/** A server-issued, encrypted database identifier. Treat it as an opaque string. */
export type ApiId = string;

// Some renderer-only entries are assembled in the browser and use a local
// numeric index. Any identifier returned by the API is an ApiId string.
export type Entry = { id: ApiId | number; [key: string]: unknown };
export type User = {
  id: ApiId;
  username: string;
  full_name: string;
  email: string | null;
  contact_number: string | null;
  home_address: string | null;
  role: string;
  status: string;
};
export type Session = {
  user: User | null;
  csrf_token: string;
  audio_enabled?: boolean;
};
export type Page = {
  items: Entry[];
  page: number;
  total_pages: number;
  total: number;
};
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
let csrf = "";

class SessionExpiredError extends Error {
  constructor() {
    super("登录状态已失效，请重新登录。");
  }
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const { hash, pathname, search } = window.location;
  if (pathname === "/login" || pathname === "/signup") return;
  const params = new URLSearchParams({ next: `${pathname}${search}${hash}` });
  window.location.replace(`/login?${params.toString()}`);
}

function expireSession(): never {
  csrf = "";
  redirectToLogin();
  throw new SessionExpiredError();
}

function isSignInRequest(path: string) {
  return path === "/auth/login" || path === "/auth/miniprogram/login";
}

export const asset = (path: string) =>
  path.startsWith("/static/") ? `${base}${path}` : path;
export const value = (entry: Entry | null | undefined, key: string) =>
  entry?.[key] == null ? "" : String(entry[key]);
export const idValue = (entry: Entry | null | undefined, key = "id"): ApiId => {
  const raw = entry?.[key];
  return typeof raw === "string" ? raw : "";
};
export const entries = (entry: Entry, key: string): Entry[] =>
  Array.isArray(entry[key]) ? (entry[key] as Entry[]) : [];

function errorMessage(detail: unknown, status: number) {
  if (typeof detail === "string") {
    const message = detail.trim();
    if (status === 403 && message === "Administrator access required.") {
      return "当前账号没有管理员权限，请使用管理员账号重新登录。";
    }
    if (
      status === 403 &&
      message === "Session expired. Refresh the page and try again."
    ) {
      return "登录状态已过期，请刷新页面后重试。";
    }
    if (status === 404 && /^not found$/i.test(message)) {
      return "当前服务尚未更新，请启动最新后端后重试。";
    }
    if (/\bnot found\.?$/i.test(message)) {
      return "该记录已不存在，请刷新列表后重试。";
    }
    return message || "请求失败，请稍后重试。";
  }
  if (Array.isArray(detail)) {
    return detail
      .map(
        (entry: { loc?: string[]; msg: string }) =>
          `${entry.loc?.join(".") || ""}: ${entry.msg}`,
      )
      .join("\n");
  }
  return "请求失败，请稍后重试。";
}

export async function request(path: string, options: RequestInit = {}) {
  const requiresCsrf = Boolean(options.method && options.method !== "GET");
  const send = () => {
    const headers = new Headers(options.headers);
    if (options.body && !(options.body instanceof FormData))
      headers.set("Content-Type", "application/json");
    if (requiresCsrf) headers.set("X-CSRF-Token", csrf);
    return fetch(`${base}/api${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  };
  let response: Response;
  try {
    response = await send();
    const failedWithExpiredSession =
      response.status === 403 &&
      requiresCsrf &&
      path !== "/auth/session" &&
      (
        await response
          .clone()
          .json()
          .catch(() => null)
      )?.detail === "Session expired. Refresh the page and try again.";
    if (failedWithExpiredSession) {
      const sessionResponse = await fetch(`${base}/api/auth/session`, {
        credentials: "include",
      });
      if (sessionResponse.status === 401) expireSession();
      if (sessionResponse.ok) {
        const session = (await sessionResponse.json()) as Partial<Session>;
        if (!session.user) expireSession();
        if (typeof session.csrf_token === "string") csrf = session.csrf_token;
        response = await send();
      }
    }
  } catch (error) {
    if (error instanceof SessionExpiredError) throw error;
    throw new Error("无法连接服务，请检查后端是否已启动。");
  }
  if (response.status === 401 && !isSignInRequest(path)) expireSession();
  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => ({ detail: "请求失败，请稍后重试。" }));
    throw new Error(errorMessage(data.detail, response.status));
  }
  return response;
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await request(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json();
  if (data.csrf_token) csrf = data.csrf_token;
  return data as T;
}
