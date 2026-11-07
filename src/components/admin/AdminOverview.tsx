import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCheck,
  Clock3,
  FilePlus2,
  MessageSquare,
  Settings2,
  Star,
  UserPlus,
  House,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { dashboardText } from "../../i18n/dashboard";
import { adminText } from "../../i18n/admin";
import { selectAdminBookings } from "../../utils/admin";
import {
  BookingStatusBadge,
  DashboardEmpty,
  DashboardStat,
} from "../DashboardLayout";
import type { BookingStatus, ClientState } from "../../types";

interface Props {
  state: ClientState;
  today: string;
  onSection: (section: string) => void;
  onBookings: (options?: {
    status?: BookingStatus | "all";
    arrivalsOn?: string;
    issuesOnly?: boolean;
  }) => void;
  onNavigate: (view: string, params?: Record<string, string>) => void;
  onCreate: (section: "managers" | "articles") => void;
}

export function AdminOverview({
  state,
  today,
  onSection,
  onBookings,
  onNavigate,
  onCreate,
}: Props) {
  const { currentLang, tAdmin } = useLanguage(),
    t = dashboardText(currentLang),
    a = adminText(currentLang);
  const count = (value: number) => value.toLocaleString(currentLang);
  const pending = state.bookings.filter((b) => b.status === "pending").length;
  const reviews = state.reviews.filter((r) => r.status === "pending").length;
  const inquiries = state.rentalInquiries.filter(
    (i) => i.status === "pending_review",
  ).length;
  const issues = state.bookings.filter(
    (b) => b.entranceIssueReported && b.status === "confirmed",
  ).length;
  const arrivals = state.bookings.filter(
    (b) => b.checkIn === today && b.status === "confirmed",
  ).length;
  const published =
    state.rentals.filter((r) => r.status === "published").length +
    state.hostels.filter(
      (h) =>
        (h.listingStatus ?? (h.isPublished ? "published" : "draft")) ===
        "published",
    ).length;
  const drafts =
    state.rentals.filter((r) => r.status === "draft").length +
    state.hostels.filter(
      (h) =>
        (h.listingStatus ?? (h.isPublished ? "published" : "draft")) ===
        "draft",
    ).length;
  const recent = selectAdminBookings(state.bookings, {}).slice(0, 5);
  const attention = [
    {
      label: t.bookings,
      value: pending,
      icon: CalendarDays,
      onClick: () => onBookings({ status: "pending" }),
    },
    {
      label: t.reviewCount,
      value: reviews,
      icon: MessageSquare,
      onClick: () => onSection("reviews"),
    },
    {
      label: t.inquiryCount,
      value: inquiries,
      icon: House,
      onClick: () => onSection("rentals"),
    },
    {
      label: t.unresolved,
      value: issues,
      icon: Clock3,
      onClick: () => onBookings({ issuesOnly: true }),
    },
  ].filter((item) => item.value > 0);
  const shortcuts = [
    {
      label: t.manageProperty,
      icon: Settings2,
      action: () => onSection("operations"),
    },
    {
      label: tAdmin.createManagerTitle,
      icon: UserPlus,
      action: () => onCreate("managers"),
    },
    {
      label: tAdmin.createArticleTitle,
      icon: FilePlus2,
      action: () => onCreate("articles"),
    },
  ];
  return (
    <section className="admin-overview space-y-6" aria-label={t.overview}>
      <div className="admin-day-banner">
        <div>
          <span className="admin-day-label">
            <span aria-hidden="true" />
            {t.admin}
          </span>
          <h2>{a.overviewTitle}</h2>
          <p>{a.overviewHint}</p>
        </div>
        <time className="admin-day-date" dateTime={today}>
          <CalendarDays size={18} aria-hidden="true" />
          {new Date(`${today}T12:00:00Z`).toLocaleDateString(currentLang, {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "Asia/Yerevan",
          })}
        </time>
      </div>
      <div className="admin-stat-grid">
        <DashboardStat
          label={t.needsAction}
          value={count(pending)}
          icon={<Clock3 size={19} />}
          onClick={() => onBookings({ status: "pending" })}
        />
        <DashboardStat
          label={t.todayArrivals}
          value={count(arrivals)}
          icon={<CalendarDays size={19} />}
          onClick={() => onBookings({ status: "confirmed", arrivalsOn: today })}
        />
        <DashboardStat
          label={t.reviewCount}
          value={count(reviews)}
          icon={<Star size={19} />}
          onClick={() => onSection("reviews")}
        />
        <DashboardStat
          label={t.propertiesCount}
          value={count(state.hostels.length + state.rentals.length)}
          icon={<Building2 size={19} />}
          onClick={() => onSection("properties")}
        />
      </div>
      <div className="admin-overview-columns">
        <div className="space-y-6 min-w-0">
          <section className="surface admin-recent-panel">
            <div className="admin-panel-heading">
              <div>
                <span className="admin-panel-kicker">{t.bookings}</span>
                <h2>{t.recentBookings}</h2>
              </div>
              <button
                type="button"
                onClick={() => onBookings()}
                className="admin-text-link"
              >
                {a.viewAll}
                <ArrowUpRight size={16} />
              </button>
            </div>
            {!recent.length ? (
              <div className="p-5">
                <DashboardEmpty title={t.noResults} />
              </div>
            ) : (
              <div className="admin-recent-list">
                {recent.map((b) => (
                  <button
                    type="button"
                    className="admin-recent-row"
                    key={b.id}
                    onClick={() =>
                      onNavigate("booking-track", { token: b.privateToken })
                    }
                  >
                    <span className="admin-guest-avatar" aria-hidden="true">
                      {Array.from(b.guestName)[0]}
                    </span>
                    <span className="admin-recent-guest">
                      <strong>{b.guestName}</strong>
                      <span>
                        {b.hostelName} · {b.roomTypeName}
                      </span>
                      <time dateTime={b.checkIn}>{b.checkIn}</time>
                    </span>
                    <span className="admin-recent-amount">
                      <strong>
                        {count(b.finalAmountAMD)} <small>AMD</small>
                      </strong>
                      <BookingStatusBadge status={b.status} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
          <section className="surface p-5 sm:p-6">
            <div className="admin-panel-heading !p-0 !border-0">
              <div>
                <h2>{t.shortcuts}</h2>
                <p>{a.shortcutsHint}</p>
              </div>
            </div>
            <div className="admin-shortcuts">
              {shortcuts.map(({ label, icon: Icon, action }) => (
                <button type="button" key={label} onClick={action}>
                  <span className="admin-shortcut-icon">
                    <Icon size={21} />
                  </span>
                  <span>{label}</span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        </div>
        <div className="space-y-6 min-w-0">
          <section className="surface p-5 sm:p-6">
            <div className="admin-panel-heading !p-0 !border-0">
              <div>
                <span className="admin-panel-kicker">{t.needsAction}</span>
                <h2>{a.attention}</h2>
              </div>
              <span className="admin-attention-total">
                {count(pending + reviews + inquiries + issues)}
              </span>
            </div>
            {attention.length ? (
              <div className="admin-attention-list">
                {attention.map(({ label, value, icon: Icon, onClick }) => (
                  <button type="button" key={label} onClick={onClick}>
                    <Icon size={18} aria-hidden="true" />
                    <span>{label}</span>
                    <strong>{count(value)}</strong>
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="admin-all-clear">
                <CheckCheck size={28} aria-hidden="true" />
                <h3>{a.clear}</h3>
                <p>{a.clearHint}</p>
              </div>
            )}
          </section>
          <section className="surface p-5 sm:p-6">
            <div className="admin-panel-heading !p-0 !border-0">
              <div>
                <h2>{a.inventory}</h2>
              </div>
              <Building2 size={20} aria-hidden="true" />
            </div>
            <dl className="admin-inventory">
              <div>
                <dt>{a.published}</dt>
                <dd>{count(published)}</dd>
              </div>
              <div>
                <dt>{a.drafts}</dt>
                <dd>{count(drafts)}</dd>
              </div>
            </dl>
            <button
              type="button"
              className="button-secondary w-full mt-5"
              onClick={() => onSection("properties")}
            >
              {t.properties}
              <ArrowUpRight size={15} />
            </button>
          </section>
          <section className="surface p-5 sm:p-6">
            <div className="admin-panel-heading !p-0 !border-0">
              <div>
                <h2>{a.activity}</h2>
              </div>
              <button
                type="button"
                className="admin-text-link"
                onClick={() => onSection("audit")}
              >
                {a.viewAll}
              </button>
            </div>
            <div className="admin-activity-list">
              {state.auditLogs.slice(0, 3).map((log) => (
                <article key={log.id}>
                  <span aria-hidden="true" />
                  <div>
                    <strong>{log.actorName}</strong>
                    <p>{log.details}</p>
                    <time dateTime={log.timestamp}>
                      {new Date(log.timestamp).toLocaleString(currentLang, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Yerevan",
                      })}
                    </time>
                  </div>
                </article>
              ))}
              {!state.auditLogs.length && (
                <p className="text-sm text-slate-500 py-4">{t.noResults}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
