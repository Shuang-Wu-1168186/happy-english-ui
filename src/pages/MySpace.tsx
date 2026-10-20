import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { HomeNavigation } from "../components/Layout";
import { api, idValue, value } from "../lib/api";
import type { ApiId, Entry } from "../lib/api";
import { useAuth } from "../lib/auth-context";

type FamilyGroup = Entry & {
  members?: Entry[];
};

type FavoriteItem = Entry & {
  source?: {
    scope_type?: string;
    label?: string;
    family_group_name?: string | null;
  };
  resource?: Entry;
  access?: Entry;
};

type FavoriteResponse = {
  items?: FavoriteItem[];
};

type InviteCode = {
  family_group_id: ApiId;
  family_group_name: string;
  invite_code: string;
  expires_at: string | null;
};

type FamilyAction = "create" | "join" | "rename" | null;

function nestedValue(raw: unknown, key: string) {
  if (!raw || typeof raw !== "object") return "";
  const value = (raw as Record<string, unknown>)[key];
  return value == null ? "" : String(value);
}

function memberName(member: Entry) {
  return nestedValue(member.user, "full_name") || nestedValue(member.user, "username") || "家庭成员";
}

function roleLabel(role: string) {
  return role === "owner" ? "创建者" : role === "admin" ? "管理员" : "成员";
}

function inviteExpiry(expiresAt: string | null) {
  if (!expiresAt) return "7 天内有效";
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "7 天内有效";
  return "有效至 " + date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function favoriteTitle(item: FavoriteItem) {
  const resource = item.resource;
  return (
    value(item, "label") ||
    value(resource, "title") ||
    value(resource, "item_title") ||
    value(resource, "course_title") ||
    "未命名学习内容"
  );
}

function favoriteDescription(item: FavoriteItem) {
  const resource = item.resource;
  return (
    value(resource, "summary") ||
    value(resource, "english_text") ||
    value(resource, "title_en") ||
    value(resource, "course_title_en") ||
    "已加入我的收藏。"
  );
}

function favoritePath(item: FavoriteItem) {
  const resource = item.resource;
  const resourceId = idValue(resource) || idValue(item, "resource_id");
  const resourceType = value(item, "resource_type") || value(resource, "resource_type");
  if (!resourceId) return "";
  if (resourceType === "course") return "/courses/" + resourceId;
  if (resourceType === "material") return "/learning-materials/" + resourceId;
  if (resourceType === "note") return "/learn/notes/" + resourceId;
  if (resourceType === "note_item") {
    const noteId = idValue(resource, "note_id");
    return noteId ? "/learn/notes/" + noteId : "/learn/note-items/" + resourceId;
  }
  return "";
}

function favoriteTypeLabel(item: FavoriteItem) {
  const resourceType = value(item, "resource_type") || value(item.resource, "resource_type");
  return {
    material: "教材",
    course: "课程",
    note: "笔记",
    note_item: "笔记卡片",
  }[resourceType] || "学习内容";
}

function favoriteActionLabel(item: FavoriteItem) {
  const resourceType = value(item, "resource_type") || value(item.resource, "resource_type");
  return {
    material: "打开教材",
    course: "打开课程",
    note: "打开笔记",
    note_item: "打开笔记",
  }[resourceType] || "查看内容";
}

function favoriteAccessLabel(item: FavoriteItem) {
  const state = value(item.access, "access_state");
  return {
    available: "可以学习",
    preview: "可试看",
    locked: "需要会员",
    unavailable: "暂不可用",
  }[state] || "已收藏";
}

export function MySpace() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [familyAction, setFamilyAction] = useState<FamilyAction>(null);
  const [familyActionGroup, setFamilyActionGroup] = useState<FamilyGroup | null>(null);
  const [formValue, setFormValue] = useState("");
  const [invite, setInvite] = useState<InviteCode | null>(null);

  async function load() {
    setLoading(true);
    setFavoritesLoading(true);
    try {
      const [groupsResult, favoritesResult] = await Promise.allSettled([
        api<{ items: FamilyGroup[] }>("/learning/family-groups"),
        api<FavoriteResponse>("/learning/private-zone"),
      ]);
      const errors: string[] = [];
      if (groupsResult.status === "fulfilled") setGroups(groupsResult.value.items || []);
      else errors.push((groupsResult.reason as Error).message || "家庭空间读取失败。");
      if (favoritesResult.status === "fulfilled") setFavorites(favoritesResult.value.items || []);
      else errors.push((favoritesResult.reason as Error).message || "收藏内容读取失败。");
      setError(errors.join(" "));
    } finally {
      setLoading(false);
      setFavoritesLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openFamilyAction(action: Exclude<FamilyAction, null>) {
    setMessage("");
    setError("");
    setFamilyActionGroup(null);
    setFormValue("");
    setFamilyAction(action);
  }

  function openFamilyRename(group: FamilyGroup) {
    setMessage("");
    setError("");
    setFamilyActionGroup(group);
    setFormValue(value(group, "name"));
    setFamilyAction("rename");
  }

  function closeFamilyAction() {
    setFamilyAction(null);
    setFamilyActionGroup(null);
    setFormValue("");
  }

  async function submitFamilyAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = formValue.trim();
    if (!input || !familyAction) return;
    const isCreate = familyAction === "create";
    const isRename = familyAction === "rename";
    const groupId = idValue(familyActionGroup);
    if (isRename && !groupId) {
      setError("家庭信息已失效，请刷新后重试。");
      return;
    }
    setBusy(familyAction);
    setError("");
    try {
      if (isCreate) {
        await api("/learning/family-groups", "POST", { name: input });
        setMessage("家庭已创建。现在可以生成邀请码，邀请家人一起学习。");
      } else if (isRename) {
        await api("/learning/family-groups/" + groupId, "PUT", { name: input });
        setMessage("家庭名称已更新。");
      } else {
        await api("/learning/family-groups/join", "POST", { invite_code: input });
        setMessage("你已加入家庭，现在可以看到家庭共享的学习内容。");
      }
      closeFamilyAction();
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function createInvite(group: FamilyGroup) {
    const groupId = idValue(group);
    if (!groupId) return;
    setBusy("invite-" + groupId);
    setError("");
    try {
      const result = await api<InviteCode>(
        "/learning/family-groups/" + groupId + "/invite-code",
        "POST",
        {},
      );
      setInvite(result);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function copyInviteCode() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.invite_code);
      setMessage("邀请码已复制，发给家人即可。");
    } catch {
      setMessage("邀请码已显示，请手动复制发送给家人。");
    }
  }

  async function removeFavorite(itemId: ApiId) {
    if (!itemId) return;
    setBusy("favorite-" + itemId);
    setError("");
    try {
      await api("/learning/private-zone/items/" + itemId, "DELETE");
      setMessage("已移除收藏。");
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  const displayName = user?.full_name || user?.username || "同学";
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="study-home my-space-page">
      <HomeNavigation />
      <main className="container my-space-main">
        <section className="my-space-hero">
          <div className="my-space-avatar" aria-hidden="true">{initial}</div>
          <div>
            <p>MY LEARNING SPACE</p>
            <h1>你好，{displayName}</h1>
            <span>在这里管理家庭共学和你的学习收藏。</span>
          </div>
        </section>

        {error && <div className="my-space-alert is-error" role="alert">{error}</div>}
        {message && <div className="my-space-alert is-success" role="status">{message}</div>}

        <section className="my-space-family" aria-labelledby="family-heading">
          <div className="my-space-section-heading">
            <div>
              <p>FAMILY LEARNING</p>
              <h2 id="family-heading">家庭共学</h2>
              <span>把值得复习的课程、教材和常用入口，轻松分享给家人。</span>
            </div>
            <span className="my-space-section-icon" aria-hidden="true">🏠</span>
          </div>

          {loading ? (
            <div className="my-space-family-loading">正在读取你的家庭空间…</div>
          ) : groups.length ? (
            <div className="my-space-family-list">
              {groups.map((group) => {
                const role = value(group, "member_role") || "member";
                const canRename = role === "owner";
                const canInvite = role === "owner" || role === "admin";
                const members = group.members || [];
                return (
                  <article className="my-space-family-card" key={idValue(group)}>
                    <div className="my-space-family-card-top">
                      <span className="my-space-family-mark">家</span>
                      <div>
                        <h3>{value(group, "name") || "我的家庭"}</h3>
                        <p>{members.length} 位家人 · 你是{roleLabel(role)}</p>
                      </div>
                      <span className="my-space-role">{roleLabel(role)}</span>
                    </div>
                    <div className="my-space-members" aria-label="家庭成员">
                      {members.slice(0, 5).map((member) => (
                        <span key={idValue(member)}>{memberName(member).slice(0, 2)}</span>
                      ))}
                      {members.length > 5 && <em>+{members.length - 5}</em>}
                    </div>
                    <p className="my-space-family-note">家庭中的成员可查看共享的课程、教材和家庭常用入口。</p>
                    {(canRename || canInvite) && (
                      <div className="my-space-family-card-actions">
                        {canRename && (
                          <button
                            className="my-space-secondary-button"
                            disabled={busy !== ""}
                            onClick={() => openFamilyRename(group)}
                            type="button"
                          >
                            修改名称
                          </button>
                        )}
                        {canInvite && (
                          <button
                            className="my-space-primary-button"
                            disabled={busy === "invite-" + idValue(group)}
                            onClick={() => void createInvite(group)}
                            type="button"
                          >
                            {busy === "invite-" + idValue(group) ? "正在生成…" : "邀请家人"}
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="my-space-empty-family">
              <div className="my-space-empty-illustration" aria-hidden="true">🏡</div>
              <div>
                <h3>和家人一起学，会更容易坚持</h3>
                <p>创建一个家庭，或输入家人发给你的邀请码加入。</p>
              </div>
              <div className="my-space-empty-actions">
                <button className="my-space-primary-button" onClick={() => openFamilyAction("create")} type="button">创建家庭</button>
                <button className="my-space-secondary-button" onClick={() => openFamilyAction("join")} type="button">加入家庭</button>
              </div>
            </div>
          )}
        </section>

        <section className="my-space-favorites-section" id="favorites" aria-labelledby="favorites-heading">
          <div className="my-space-section-heading">
            <div>
              <p>MY FAVORITES</p>
              <h2 id="favorites-heading">我的收藏</h2>
              <span>收藏的笔记、教材和课程，在这里直接打开继续学习。</span>
            </div>
            <span className="my-space-section-icon" aria-hidden="true">🔖</span>
          </div>

          {favoritesLoading ? (
            <div className="my-space-favorites-loading">正在读取你的收藏…</div>
          ) : favorites.length ? (
            <div className="my-space-favorite-grid">
              {favorites.map((item) => {
                const href = favoritePath(item);
                const itemId = idValue(item);
                const sourceScope = nestedValue(item.source, "scope_type") || "personal";
                const sourceLabel = sourceScope === "family" ? "来自家庭" : "来自个人";
                const familyName = nestedValue(item.source, "family_group_name");
                const main = (
                  <>
                    <div className="my-space-favorite-topline">
                      <span className={"my-space-favorite-source is-" + sourceScope}>{sourceLabel}</span>
                      <span className="my-space-favorite-type">{favoriteTypeLabel(item)}</span>
                    </div>
                    <h3>{favoriteTitle(item)}</h3>
                    <p>{favoriteDescription(item)}</p>
                  </>
                );
                return (
                  <article className="my-space-favorite-card" key={itemId}>
                    {href ? (
                      <Link aria-label={`打开 ${favoriteTitle(item)}`} className="my-space-favorite-main" to={href}>
                        {main}
                      </Link>
                    ) : (
                      <div className="my-space-favorite-main">{main}</div>
                    )}
                    <div className="my-space-favorite-footer">
                      <span>
                        {favoriteAccessLabel(item)}
                        {sourceScope === "family" && familyName ? " · " + familyName : ""}
                      </span>
                      <div className="my-space-favorite-actions">
                        {href && <Link to={href}>{favoriteActionLabel(item)} <b>→</b></Link>}
                        <button
                          disabled={busy === "favorite-" + itemId}
                          onClick={() => void removeFavorite(itemId)}
                          type="button"
                        >
                          {busy === "favorite-" + itemId ? "移除中…" : "移除"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="my-space-empty-favorites">
              <span aria-hidden="true">☆</span>
              <div>
                <h3>还没有收藏内容</h3>
                <p>学习课程或教材时点击“收藏”，内容会直接显示在这里。</p>
              </div>
            </div>
          )}
        </section>
      </main>

      {familyAction && (
        <div className="my-space-modal-backdrop" role="presentation">
          <section aria-labelledby="family-action-title" aria-modal="true" className="my-space-modal" role="dialog">
            <button aria-label="关闭" className="my-space-modal-close" onClick={closeFamilyAction} type="button">×</button>
            <span className="my-space-modal-icon">{familyAction === "create" ? "🏠" : familyAction === "rename" ? "✏️" : "✉️"}</span>
            <h2 id="family-action-title">
              {familyAction === "create" ? "创建你的家庭" : familyAction === "rename" ? "修改家庭名称" : "加入家人的家庭"}
            </h2>
            <p>
              {familyAction === "create"
                ? "给家庭起一个容易辨认的名字，之后可以随时分享课程收藏。"
                : familyAction === "rename"
                  ? "更新后的名称会显示给所有家庭成员。"
                  : "输入家人发给你的 8 位邀请码，例如 ABCD-EFGH。"}
            </p>
            <form onSubmit={(event) => void submitFamilyAction(event)}>
              <input
                autoFocus
                maxLength={familyAction === "join" ? undefined : 120}
                onChange={(event) => setFormValue(event.target.value)}
                placeholder={familyAction === "join" ? "输入邀请码" : "例如：我们家"}
                value={formValue}
              />
              <button className="my-space-primary-button" disabled={busy === familyAction} type="submit">
                {busy === familyAction ? "请稍候…" : familyAction === "create" ? "创建家庭" : familyAction === "rename" ? "保存名称" : "加入家庭"}
              </button>
            </form>
          </section>
        </div>
      )}

      {invite && (
        <div className="my-space-modal-backdrop" role="presentation">
          <section aria-labelledby="invite-title" aria-modal="true" className="my-space-modal my-space-invite-modal" role="dialog">
            <button aria-label="关闭" className="my-space-modal-close" onClick={() => setInvite(null)} type="button">×</button>
            <span className="my-space-modal-icon">💌</span>
            <h2 id="invite-title">邀请家人加入</h2>
            <p>把邀请码发给家人。对方在“我的”中选择“加入家庭”后输入即可加入“{invite.family_group_name}”。</p>
            <code>{invite.invite_code}</code>
            <span className="my-space-invite-expiry">{inviteExpiry(invite.expires_at)}</span>
            <button className="my-space-primary-button" onClick={() => void copyInviteCode()} type="button">复制邀请码</button>
          </section>
        </div>
      )}
    </div>
  );
}
