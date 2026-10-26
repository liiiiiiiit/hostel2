import {requiredUnits} from '../utils/occupancy';
import React, { useState,useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { workflowText, workflowValue } from "../i18n/workflows";
import { appStore } from "../services/store";
import type { Booking } from "../types";
import { addCalendarDays, yerevanToday } from "../utils/dates";
export function BookingWorkflow({
  booking,
  manager = false,
}: {
  booking: Booking;
  manager?: boolean;
}) {
  const { currentLang } = useLanguage(),
    w = workflowText(currentLang);
  const state = appStore.getState();
  const identifier = manager ? booking.id : booking.privateToken;
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [reason, setReason] = useState(""),
    [from, setFrom] = useState(booking.checkIn),
    [to, setTo] = useState(booking.checkOut),
    [guests, setGuests] = useState(booking.guestsCount),
    [changeQuantity,setChangeQuantity]=useState(booking.quantity),
    [units, setUnits] = useState<string[]>(booking.assignedUnitIds ?? []),
    [message, setMessage] = useState(""),
    [category, setCategory] = useState<"arrival" | "change" | "question">(
      "question",
    );
  const run = async (action: string, args: unknown[]) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await appStore.action(action, args);
      setNotice(result.success ? w("saved") : (result.error ?? w("error")));
    } finally {
      setBusy(false);
    }
  };
  const room = state.hostels
    .find((h) => h.id === booking.hostelId)
    ?.roomTypes.find((r) => r.id === booking.roomTypeId);
  useEffect(()=>{if(room&&guests!==booking.guestsCount)setChangeQuantity(requiredUnits(room,guests)??booking.quantity);},[guests,room?.id]);
  return (
    <section className="surface p-5 space-y-5" data-testid="booking-workflow">
      <h2 className="font-semibold">{w(manager ? "operations" : "terms")}</h2>
      <p className="text-sm text-slate-500">
        {w("hours")}: {state.settings.supportHours?.[currentLang] || "—"}
      </p>
      {notice && (
        <p role="status" className="text-sm bg-slate-50 rounded-xl p-3">
          {notice}
        </p>
      )}
      <p className="text-sm">
        {w("source")}: {workflowValue(currentLang, booking.source ?? "website")}{" "}
        · {w("deadline")}:{" "}
        <time>{new Date(booking.expiresAt).toLocaleString(currentLang,{timeZone:'Asia/Yerevan'})}</time>
      </p>
      {booking.agreement && (
        <details>
          <summary className="cursor-pointer text-sm">{w("terms")}</summary>
          <p className="whitespace-pre-line text-sm leading-7 mt-3">
            {booking.agreement.cancellationPolicyLocalized?.[currentLang] ??
              booking.agreement.cancellationPolicy}
          </p>
          {booking.agreement.cancellationRule && (
            <p className="text-sm">
              {w("cutoff")}:{" "}
              {booking.agreement.cancellationRule.freeBeforeHours} ·{" "}
              {w("penalty")}:{" "}
              {booking.agreement.cancellationRule.penaltyPercent}%
            </p>
          )}
        </details>
      )}
      <label className="block text-sm">
        {w("reason")}
        <input
          aria-label={w("reason")}
          className="field mt-2 w-full"
          maxLength={2000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {manager && booking.status === "confirmed" && (
        <>
          <fieldset>
            <legend className="text-sm mb-3">{w("unitIds")}</legend>
            <div className="flex flex-wrap gap-3">
              {room?.physicalUnits?.map((unit) => (
                <label
                  className="flex gap-2 items-center text-sm"
                  key={unit.id}
                >
                  <input
                    type="checkbox"
                    checked={units.includes(unit.id)}
                    onChange={(e) =>
                      setUnits(
                        e.target.checked
                          ? [...units, unit.id]
                          : units.filter((id) => id !== unit.id),
                      )
                    }
                  />
                  {unit.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button
              className="button-secondary"
              disabled={busy || units.length !== booking.quantity}
              onClick={() => void run("assignUnits", [booking.id, units])}
            >
              {w("assign")}
            </button>
            {(["check_in", "check_out", "no_show"] as const).map((event) => (
              <button
                key={event}
                className="button-secondary"
                disabled={busy || !reason.trim()}
                onClick={() =>
                  void run("recordStayEvent", [booking.id, event, reason])
                }
              >
                {w(event)}
              </button>
            ))}
          </div>
        </>
      )}
      {["pending", "confirmed"].includes(booking.status) && (
        <details>
          <summary className="cursor-pointer font-medium">
            {w("change")}
          </summary>
          <div className="grid sm:grid-cols-3 gap-3 mt-3">
            <label className="text-sm">
              {w("checkIn")}
              <input
                type="date"
                className="field w-full mt-2"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="text-sm">
              {w("checkOut")}
              <input
                type="date"
                className="field w-full mt-2"
                min={addCalendarDays(from || yerevanToday(), 1)}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <label className="text-sm">
              {w("guests")}
              <input
                type="number"
                min={1}
                max={100}
                className="field w-full mt-2"
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
              />
            </label>
            <label className="text-sm">{w('quantity')}<input className="field w-full mt-2" type="number" min={1} max={100} value={changeQuantity} onChange={e=>setChangeQuantity(Number(e.target.value))}/></label>
          </div>
          <button
            className="button-primary mt-3"
            disabled={busy || !reason.trim()}
            onClick={() =>
              void run("requestBookingChange", [
                identifier,
                { checkIn: from, checkOut: to, guestsCount: guests, quantity:changeQuantity, reason },
              ])
            }
          >
            {w("propose")}
          </button>
        </details>
      )}
      {(state.bookingChanges ?? [])
        .filter((p) => p.bookingId === booking.id)
        .map((proposal) => (
          <article
            className="border rounded-xl p-4 space-y-3"
            key={proposal.id}
          >
            <p>
              {proposal.checkIn} → {proposal.checkOut} · {proposal.guestsCount}{" "}
              {w("guests")}
            </p>
            <p>
              {proposal.amountAMD.toLocaleString(currentLang)} AMD ·{" "}
              {w("difference")}:{" "}
              {proposal.differenceAMD.toLocaleString(currentLang)}
            </p>
            <span className="status-pill">
              {workflowValue(currentLang, proposal.status)}
            </span>
            <div className="flex gap-2 flex-wrap">
              {!manager && proposal.status === "proposed" && (
                <button
                  disabled={busy}
                  className="button-primary"
                  onClick={() =>
                    void run("acceptBookingChange", [
                      proposal.id,
                      booking.privateToken,
                    ])
                  }
                >
                  {w("accept")}
                </button>
              )}
              {manager && proposal.status === "accepted" && (
                <button
                  disabled={busy || !reason.trim()}
                  className="button-primary"
                  onClick={() =>
                    void run("applyBookingChange", [proposal.id, reason])
                  }
                >
                  {w("approve")}
                </button>
              )}
              {manager &&
                ["proposed", "accepted"].includes(proposal.status) && (
                  <button
                    disabled={busy || !reason.trim()}
                    className="button-secondary"
                    onClick={() =>
                      void run("rejectBookingChange", [proposal.id, reason])
                    }
                  >
                    {w("decline")}
                  </button>
                )}
            </div>
          </article>
        ))}
      <details>
        <summary className="cursor-pointer font-medium">{w("support")}</summary>
        <select
          className="field mt-3"
          aria-label={w("support")}
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
        >
          {(["arrival", "change", "question"] as const).map((key) => (
            <option value={key} key={key}>
              {w(key)}
            </option>
          ))}
        </select>
        <label className="block text-sm mt-3">
          {w("message")}
          <textarea
            className="field mt-2 w-full"
            rows={3}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <button
          disabled={busy || !message.trim()}
          className="button-secondary mt-3"
          onClick={() =>
            void run("createSupportThread", [identifier, category, message])
          }
        >
          {w("send")}
        </button>
        {(state.supportThreads ?? [])
          .filter((t) => t.bookingId === booking.id)
          .map((thread) => (
            <div
              key={thread.id}
              className="border rounded-xl p-4 mt-3 space-y-3"
            >
              <span className="status-pill">{w(thread.status)}</span>
              {thread.messages.map((m) => (
                <p key={m.id} className="text-sm whitespace-pre-line">
                  <strong>{workflowValue(currentLang, m.role)}</strong> ·{" "}
                  {m.text}
                </p>
              ))}
              <button
                disabled={busy || !message.trim()}
                className="button-secondary"
                onClick={() =>
                  void run("replySupportThread", [
                    thread.id,
                    identifier,
                    message,
                  ])
                }
              >
                {w("reply")}
              </button>
              {manager && (
                <button
                  disabled={busy || !reason.trim()}
                  className="button-secondary"
                  onClick={() =>
                    void run("resolveSupportThread", [
                      thread.id,
                      identifier,
                      thread.status === "open" ? "resolved" : "open",
                      reason,
                    ])
                  }
                >
                  {w(thread.status === "open" ? "resolved" : "open")}
                </button>
              )}
            </div>
          ))}
      </details>
      <details>
        <summary className="cursor-pointer text-sm">{w("history")}</summary>
        <ol className="space-y-2 pt-3">
          {booking.history?.map((event) => (
            <li key={event.id} className="text-sm">
              {new Date(event.at).toLocaleString(currentLang,{timeZone:'Asia/Yerevan'})} ·{" "}
              {workflowValue(currentLang, event.action)} · {event.reason}
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
