import { AdminArticles } from "../components/admin/AdminArticles";
import { AdminField as Field } from "../components/admin/AdminField";
import { AdminBookingCard } from "../components/admin/AdminBookingCard";
import { AdminPagination } from "../components/admin/AdminPagination";
import { adminText } from "../i18n/admin";
import { selectAdminBookings, bookingReport } from "../utils/admin";
import { AccountSettings } from "../components/AccountSettings";
import { PlatformSettings } from "../components/PlatformSettings";
import { ReceptionPanel } from "../components/ReceptionPanel";
import { FinancePanel } from "../components/FinancePanel";
import { workflowText } from "../i18n/workflows";
import React, { useState, useRef, useSyncExternalStore } from "react";
import { PropertyManagementPanel } from "../components/PropertyManagementPanel";
import {
  LayoutDashboard,
  CalendarDays,
  Building2,
  Users,
  Tag,
  Star,
  BookOpen,
  Activity,
  Settings2,
  House,
  Search,
  Download,
  Plus,
  ArrowUpRight,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { appStore } from "../services/store";
import { useLanguage } from "../context/LanguageContext";
import { dashboardText, bookingStatusText } from "../i18n/dashboard";
import {
  DashboardLayout,
  DashboardStat,
  DashboardEmpty,
} from "../components/DashboardLayout";
import { PropertyOperationsPanel } from "../components/PropertyOperationsPanel";
import { toCsv } from "../utils/csv";
import { yerevanToday } from "../utils/dates";
import type {
  ActionResult,
  AppLanguage,
  Booking,
  BookingStatus,
  RentalInquiryStatus,
} from "../types";

interface Props {
  currentLang?: AppLanguage;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}
type Section =
  | "overview"
  | "bookings"
  | "properties"
  | "managers"
  | "coupons"
  | "reviews"
  | "rentals"
  | "articles"
  | "audit"
  | "operations"
  | "reception"
  | "finance"
  | "profile";

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const AdminPanelView: React.FC<Props> = ({ onNavigate }) => {
  const { currentLang, tAdmin, getLocalized } = useLanguage();
  const t = dashboardText(currentLang);
  const admin = adminText(currentLang);
  const state = useSyncExternalStore(appStore.subscribe, appStore.getState);
  const [section, setSection] = useState<Section>("overview");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<BookingStatus | "all">("all");
  const actionLock = useRef(false);
  const [page, setPage] = useState(1);
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [arrivalsOn, setArrivalsOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [managerForm, setManagerForm] = useState({
    name: "",
    email: "",
    password: "",
    hostels: [] as string[],
  });
  const [couponForm, setCouponForm] = useState({
    code: "",
    percent: "15",
    minimum: "0",
    maximum: "50",
    description: "",
  });
  const [replies, setReplies] = useState<Record<string, string>>({});
  const today = yerevanToday();
  const pending = state.bookings.filter((b) => b.status === "pending");
  const pendingReviews = state.reviews.filter((r) => r.status === "pending");
  const inquiries = state.rentalInquiries.filter(
    (i) => i.status === "pending_review",
  );
  const unresolved = state.bookings.filter(
    (b) => b.entranceIssueReported && b.status === "confirmed",
  );
  const go = (id: string) => {
    if (actionLock.current) return;
    setSection(id as Section);
    setShowForm(false);
    setFeedback(null);
  };
  const run = async (task: () => Promise<ActionResult>, done?: () => void) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await task();
      setFeedback({
        ok: result.success,
        text: result.success ? t.saved : result.error || t.noResults,
      });
      if (result.success) done?.();
    } catch (error) {
      setFeedback({
        ok: false,
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };
  const filtered = selectAdminBookings(state.bookings, {
    status,
    query,
    issuesOnly,
    arrivalsOn,
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pageCount);
  const visibleBookings = filtered.slice(
    (currentPage - 1) * 10,
    currentPage * 10,
  );
  const nav = [
    { id: "overview", label: t.overview, icon: <LayoutDashboard size={17} /> },
    {
      id: "bookings",
      label: t.bookings,
      icon: <CalendarDays size={17} />,
      count: pending.length,
    },
    { id: "properties", label: t.properties, icon: <Building2 size={17} /> },
    { id: "operations", label: t.operations, icon: <Settings2 size={17} /> },
    { id: "managers", label: t.managers, icon: <Users size={17} /> },
    { id: "coupons", label: t.coupons, icon: <Tag size={17} /> },
    {
      id: "reviews",
      label: t.reviews,
      icon: <Star size={17} />,
      count: pendingReviews.length,
    },
    {
      id: "rentals",
      label: t.rentals,
      icon: <House size={17} />,
      count: inquiries.length,
    },
    { id: "articles", label: t.articles, icon: <BookOpen size={17} /> },
    { id: "audit", label: t.audit, icon: <Activity size={17} /> },
    {
      id: "reception",
      label: workflowText(currentLang)("operations"),
      icon: <CalendarDays size={17} />,
    },
    {
      id: "finance",
      label: workflowText(currentLang)("finance"),
      icon: <House size={17} />,
    },
    {
      id: "profile",
      label: workflowText(currentLang)("profile"),
      icon: <Users size={17} />,
    },
  ];
  const exportCsv = () =>
    download(
      `bookings-${today}.csv`,
      "\uFEFF" +
        toCsv([
          [
            "TrackingCode",
            "Guest",
            "Contact",
            "Hostel",
            "Room",
            "CheckIn",
            "CheckOut",
            "Quantity",
            "AmountAMD",
            "Status",
          ],
          ...filtered.map((b) => [
            b.trackingCode,
            b.guestName,
            b.guestContact,
            b.hostelName,
            b.roomTypeName,
            b.checkIn,
            b.checkOut,
            b.quantity,
            b.finalAmountAMD,
            b.status,
          ]),
        ]),
      "text/csv;charset=utf-8",
    );
  const changeStatus = (b: Booking, next: BookingStatus) => {
    const reason = ["rejected", "cancelled", "no_show"].includes(next)
      ? window.prompt(workflowText(currentLang)("reason"))
      : undefined;
    if (reason === null || (reason !== undefined && !reason.trim())) return;
    void run(() => appStore.updateBookingStatus(b.id, next, reason));
  };
  const bookingCard = (b: Booking) => (
    <AdminBookingCard
      key={b.id}
      booking={b}
      busy={busy}
      onNavigate={onNavigate}
      onStatus={changeStatus}
    />
  );
  const createManager = (event: React.FormEvent) => {
    event.preventDefault();
    void run(
      () =>
        appStore.createHostelManager({
          name: managerForm.name,
          email: managerForm.email,
          initialPassword: managerForm.password,
          assignedHostelIds: managerForm.hostels,
        }),
      () => {
        setShowForm(false);
        setManagerForm({ name: "", email: "", password: "", hostels: [] });
      },
    );
  };
  const createCoupon = (event: React.FormEvent) => {
    event.preventDefault();
    void run(
      () =>
        appStore.addCoupon({
          code: couponForm.code,
          percent: Number(couponForm.percent),
          minAmountAMD: Number(couponForm.minimum),
          maxUses: Number(couponForm.maximum),
          usedCount: 0,
          active: true,
          startsAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
          description: couponForm.description,
        }),
      () => {
        setShowForm(false);
        setCouponForm({ ...couponForm, code: "", description: "" });
      },
    );
  };
  const formActions = (
    <div className="flex gap-2 pt-2">
      <button className="button-primary" disabled={busy}>
        {busy ? t.saving : t.save}
      </button>
      <button
        type="button"
        className="button-secondary"
        onClick={() => setShowForm(false)}
      >
        {t.cancel}
      </button>
    </div>
  );
  const sectionHeader = (label: string, add?: () => void) => (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-semibold text-lg text-slate-950">{label}</h2>
      {add && (
        <button className="button-primary" disabled={busy} onClick={add}>
          <Plus size={16} />
          {t.add}
        </button>
      )}
    </div>
  );
  const actions = (
    <>
      <button className="button-secondary" onClick={exportCsv}>
        <Download size={15} />
        {t.download}
      </button>
      <button
        className="button-secondary"
        onClick={() =>
          download(
            `bookings-${today}.json`,
            JSON.stringify(
              {
                exportedAt: new Date().toISOString(),
                currency: "AMD",
                bookings: bookingReport(filtered),
              },
              null,
              2,
            ),
            "application/json",
          )
        }
      >
        {t.backup}
      </button>
    </>
  );
  return (
    <div data-testid="admin-dashboard" className="admin-workspace">
      <DashboardLayout
        title={t.admin}
        subtitle={t.welcome}
        nav={nav}
        active={section}
        onChange={go}
        actions={actions}
        disabled={busy}
      >
        {feedback && (
          <div
            role={feedback.ok ? "status" : "alert"}
            className={`rounded-xl border p-4 text-sm flex items-center gap-2 ${feedback.ok ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"}`}
          >
            {feedback.ok ? <Check size={16} /> : <X size={16} />}
            <span>{feedback.text}</span>
          </div>
        )}
        {section === "overview" && (
          <>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <DashboardStat
                label={t.needsAction}
                value={pending.length}
                icon={<CalendarDays size={18} />}
                onClick={() => {
                  go("bookings");
                  setStatus("pending");
                  setArrivalsOn("");
                  setQuery("");
                  setIssuesOnly(false);
                  setPage(1);
                }}
              />
              <DashboardStat
                label={t.todayArrivals}
                icon={<CalendarDays size={18} />}
                value={
                  state.bookings.filter(
                    (b) => b.checkIn === today && b.status === "confirmed",
                  ).length
                }
                onClick={() => {
                  go("bookings");
                  setStatus("confirmed");
                  setQuery("");
                  setArrivalsOn(today);
                  setIssuesOnly(false);
                  setPage(1);
                }}
              />
              <DashboardStat
                label={t.reviewCount}
                icon={<Star size={18} />}
                value={pendingReviews.length}
                onClick={() => go("reviews")}
              />
              <DashboardStat
                label={t.propertiesCount}
                icon={<Building2 size={18} />}
                value={state.hostels.length}
                onClick={() => go("properties")}
              />
            </div>
            {unresolved.length > 0 && (
              <button
                className="w-full text-start surface p-4 border-rose-200 text-rose-800"
                onClick={() => {
                  go("bookings");
                  setStatus("all");
                  setQuery("");
                  setIssuesOnly(true);
                  setArrivalsOn("");
                  setPage(1);
                }}
              >
                {t.unresolved} · {unresolved.length}
              </button>
            )}
            <div className="surface p-5">
              <h2 className="font-semibold mb-4">{t.shortcuts}</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  className="button-primary"
                  onClick={() => go("operations")}
                >
                  <Settings2 size={16} />
                  {t.manageProperty}
                </button>
                <button
                  className="button-secondary"
                  onClick={() => {
                    go("managers");
                    setShowForm(true);
                  }}
                >
                  <Users size={16} />
                  {tAdmin.createManagerTitle}
                </button>
                <button
                  className="button-secondary"
                  onClick={() => {
                    go("articles");
                    setShowForm(true);
                  }}
                >
                  <Plus size={16} />
                  {tAdmin.createArticleTitle}
                </button>
              </div>
            </div>
            {sectionHeader(t.recentBookings)}
            <div className="space-y-4">
              {selectAdminBookings(state.bookings, {})
                .slice(0, 5)
                .map(bookingCard)}
              {state.bookings.length === 0 && (
                <DashboardEmpty title={t.noResults} />
              )}
            </div>
          </>
        )}
        {section === "bookings" && (
          <>
            {sectionHeader(t.bookings)}
            <div className="surface p-4 flex flex-wrap gap-3">
              <label className="relative flex-1 min-w-0 basis-64">
                <Search
                  size={17}
                  className="absolute start-3 top-3.5 text-slate-400"
                />
                <input
                  className="field ps-10 w-full"
                  aria-label={t.search}
                  placeholder={t.search}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <select
                className="field sm:max-w-52"
                aria-label={tAdmin.tableColStatus}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as typeof status);
                  setPage(1);
                }}
              >
                <option value="all">{t.all}</option>
                {(
                  [
                    "pending",
                    "confirmed",
                    "completed",
                    "cancelled",
                    "rejected",
                    "expired",
                    "no_show",
                  ] as const
                ).map((s) => (
                  <option key={s} value={s}>
                    {bookingStatusText(s, currentLang)}
                  </option>
                ))}
              </select>
              <Field label={t.todayArrivals}>
                <input
                  type="date"
                  className="field"
                  value={arrivalsOn}
                  onChange={(e) => {
                    setArrivalsOn(e.target.value);
                    setPage(1);
                  }}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={issuesOnly}
                  onChange={(e) => {
                    setIssuesOnly(e.target.checked);
                    setPage(1);
                  }}
                />
                {t.unresolved}
              </label>
            </div>
            <p role="status" className="text-sm text-slate-500">
              {admin.results}: {filtered.length.toLocaleString(currentLang)}
            </p>
            {visibleBookings.map(bookingCard)}
            <AdminPagination
              page={currentPage}
              pages={pageCount}
              onChange={setPage}
            />
            {!filtered.length && (
              <DashboardEmpty title={t.noResults}>
                <p className="text-sm text-slate-500">{t.tryFilter}</p>
              </DashboardEmpty>
            )}
          </>
        )}
        {section === "profile" && (
          <>
            <AccountSettings />
            <PlatformSettings />
          </>
        )}
        {section === "reception" && <ReceptionPanel />}
        {section === "finance" && <FinancePanel />}
        {section === "operations" && <PropertyOperationsPanel />}
        {section === "properties" && <PropertyManagementPanel />}
        {section === "managers" && (
          <>
            {sectionHeader(t.managers, () => setShowForm(!showForm))}
            {showForm && (
              <form className="surface p-5 space-y-5" onSubmit={createManager}>
                <fieldset disabled={busy} className="space-y-5 min-w-0">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label={tAdmin.managerNameLabel}>
                      <input
                        required
                        className="field w-full"
                        value={managerForm.name}
                        onChange={(e) =>
                          setManagerForm({
                            ...managerForm,
                            name: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label={tAdmin.managerEmailLabel}>
                      <input
                        required
                        type="email"
                        className="field w-full"
                        value={managerForm.email}
                        onChange={(e) =>
                          setManagerForm({
                            ...managerForm,
                            email: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label={tAdmin.initialPasswordLabel}>
                      <input
                        required
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={128}
                        className="field w-full"
                        value={managerForm.password}
                        onChange={(e) =>
                          setManagerForm({
                            ...managerForm,
                            password: e.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                  <fieldset>
                    <legend className="text-sm font-medium mb-3">
                      {tAdmin.assignedHostelLabel}
                    </legend>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {state.hostels.map((h) => (
                        <label
                          className="flex items-center gap-2 text-sm"
                          key={h.id}
                        >
                          <input
                            type="checkbox"
                            checked={managerForm.hostels.includes(h.id)}
                            onChange={(e) =>
                              setManagerForm({
                                ...managerForm,
                                hostels: e.target.checked
                                  ? [...managerForm.hostels, h.id]
                                  : managerForm.hostels.filter(
                                      (id) => id !== h.id,
                                    ),
                              })
                            }
                          />
                          {getLocalized(h.name)}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="button-primary"
                      disabled={busy || !managerForm.hostels.length}
                    >
                      {busy ? t.saving : t.save}
                    </button>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => setShowForm(false)}
                    >
                      {t.cancel}
                    </button>
                  </div>
                </fieldset>
              </form>
            )}
            {!state.users.some((user) => user.role === "hostel_manager") && (
              <DashboardEmpty title={t.noResults} />
            )}
            <div className="space-y-3">
              {state.users
                .filter((u) => u.role === "hostel_manager")
                .map((user) => (
                  <article
                    className="surface p-5 flex flex-wrap justify-between gap-4 items-center"
                    key={user.id}
                  >
                    <div>
                      <h3 className="font-semibold">{user.name}</h3>
                      <p className="text-sm text-slate-500 mt-1 ltr-isolate">
                        {user.email}
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        {user.assignedHostelIds
                          ?.map((id) =>
                            getLocalized(
                              state.hostels.find((h) => h.id === id)?.name,
                            ),
                          )
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                    <button
                      disabled={busy}
                      className="button-secondary"
                      onClick={() =>
                        void run(() => appStore.toggleManagerActive(user.id))
                      }
                    >
                      {user.isActive ? t.disable : t.enable}
                    </button>
                  </article>
                ))}
            </div>
          </>
        )}
        {section === "coupons" && (
          <>
            {sectionHeader(t.coupons, () => setShowForm(!showForm))}
            {showForm && (
              <form className="surface p-5 space-y-4" onSubmit={createCoupon}>
                <fieldset disabled={busy} className="space-y-4 min-w-0">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {(
                      [
                        ["code", tAdmin.couponCodeLabel],
                        ["percent", tAdmin.couponPercentLabel],
                        ["minimum", tAdmin.couponMinAmountLabel],
                        ["maximum", tAdmin.couponMaxUsesLabel],
                        ["description", tAdmin.couponDescLabel],
                      ] as const
                    ).map(([key, label]) => (
                      <Field label={label} key={key}>
                        <input
                          className="field w-full"
                          required={key !== "description"}
                          type={
                            ["percent", "minimum", "maximum"].includes(key)
                              ? "number"
                              : "text"
                          }
                          step={key === "maximum" ? 1 : "any"}
                          min={0}
                          max={key === "percent" ? 100 : undefined}
                          value={couponForm[key]}
                          onChange={(e) =>
                            setCouponForm({
                              ...couponForm,
                              [key]: e.target.value,
                            })
                          }
                        />
                      </Field>
                    ))}
                  </div>
                  {formActions}
                </fieldset>
              </form>
            )}
            {!state.coupons.length && <DashboardEmpty title={t.noResults} />}
            <div className="grid xl:grid-cols-2 gap-4">
              {state.coupons.map((c) => (
                <article className="surface p-5" key={c.code}>
                  <div className="flex justify-between gap-3">
                    <h3 className="font-mono font-semibold">{c.code}</h3>
                    <strong className="text-emerald-800">{c.percent}%</strong>
                  </div>
                  <p className="text-sm text-slate-500 mt-3">{c.description}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {tAdmin.colUsage}: {c.usedCount} / {c.maxUses || "∞"} ·{" "}
                    {tAdmin.colExpires}:{" "}
                    {new Date(c.expiresAt).toLocaleDateString(currentLang, {
                      timeZone: "Asia/Yerevan",
                    })}
                  </p>
                  <div className="flex gap-2 mt-5">
                    <button
                      className="button-secondary"
                      disabled={busy}
                      onClick={() =>
                        void run(() => appStore.toggleCoupon(c.code))
                      }
                    >
                      {c.active ? t.disable : t.enable}
                    </button>
                    <button
                      className="button-secondary text-rose-700"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(t.removeConfirm))
                          void run(() => appStore.deleteCoupon(c.code));
                      }}
                    >
                      <Trash2 size={15} />
                      {t.remove}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        {section === "reviews" && (
          <>
            {sectionHeader(t.reviews)}
            {!state.reviews.length && <DashboardEmpty title={t.noResults} />}
            <div className="space-y-4">
              {state.reviews.map((review) => (
                <article className="surface p-5 space-y-4" key={review.id}>
                  <div className="flex justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{review.guestName}</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {review.hostelName}
                      </p>
                    </div>
                    <span className="text-sm text-amber-700">
                      ★ {review.rating} / 5
                    </span>
                  </div>
                  <p className="text-sm leading-7 text-slate-600">
                    {review.comment}
                  </p>
                  <Field label={t.reply}>
                    <textarea
                      className="field w-full"
                      rows={2}
                      value={replies[review.id] ?? review.adminReply ?? ""}
                      onChange={(e) =>
                        setReplies({ ...replies, [review.id]: e.target.value })
                      }
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <span className="status-pill">
                      {review.status === "approved"
                        ? t.enabled
                        : review.status === "pending"
                          ? t.pending
                          : t.rejected}
                    </span>
                    <button
                      className="button-primary"
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          appStore.moderateReview(
                            review.id,
                            "approved",
                            replies[review.id] ?? review.adminReply,
                          ),
                        )
                      }
                    >
                      {t.approve}
                    </button>
                    <button
                      className="button-secondary"
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          appStore.moderateReview(
                            review.id,
                            "rejected",
                            replies[review.id] ?? review.adminReply,
                          ),
                        )
                      }
                    >
                      {t.reject}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        {section === "rentals" && (
          <>
            {sectionHeader(t.rentals)}
            {!state.rentalInquiries.length && (
              <DashboardEmpty title={t.noResults} />
            )}
            <div className="space-y-4">
              {state.rentalInquiries.map((inquiry) => (
                <article className="surface p-5 space-y-4" key={inquiry.id}>
                  <div className="flex justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{inquiry.guestName}</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {inquiry.propertyTitle}
                      </p>
                    </div>
                    <span className="status-pill">
                      {inquiry.requestType === "visit" ? t.visit : t.rent}
                    </span>
                  </div>
                  <p className="text-sm ltr-isolate">{inquiry.contact}</p>
                  {inquiry.notes && (
                    <p className="text-sm text-slate-600">{inquiry.notes}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <select
                      aria-label={tAdmin.tableColStatus}
                      className="field"
                      disabled={busy}
                      value={inquiry.status}
                      onChange={(e) =>
                        void run(() =>
                          appStore.updateRentalInquiryStatus(
                            inquiry.id,
                            e.target.value as RentalInquiryStatus,
                          ),
                        )
                      }
                    >
                      {(
                        [
                          "pending_review",
                          "coordinating",
                          "proposed_terms",
                          "agreed",
                          "rejected",
                          "cancelled",
                          "completed",
                        ] as const
                      ).map((key) => (
                        <option key={key} value={key}>
                          {t[key]}
                        </option>
                      ))}
                    </select>
                    <button
                      className="button-secondary"
                      onClick={() =>
                        onNavigate("rental-track", {
                          token: inquiry.privateToken,
                        })
                      }
                    >
                      {t.open}
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        {section === "articles" && (
          <AdminArticles onNavigate={onNavigate} initiallyOpen={showForm} />
        )}
        {section === "audit" && (
          <>
            {sectionHeader(t.audit)}
            <div className="surface overflow-hidden divide-y divide-slate-100">
              {state.auditLogs.slice(0, 100).map((log) => (
                <article
                  className="p-4 grid sm:grid-cols-[160px_1fr] gap-3 text-sm"
                  key={log.id}
                >
                  <time
                    className="text-slate-400 text-xs"
                    dateTime={log.timestamp}
                  >
                    {new Date(log.timestamp).toLocaleString(currentLang, {
                      timeZone: "Asia/Yerevan",
                    })}
                  </time>
                  <div>
                    <p className="font-medium">{log.actorName}</p>
                    <p className="text-slate-500 mt-1 break-words">
                      {log.details}
                    </p>
                  </div>
                </article>
              ))}
            </div>
            {!state.auditLogs.length && <DashboardEmpty title={t.noResults} />}
          </>
        )}
      </DashboardLayout>
    </div>
  );
};
