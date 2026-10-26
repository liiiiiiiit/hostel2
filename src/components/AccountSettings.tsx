import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { workflowText } from "../i18n/workflows";
import { appStore } from "../services/store";
export function AccountSettings() {
  const { currentLang } = useLanguage(),
    w = workflowText(currentLang),
    user = appStore.getCurrentUser();
  const [name, setName] = useState(user?.name ?? ""),
    [phone, setPhone] = useState(user?.phone ?? ""),
    [notifications, setNotifications] = useState(
      user?.emailNotifications !== false,
    ),
    [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [link, setLink] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  if (!user) return null;
  const run = async (action: string, args: unknown[]) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await appStore.action(action, args);
      setNotice(result.success ? w("saved") : (result.error ?? w("error")));
      if (result.success && ["changePassword", "logoutAll"].includes(action))
        window.location.assign("/" + currentLang + "/");
      setCurrent("");
      setPassword("");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="surface p-5 space-y-5" data-testid="account-settings">
      <h2 className="text-xl font-semibold">{w("profile")}</h2><p className="text-sm text-slate-500">{w("email")}: <bdi>{user.email}</bdi></p>
      {notice && <p role="status">{notice}</p>}
      <label className="block text-sm">
        {w("fullName")}
        <input
          className="field w-full mt-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
        />
      </label>
      <label className="block text-sm">
        {w("phone")}
        <input
          className="field w-full mt-2"
          dir="ltr" value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={100}
        />
      </label>
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={notifications}
          onChange={(e) => setNotifications(e.target.checked)}
        />
        {w("notifications")}
      </label>
      <button
        disabled={busy || !name.trim()}
        className="button-primary"
        onClick={() =>
          void run("updateProfile", [
            {
              name,
              phone,
              language: currentLang,
              emailNotifications: notifications,
            },
          ])
        }
      >
        {w("save")}
      </button>
      <div className="border-t pt-4 space-y-3">
        <p>{w(user.emailVerifiedAt ? "verified" : "notVerified")}</p>
        {!user.emailVerifiedAt && (
          <button
            className="button-secondary"
            disabled={busy}
            onClick={() => void run("requestEmailVerification", [])}
          >
            {w("verifyEmail")}
          </button>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-4 border-t pt-4">
        <label className="text-sm">
          {w("currentPassword")}
          <input
            className="field mt-2 w-full"
            dir="ltr" type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label className="text-sm">
          {w("password")}
          <input
            className="field mt-2 w-full"
            dir="ltr" type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button
          className="button-primary"
          disabled={busy || password.length < 8 || current.length < 8}
          onClick={() => void run("changePassword", [current, password])}
        >
          {w("changePassword")}
        </button>
        <button
          className="button-secondary"
          disabled={busy}
          onClick={() => void run("logoutAll", [])}
        >
          {w("revoke")}
        </button>
      </div>
      {user.role==='traveler'&&<>
      <label className="block text-sm border-t pt-4">
        {w("privateLink")}
        <input
          className="field mt-2 w-full"
          dir="ltr" value={link}
          onChange={(e) => setLink(e.target.value)}
        />
      </label>
      <button
        className="button-secondary"
        disabled={busy || !user.emailVerifiedAt || !link}
        onClick={() => {
          const token = link.match(/yvn-trk-[a-f0-9-]+/)?.[0] ?? link;
          void run("claimGuestBooking", [token]);
        }}
      >
        {w("linkBooking")}
      </button>
      </>}
    </section>
  );
}
export function AccountActionView({
  purpose,
  token,
}: {
  purpose: string;
  token: string;
}) {
  const { currentLang } = useLanguage(),
    w = workflowText(currentLang);
  const [password, setPassword] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await appStore.action(
        purpose === "password" ? "resetPassword" : "verifyEmail",
        purpose === "password" ? [token, password] : [token],
      );
      setNotice(result.success ? w("saved") : (result.error ?? w("error")));
      setPassword("");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-shell py-12">
      <div className="surface p-6 max-w-lg mx-auto space-y-5">
        <h1 className="text-2xl font-semibold">
          {w(purpose === "password" ? "reset" : "verifyEmail")}
        </h1>
        {purpose === "password" && (
          <label>
            {w("password")}
            <input
              className="field w-full mt-2"
              dir="ltr" type="password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        <button
          className="button-primary"
          disabled={busy || (purpose === "password" && password.length < 8)}
          onClick={() => void submit()}
        >
          {w("approve")}
        </button>
        {notice && <p role="status">{notice}</p>}
      </div>
    </div>
  );
}
