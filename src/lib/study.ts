import { useEffect, useState } from "react";
import { api } from "./api";
import type { Entry, Page } from "./api";

// The original learning screens expose full lesson menus and unit filters.
// Read all API pages so those menus are not limited to the first 20 records.
export function useStudyCatalog(resource: string, parentId?: string) {
  const [items, setItems] = useState<Entry[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      const params = new URLSearchParams({ page_size: "100" });
      if (parentId) params.set("parent_id", parentId);
      const collected: Entry[] = [];
      let page = 1;
      while (active) {
        params.set("page", String(page));
        const result = await api<Page>(`/content/${resource}?${params}`);
        collected.push(...result.items);
        if (page >= result.total_pages) break;
        page++;
      }
      if (active) setItems(collected);
    }
    load().catch((e) => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
    };
  }, [resource, parentId]);
  return { items, error };
}

export function useStudyItem(resource: string, id?: number | string) {
  const [result, setResult] = useState<{
    key: string;
    item?: Entry;
    error?: string;
  }>();
  const key = `${resource}/${id}`;
  useEffect(() => {
    let active = true;
    if (id != null)
      api<Entry>(`/content/${resource}/${id}`)
        .then((item) => {
          if (active) setResult({ key, item });
        })
        .catch((e) => {
          if (active) setResult({ key, error: e.message });
        });
    return () => {
      active = false;
    };
  }, [resource, id, key]);
  return result?.key === key ? result : undefined;
}
