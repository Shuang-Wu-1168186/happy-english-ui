export type Entry = { id: number; [key: string]: unknown };
export type User = {
  id: number;
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
export const asset = (path: string) =>
  path.startsWith("/static/") ? `${base}${path}` : path;
export const value = (entry: Entry, key: string) =>
  entry[key] == null ? "" : String(entry[key]);
export const entries = (entry: Entry, key: string): Entry[] =>
  Array.isArray(entry[key]) ? (entry[key] as Entry[]) : [];
export async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (options.method && options.method !== "GET")
    headers.set("X-CSRF-Token", csrf);
  let response: Response;
  try {
    response = await fetch(`${base}/api${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw new Error("无法连接服务，请检查后端是否已启动。");
  }
  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => ({ detail: "请求失败，请稍后重试。" }));
    const message =
      typeof data.detail === "string"
        ? data.detail
        : Array.isArray(data.detail)
          ? data.detail
              .map(
                (e: { loc?: string[]; msg: string }) =>
                  `${e.loc?.join(".") || ""}: ${e.msg}`,
              )
              .join("\n")
          : "请求失败";
    throw new Error(message);
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
