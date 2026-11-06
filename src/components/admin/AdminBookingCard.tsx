import { useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Users,
  Wallet,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { dashboardText } from "../../i18n/dashboard";
import { adminText } from "../../i18n/admin";
import { workflowText } from "../../i18n/workflows";
import { BookingStatusBadge } from "../DashboardLayout";
import { BookingWorkflow } from "../BookingWorkflow";
import type { Booking, BookingStatus } from "../../types";

export function AdminBookingCard({
  booking: b,
  busy,
  onNavigate,
  onStatus,
}: {
  booking: Booking;
  busy: boolean;
  onNavigate: (view: string, params?: Record<string, string>) => void;
  onStatus: (booking: Booking, status: BookingStatus) => void;
}) {
  const { currentLang, tAdmin } = useLanguage(),
    t = dashboardText(currentLang),
    a = adminText(currentLang);
  const [expanded, setExpanded] = useState(false);
  return (
    <article className="surface admin-booking p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="admin-guest-avatar" aria-hidden="true">
            {Array.from(b.guestName)[0]}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-950 break-words">
              {b.guestName}
            </h3>
            <p className="text-sm text-slate-500 mt-1 break-words">
              {b.hostelName} · {b.roomTypeName}
            </p>
          </div>
        </div>
        <BookingStatusBadge status={b.status} />
      </div>
      <dl className="admin-booking-details grid sm:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
        <div>
          <dt>
            <CalendarDays size={14} />
            {tAdmin.tableColDates}
          </dt>
          <dd className="ltr-isolate tabular-nums">
            {b.checkIn} → {b.checkOut}
          </dd>
        </div>
        <div>
          <dt>{t.contact}</dt>
          <dd className="ltr-isolate break-all">{b.guestContact}</dd>
        </div>
        <div>
          <dt>
            <Wallet size={14} />
            {t.amount}
          </dt>
          <dd className="font-semibold">
            {b.finalAmountAMD.toLocaleString(currentLang)}{" "}
            <span className="font-normal text-xs">AMD</span>
          </dd>
        </div>
        <div>
          <dt>
            <Users size={14} />
            {tAdmin.tableColGuests}
          </dt>
          <dd>
            {b.guestsCount.toLocaleString(currentLang)} ·{" "}
            {workflowText(currentLang)("quantity")}:{" "}
            {b.quantity.toLocaleString(currentLang)}
          </dd>
        </div>
      </dl>
      {b.entranceIssueReported && b.status === "confirmed" && (
        <p className="bg-rose-50 text-rose-800 rounded-xl p-3 text-sm">
          {t.unresolved}: {b.entranceIssueNote}
        </p>
      )}
      {b.specialRequests && (
        <p className="text-sm bg-slate-50 rounded-xl p-3">
          {t.guestNote}: {b.specialRequests}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <span className="font-mono text-xs text-slate-500 break-all">
          {b.trackingCode}
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="button-secondary"
            onClick={() =>
              onNavigate("booking-track", { token: b.privateToken })
            }
          >
            {t.viewBooking}
            <ArrowUpRight size={15} />
          </button>
          {b.status === "pending" && (
            <>
              <button
                className="button-primary"
                disabled={busy}
                onClick={() => onStatus(b, "confirmed")}
              >
                {t.confirm}
              </button>
              <button
                className="button-secondary text-rose-700"
                disabled={busy}
                onClick={() => onStatus(b, "rejected")}
              >
                {t.reject}
              </button>
            </>
          )}
          {b.status === "confirmed" && (
            <button
              type="button"
              className="button-secondary"
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {a.manage}
              <ChevronDown size={15} />
            </button>
          )}
        </div>
      </div>
      {expanded && b.status === "confirmed" && (
        <BookingWorkflow booking={b} manager />
      )}
    </article>
  );
}
