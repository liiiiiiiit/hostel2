import React, { useState } from "react";
import { appStore } from "../services/store";
import { useLanguage } from "../context/LanguageContext";
import { workflowText } from "../i18n/workflows";
import type { AppLanguage } from "../types";
export function PlatformSettings() {
  const { currentLang } = useLanguage(),
    w = workflowText(currentLang),
    settings = appStore.getState().settings;
  const [phone, setPhone] = useState(settings.emergencyHotline),
    [telegram, setTelegram] = useState(settings.telegramSupport),
    [hours, setHours] = useState(
      settings.supportHours ?? {
        fa: settings.supportWorkingHoursFa,
        en: "",
        ru: "",
        hy: "",
      },
    ),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="surface p-5 space-y-4">
      <h2 className="text-xl font-semibold">{w("hours")}</h2>
      <label className="block text-sm">
        {w("phone")}
        <input
          className="field mt-2 w-full"
          dir="ltr" value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Telegram
        <input
          className="field mt-2 w-full"
          value={telegram}
          onChange={(e) => setTelegram(e.target.value)}
        />
      </label>
      <div className="grid sm:grid-cols-2 gap-3">
        {(["fa", "en", "ru", "hy"] as AppLanguage[]).map((lang) => (
          <label key={lang} className="text-sm">
            {w("hours")} · {({fa:"فارسی",en:"English",ru:"Русский",hy:"Հայերեն"})[lang]}
            <textarea
              className="field mt-2 w-full"
              value={hours[lang]}
              onChange={(e) => setHours({ ...hours, [lang]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <button
        className="button-primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const result = await appStore.action("updatePlatformSettings", [
              {
                emergencyHotline: phone,
                telegramSupport: telegram,
                supportHours: hours,
              },
            ]);
            setNotice(
              result.success ? w("saved") : (result.error ?? w("error")),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {w("save")}
      </button>
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
