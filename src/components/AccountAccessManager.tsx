import React, { useEffect, useState } from "react";
import { appStore } from "../services/store";
import { useLanguage } from "../context/LanguageContext";
import type { UserRole } from "../types";
import { can } from "../utils/authorization";
import { authorizationText } from "../i18n/authorization";
interface Account {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  assignedHostelIds: string[];
  legacyProviderRoles: string[];
  version: string;
}
export function AccountAccessManager() {
  const { currentLang } = useLanguage(),
    t = authorizationText[currentLang];
  const [accounts, setAccounts] = useState<Account[]>([]),
    [draft, setDraft] = useState<Account | null>(null),
    [reason, setReason] = useState(""),
    [revoke, setRevoke] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [events, setEvents] = useState<
    { id: string; target_id: string; reason: string; created_at: string }[]
  >([]);
  async function load() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/account-access", {
        credentials: "same-origin",
      });
      if (!response.ok) throw Error();
      const data = await response.json();
      setAccounts(data.accounts);
      setEvents(data.events);
      setDraft(null);
    } catch {
      setMessage(t.failed);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  if (!can(appStore.getCurrentUser(), "accounts.assign")) return null;
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await appStore.action("setAccountAccess", [
        {
          id: draft.id,
          version: draft.version,
          role: draft.role,
          isActive: draft.isActive,
          assignedHostelIds: draft.assignedHostelIds,
          revokeLegacyAccess: revoke,
          reason,
        },
      ]);
      if (!result.success) {
        setMessage(result.error || t.failed);
        return;
      }
      setMessage(t.saved);
      setReason("");
      setRevoke(false);
      if (can(appStore.getCurrentUser(), "accounts.assign")) await load();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section data-testid="account-access-manager" className="space-y-4 min-w-0">
      <h2 className="text-xl font-bold">{t.nav}</h2>
      <p className="text-sm">{t.notice}</p>
      {message && <p role="status">{message}</p>}
      <button
        className="button-secondary"
        disabled={busy}
        onClick={() => void load()}
      >
        {t.reload}
      </button>
      <label className="block">
        {t.account}
        <select
          className="field w-full"
          disabled={busy}
          value={draft?.id ?? ""}
          onChange={(e) => {
            setDraft(accounts.find((a) => a.id === e.target.value) ?? null);
            setReason("");
            setRevoke(false);
          }}
        >
          <option value="">{t.choose}</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {a.email}
            </option>
          ))}
        </select>
      </label>
      {draft && (
        <form onSubmit={save} className="surface p-4 space-y-4">
          <fieldset disabled={busy} className="space-y-4">
            <label className="block">
              {t.role}
              <select
                className="field w-full"
                value={draft.role}
                onChange={(e) =>
                  setDraft({ ...draft, role: e.target.value as UserRole })
                }
              >
                {(
                  [
                    "admin",
                    "hostel_manager",
                    "traveler",
                    "job_provider",
                    "tour_provider",
                  ] as const
                ).map((r) => (
                  <option key={r} value={r}>
                    {t[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) =>
                  setDraft({ ...draft, isActive: e.target.checked })
                }
              />
              {t.active}
            </label>
            {draft.role === "hostel_manager" && (
              <fieldset className="space-y-2">
                <legend>{t.hostels}</legend>
                {appStore.getState().hostels.map((h) => (
                  <label key={h.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draft.assignedHostelIds.includes(h.id)}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          assignedHostelIds: e.target.checked
                            ? [...draft.assignedHostelIds, h.id]
                            : draft.assignedHostelIds.filter(
                                (id) => id !== h.id,
                              ),
                        })
                      }
                    />
                    {h.name[currentLang]}
                  </label>
                ))}
              </fieldset>
            )}
            {!!draft.legacyProviderRoles.length && (
              <div>
                <p>
                  {t.legacy}:{" "}
                  {draft.legacyProviderRoles
                    .map((r) => t[r as "job_provider" | "tour_provider"])
                    .join(" · ")}
                </p>
                <label>
                  <input
                    type="checkbox"
                    checked={revoke}
                    onChange={(e) => setRevoke(e.target.checked)}
                  />{" "}
                  {t.revoke}
                </label>
              </div>
            )}
            <label className="block">
              {t.reason}
              <textarea
                required
                minLength={3}
                maxLength={1000}
                className="field w-full"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <button className="button-primary">{t.save}</button>
          </fieldset>
        </form>
      )}
      <h3 className="font-semibold">{t.history}</h3>
      <div className="space-y-2">
        {events.map((e) => (
          <p className="surface p-3 break-words" key={e.id}>
            {accounts.find((a) => a.id === e.target_id)?.name ?? e.target_id} ·{" "}
            {e.reason} ·{" "}
            <time dateTime={e.created_at}>
              {new Date(e.created_at).toLocaleString(
                currentLang === "hy" ? "hy-AM" : currentLang,
              )}
            </time>
          </p>
        ))}
      </div>
    </section>
  );
}
