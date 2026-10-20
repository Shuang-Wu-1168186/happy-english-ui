import { useState } from "react";
import { api, idValue, value } from "../lib/api";
import type { ApiId, Entry } from "../lib/api";

type Props = {
  resourceId: ApiId;
  resourceType: "course" | "material";
};

export function PrivateZoneFavorite({ resourceId, resourceType }: Props) {
  const [groups, setGroups] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    setMessage("");
    if (!nextOpen || loaded) return;
    try {
      const result = await api<{ items: Entry[] }>("/learning/family-groups");
      setGroups(result.items || []);
    } catch {
      setGroups([]);
    } finally {
      setLoaded(true);
    }
  }

  async function save(scopeType: "personal" | "family", familyGroupId?: ApiId) {
    const key = scopeType === "family" ? "family-" + familyGroupId : "personal";
    setBusy(key);
    setMessage("");
    try {
      await api("/learning/private-zone/items", "POST", {
        scope_type: scopeType,
        family_group_id: scopeType === "family" ? familyGroupId : null,
        resource_type: resourceType,
        resource_id: resourceId,
      });
      setMessage(scopeType === "family" ? "已分享给家庭" : "已加入我的收藏");
      setOpen(false);
    } catch (error) {
      const text = (error as Error).message;
      setMessage(/already|已.*收藏/i.test(text) ? "该内容已经收藏" : text);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="private-zone-favorite">
      {message && <span className="private-zone-favorite-message" role="status">{message}</span>}
      {open && (
        <section className="private-zone-favorite-menu" aria-label="加入我的收藏">
          <strong>加入我的收藏</strong>
          <button
            disabled={Boolean(busy)}
            onClick={() => void save("personal")}
            type="button"
          >
            {busy === "personal" ? "收藏中…" : "个人收藏"}
          </button>
          {groups.map((group) => {
            const groupId = idValue(group);
            if (!groupId) return null;
            const key = "family-" + groupId;
            return (
              <button
                disabled={Boolean(busy)}
                key={groupId}
                onClick={() => void save("family", groupId)}
                type="button"
              >
                {busy === key ? "分享中…" : "分享到 " + (value(group, "name") || "家庭组")}
              </button>
            );
          })}
        </section>
      )}
      <button
        aria-expanded={open}
        className="private-zone-favorite-trigger"
        onClick={() => void toggle()}
        type="button"
      >
        ☆ 收藏
      </button>
    </div>
  );
}
