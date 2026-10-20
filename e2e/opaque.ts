import type { Page } from "@playwright/test";

/** A shape-valid stand-in for IDs in route-mocked API responses. */
export function mockOpaqueId(value: string | number): string {
  return `hei1_e2e_${String(value).replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

export type ApiEntry = Record<string, unknown> & { id: string };

export async function apiItems(page: Page, path: string): Promise<ApiEntry[]> {
  const response = await page.request.get(path);
  if (!response.ok()) throw new Error(`Could not load ${path}: ${response.status()}`);
  const payload = (await response.json()) as { items?: Array<Record<string, unknown>> };
  return (payload.items || []).filter(
    (item): item is ApiEntry => typeof item.id === "string",
  );
}

/** Read a real opaque ID from the disposable browser-test API. */
export async function firstApiItemId(page: Page, path: string): Promise<string> {
  const id = (await apiItems(page, path))[0]?.id;
  if (!id) throw new Error(`No opaque ID returned by ${path}`);
  return id;
}
