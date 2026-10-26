import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { workflowText, workflowValue } from "../i18n/workflows";
import { appStore } from "../services/store";
import { addCalendarDays, yerevanToday } from "../utils/dates";
import { BookingWorkflow } from "./BookingWorkflow";
export function ReceptionPanel({ hostelId }: { hostelId?: string }) {
  const { currentLang, getLocalized } = useLanguage(),
    w = workflowText(currentLang),
    state = appStore.getState(),
    actor = state.currentUser;
  const hostels = state.hostels.filter(
    (h) => actor?.role === "admin" || actor?.assignedHostelIds?.includes(h.id),
  );
  const [selection, setSelection] = useState(hostelId ?? hostels[0]?.id ?? "");
  const h = hostels.find((h) => h.id === (hostelId ?? selection)) ?? hostels[0];
  const [roomId, setRoomId] = useState(""),
    [date, setDate] = useState(yerevanToday()),
    [to, setTo] = useState(addCalendarDays(yerevanToday(), 1)),
    [name, setName] = useState(""),
    [contact, setContact] = useState(""),
    [guests, setGuests] = useState(1),
    [quantity, setQuantity] = useState(1),
    [source, setSource] = useState("walk_in"),
    [reason, setReason] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const manualKey = useRef(crypto.randomUUID());
  const [termsAccepted, setTermsAccepted] = useState(false);
  useEffect(() => {
    manualKey.current = crypto.randomUUID();
  }, [
    selection,
    roomId,
    date,
    to,
    name,
    contact,
    guests,
    quantity,
    source,
    reason,
  ]);
  const room = h?.roomTypes.find((r) => r.id === roomId) ?? h?.roomTypes[0];
  const bookings = state.bookings.filter((b) => b.hostelId === h?.id);
  const today = yerevanToday();
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
  const input = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    type = "text",
  ) => (
    <label className="text-sm">
      {label}
      <input
        className="field mt-2 w-full"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
  if (!h || !room) return <p>{w("unavailable")}</p>;
  return (
    <section className="space-y-5" data-testid="reception-panel">
      <h2 className="text-xl font-semibold">{w("operations")}</h2>
      <div className="surface p-5 grid sm:grid-cols-3 gap-4">
        <select
          aria-label={w("operations")}
          className="field"
          value={h.id}
          disabled={!!hostelId}
          onChange={(e) => {
            setSelection(e.target.value);
            setSelected([]);
            setRoomId("");
          }}
        >
          {hostels.map((h) => (
            <option value={h.id} key={h.id}>
              {getLocalized(h.name)}
            </option>
          ))}
        </select>
        <select
          aria-label={w("roomType")}
          className="field"
          value={room.id}
          onChange={(e) => {
            setRoomId(e.target.value);
            setSelected([]);
          }}
        >
          {h.roomTypes.map((r) => (
            <option value={r.id} key={r.id}>
              {getLocalized(r.name)}
            </option>
          ))}
        </select>
        {input(w("checkIn"), date, setDate, "date")}
      </div>
      {notice && (
        <p role="status" className="surface p-4">
          {notice}
        </p>
      )}
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            [
              "arrivals",
              bookings.filter(
                (b) => b.status === "confirmed" && b.checkIn === today,
              ),
            ],
            [
              "departures",
              bookings.filter(
                (b) => b.status === "confirmed" && b.checkOut === today,
              ),
            ],
            [
              "staying",
              bookings.filter(
                (b) =>
                  b.checkedInAt && !b.checkedOutAt && b.status === "confirmed",
              ),
            ],
          ] as const
        ).map(([key, list]) => (
          <div className="surface p-4" key={key}>
            <p className="text-sm">{w(key)}</p>
            <strong className="text-2xl">{list.length}</strong>
          </div>
        ))}
      </div>
      <div className="surface p-4 overflow-auto">
        <table className="w-full text-sm min-w-[480px]">
          <caption className="text-start font-semibold pb-4">
            {w("operations")} · {getLocalized(room.name)}
          </caption>
          <thead>
            <tr>
              {[w("checkIn"), w("unitIds"), w("quantity"), w("name")].map(
                (label) => (
                  <th className="text-start p-3" key={label}>
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 14 }, (_, offset) =>
              addCalendarDays(date || today, offset),
            ).map((day) => {
              const daily = state.availability.find(
                (d) =>
                  d.hostelId === h.id &&
                  d.roomTypeId === room.id &&
                  d.date === day,
              );
              const reserved = bookings.filter(
                (b) =>
                  b.roomTypeId === room.id &&
                  b.status === "confirmed" &&
                  b.checkIn <= day &&
                  b.checkOut > day,
              );
              const blocks = (state.unitBlocks ?? []).filter(
                (b) =>
                  !b.releasedAt &&
                  b.hostelId === h.id &&
                  b.roomTypeId === room.id &&
                  b.from <= day &&
                  b.to > day,
              );
              return (
                <tr key={day} className="border-t">
                  <td className="p-3">{day}</td>
                  <td className="p-3">
                    {blocks
                      .flatMap((b) => b.unitIds)
                      .map(
                        (id) =>
                          room.physicalUnits?.find((u) => u.id === id)?.label,
                      )
                      .join(", ") || "—"}
                  </td>
                  <td className="p-3">{daily?.available ?? "—"}</td>
                  <td className="p-3">
                    {reserved
                      .map(
                        (b) =>
                          b.guestName +
                          " [" +
                          (b.assignedUnitIds
                            ?.map(
                              (id) =>
                                room.physicalUnits?.find((u) => u.id === id)
                                  ?.label,
                            )
                            .join(", ") ?? "—") +
                          "]",
                      )
                      .join(" · ") || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <details className="surface p-5">
        <summary className="font-semibold cursor-pointer">
          {w("manual")}
        </summary>
        <div className="grid sm:grid-cols-2 gap-4 pt-4">
          {input(w("name"), name, setName)}
          {input(w("contact"), contact, setContact)}
          {input(w("checkOut"), to, setTo, "date")}
          {input(
            w("guests"),
            String(guests),
            (v) => setGuests(Number(v)),
            "number",
          )}
          {input(
            w("quantity"),
            String(quantity),
            (v) => setQuantity(Number(v)),
            "number",
          )}
          <select
            aria-label={w("source")}
            className="field"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            {["walk_in", "telephone", "external"].map((key) => (
              <option value={key} key={key}>
                {w(key as "walk_in" | "telephone" | "external")}
              </option>
            ))}
          </select>
          {input(w("reason"), reason, setReason)}
        </div>
        <label className="flex gap-2 text-sm mt-4">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          {w("terms")}
        </label>
        <button
          disabled={busy || !name || !contact || !reason || !termsAccepted}
          className="button-primary mt-4"
          onClick={() =>
            void run("recordExternalBooking", [
              {
                hostelId: h.id,
                roomTypeId: room.id,
                checkIn: date,
                checkOut: to,
                guestName: name,
                guestContact: contact,
                contactType: contact.includes("@") ? "email" : "phone",
                guestsCount: guests,
                quantity,
                source,
                reason,
                acceptedTerms: true,
                idempotencyKey: manualKey.current,
              },
            ])
          }
        >
          {w("save")}
        </button>
      </details>
      <details className="surface p-5">
        <summary className="font-semibold cursor-pointer">{w("block")}</summary>
        <div className="grid sm:grid-cols-2 gap-4 pt-4">
          {input(w("checkOut"), to, setTo, "date")}
          {input(w("reason"), reason, setReason)}
        </div>
        <div className="flex flex-wrap gap-3 py-4">
          {room.physicalUnits?.map((unit) => (
            <label key={unit.id} className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(unit.id)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, unit.id]
                      : selected.filter((id) => id !== unit.id),
                  )
                }
              />
              {unit.label}
            </label>
          ))}
        </div>
        <button
          disabled={busy || !selected.length || !reason}
          className="button-primary"
          onClick={() =>
            void run("blockUnits", [
              {
                hostelId: h.id,
                roomTypeId: room.id,
                unitIds: selected,
                from: date,
                to,
                reason,
              },
            ])
          }
        >
          {w("block")}
        </button>
        {(state.unitBlocks ?? [])
          .filter((b) => b.hostelId === h.id && !b.releasedAt)
          .map((block) => (
            <div
              className="flex flex-wrap items-center gap-3 mt-3"
              key={block.id}
            >
              <span>
                {block.from} → {block.to} · {block.reason}
              </span>
              <button
                disabled={busy || !reason}
                className="button-secondary"
                onClick={() => void run("releaseUnitBlock", [block.id, reason])}
              >
                {w("release")}
              </button>
            </div>
          ))}
      </details>
      {bookings
        .filter(
          (b) => b.checkIn <= addCalendarDays(date, 14) && b.checkOut >= date,
        )
        .map((b) => (
          <details className="surface p-5" key={b.id}>
            <summary className="cursor-pointer font-medium">
              {b.guestName} · {b.checkIn} → {b.checkOut} ·{" "}
              {workflowValue(currentLang, b.status)}
            </summary>
            <BookingWorkflow booking={b} manager />
          </details>
        ))}
    </section>
  );
}
