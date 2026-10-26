import React, { useState, useRef } from "react";
import { appStore } from "../services/store";
import { useLanguage } from "../context/LanguageContext";
import { workflowText, workflowValue } from "../i18n/workflows";
import { financeSummary } from "../utils/finance";
import { toCsv } from "../utils/csv";
export function FinancePanel({ hostelId }: { hostelId?: string }) {
  const { currentLang, getLocalized } = useLanguage(),
    w = workflowText(currentLang),
    state = appStore.getState();
  const [selection, setSelection] = useState(hostelId ?? "all"),
    [bookingId, setBookingId] = useState(""),
    [kind, setKind] = useState("property_payment"),
    [amount, setAmount] = useState(""),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const key = useRef({ body: "", id: crypto.randomUUID() });
  const hostels = state.hostels.filter(
    (h) =>
      state.currentUser?.role === "admin" ||
      state.currentUser?.assignedHostelIds?.includes(h.id),
  );
  const scoped = hostelId ?? selection;
  const bookings = state.bookings.filter(
    (b) =>
      hostels.some((h) => h.id === b.hostelId) &&
      (scoped === "all" || b.hostelId === scoped),
  );
  const ids = new Set(bookings.map((b) => b.id));
  const entries = (state.financeEntries ?? []).filter((e) =>
    ids.has(e.bookingId),
  );
  const report = financeSummary(bookings, entries);
  const submit = async () => {
    if (busy) return;
    const body = JSON.stringify([bookingId, kind, amount, reason]);
    if (key.current.body !== body)
      key.current = { body, id: crypto.randomUUID() };
    setBusy(true);
    try {
      const result = await appStore.action("recordFinanceEntry", [
        bookingId,
        kind,
        Number(amount),
        reason,
        key.current.id,
      ]);
      setNotice(result.success ? w("saved") : (result.error ?? w("error")));
    } finally {
      setBusy(false);
    }
  };
  const download = () => {
    const csv = toCsv([
      ["id", "booking", "kind", "AMD", "reason", "createdAt"],
      ...entries.map((e) => [
        e.id,
        e.bookingId,
        e.kind,
        e.amountAMD,
        e.reason,
        e.createdAt,
      ]),
    ]);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    link.download = "settlements.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
  return (
    <section className="space-y-5" data-testid="finance-panel">
      <div className="flex flex-wrap gap-3 justify-between">
        <h2 className="font-semibold text-xl">{w("finance")}</h2>
        <button className="button-secondary" onClick={download}>
          {w("export")}
        </button>
      </div>
      <select
        aria-label={w("property")}
        className="field"
        value={scoped}
        disabled={!!hostelId}
        onChange={(e) => setSelection(e.target.value)}
      >
        <option value="all">{w("all")}</option>
        {hostels.map((h) => (
          <option key={h.id} value={h.id}>
            {getLocalized(h.name)}
          </option>
        ))}
      </select>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(
          [
            "bookingValue",
            "propertyPayment",
            "expected",
            "received",
            "balance",
          ] as const
        ).map((label) => (
          <article className="surface p-5" key={label}>
            <p className="text-sm text-muted">{w(label)}</p>
            <strong className="block mt-3 text-xl">
              {report[
                label === "bookingValue" ? "reservationValue" : label
              ].toLocaleString(currentLang)}{" "}
              AMD
            </strong>
          </article>
        ))}
      </div>
      <div className="surface p-5 grid sm:grid-cols-2 gap-3">
        <select
          className="field"
          aria-label={w("name")}
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
        >
          <option value="">—</option>
          {bookings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.guestName} · {b.trackingCode}
            </option>
          ))}
        </select>
        <select
          className="field"
          aria-label={w("transactionType")}
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          {(state.currentUser?.role === "admin"
            ? ["property_payment", "settlement", "adjustment"]
            : ["property_payment"]
          ).map((k) => (
            <option key={k} value={k}>
              {w(
                k === "property_payment"
                  ? "recordPayment"
                  : (k as "settlement" | "adjustment"),
              )}
            </option>
          ))}
        </select>
        <label className="text-sm">
          {w("amount")}
          <input
            className="field mt-2 w-full"
            type="number"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="text-sm">
          {w("reason")}
          <input
            className="field mt-2 w-full"
            value={reason}
            maxLength={2000}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <button
          className="button-primary"
          disabled={busy || !bookingId || !reason || !Number(amount)}
          onClick={() => void submit()}
        >
          {w("save")}
        </button>
        {notice && <p role="status">{notice}</p>}
      </div>
      <div className="surface p-5 space-y-3 text-sm">
        <p>
          {w("confirmationRate")}:{" "}
          {report.confirmationRate === null
            ? "—"
            : (report.confirmationRate * 100).toFixed(1) + "%"}
        </p>
        <p>
          {w("averageResponse")}:{" "}
          {report.averageResponseMinutes === null
            ? "—"
            : report.averageResponseMinutes.toFixed(1)}
        </p>
        <p>
          {w("cancel")}: {report.cancellations} · {w("no_show")}:{" "}
          {report.noShows}
        </p>
        {report.rejections.filter(Boolean).map((reason, i) => (
          <p key={i}>
            {w("decline")}: {reason}
          </p>
        ))}
      </div>
      <div className="surface divide-y">
        {entries.map((e) => (
          <p key={e.id} className="p-4 text-sm">
            {workflowValue(currentLang, e.kind)} ·{" "}
            {e.amountAMD.toLocaleString(currentLang)} AMD · {e.reason} ·{" "}
            {new Date(e.createdAt).toLocaleString(currentLang,{timeZone:'Asia/Yerevan'})}
          </p>
        ))}
      </div>
    </section>
  );
}
