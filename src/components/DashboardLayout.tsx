import React, { useId, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Inbox,
  LayoutDashboard,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { dashboardText, bookingStatusText } from "../i18n/dashboard";
import type { BookingStatus } from "../types";

export interface DashboardNavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  group?: string;
}
export function DashboardLayout({
  title,
  subtitle,
  nav,
  active,
  onChange,
  children,
  actions,
  disabled = false,
  sidebarFooter,
  organized = false,
}: {
  title: string;
  subtitle?: string;
  nav: DashboardNavItem[];
  active: string;
  onChange: (id: string) => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
  disabled?: boolean;
  sidebarFooter?: React.ReactNode;
  organized?: boolean;
}) {
  const { currentLang } = useLanguage(),
    t = dashboardText(currentLang);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId(),
    content = useRef<HTMLDivElement>(null),
    menuButton = useRef<HTMLButtonElement>(null);
  const selected = nav.find((item) => item.id === active);
  const change = (id: string) => {
    if (disabled) return;
    onChange(id);
    setMenuOpen(false);
    requestAnimationFrame(() =>
      content.current?.focus({ preventScroll: true }),
    );
  };
  return (
    <div
      className={`${organized ? "dashboard-organized " : ""}dashboard-shell max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8`}
    >
      <header className="dashboard-heading flex flex-wrap items-center justify-between gap-5 mb-6">
        <div className="min-w-0">
          <p className="eyebrow mb-2 flex items-center gap-2">
            <LayoutDashboard size={14} />
            YEREVANHUB <span aria-hidden="true">/</span>{" "}
            {organized ? title : t.workspace}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
            {organized ? (selected?.label ?? title) : title}
          </h1>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-2 max-w-2xl">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="dashboard-actions flex flex-wrap gap-2">
            {actions}
          </div>
        )}
      </header>
      <div className="grid lg:grid-cols-[236px_minmax(0,1fr)] gap-5 lg:gap-7 items-start">
        <aside className="dashboard-sidebar lg:sticky lg:top-24 min-w-0">
          <button
            ref={menuButton}
            type="button"
            className="dashboard-menu-toggle lg:hidden"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {selected?.icon}
            <span className="flex-1 text-start">
              {selected?.label ?? t.menu}
            </span>
            <ChevronDown size={18} className={menuOpen ? "rotate-180" : ""} />
          </button>
          <nav
            id={menuId}
            aria-label={t.menu}
            className={`dashboard-nav ${menuOpen ? "is-open" : ""}`}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setMenuOpen(false);
                menuButton.current?.focus();
              }
            }}
          >
            <p className="dashboard-nav-caption eyebrow">{t.menu}</p>
            {nav.map((item, index) => (
              <React.Fragment key={item.id}>
                {item.group && item.group !== nav[index - 1]?.group && (
                  <h2 className="dashboard-nav-group">{item.group}</h2>
                )}
                <button
                  type="button"
                  key={item.id}
                  disabled={disabled}
                  data-testid={`workspace-tab-${item.id}`}
                  aria-current={active === item.id ? "page" : undefined}
                  onClick={() => change(item.id)}
                  className={`dashboard-nav-item ${active === item.id ? "is-active" : ""}`}
                >
                  {item.icon}
                  <span className="min-w-0 flex-1">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="dashboard-nav-count">
                      {item.count.toLocaleString(currentLang)}
                    </span>
                  )}
                </button>
              </React.Fragment>
            ))}
            {sidebarFooter && (
              <div className="dashboard-sidebar-footer">{sidebarFooter}</div>
            )}
          </nav>
        </aside>
        <div
          ref={content}
          tabIndex={-1}
          aria-label={selected?.label}
          className="dashboard-content min-w-0 space-y-6"
          key={active}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
export function DashboardStat({
  label,
  value,
  icon,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm text-slate-500">{label}</span>
        {icon && (
          <span className="dashboard-stat-icon" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2 mt-3">
        <strong className="text-3xl text-slate-950 font-semibold tabular-nums">
          {value}
        </strong>
        {onClick && (
          <ArrowUpRight
            size={17}
            className="text-slate-400"
            aria-hidden="true"
          />
        )}
      </div>
    </>
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className="dashboard-stat text-start"
    >
      {content}
    </button>
  ) : (
    <div className="dashboard-stat">{content}</div>
  );
}
export function DashboardEmpty({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 sm:p-10 text-center">
      <Inbox
        className="w-9 h-9 mx-auto text-slate-400 mb-4"
        aria-hidden="true"
      />
      <p className="font-medium text-slate-700">{title}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { currentLang } = useLanguage();
  const color =
    status === "confirmed" || status === "completed"
      ? "bg-emerald-50 text-emerald-800"
      : status === "pending"
        ? "bg-amber-50 text-amber-900"
        : status === "rejected" || status === "no_show"
          ? "bg-rose-50 text-rose-800"
          : "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${color}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-current shrink-0"
        aria-hidden="true"
      />
      {bookingStatusText(status, currentLang)}
    </span>
  );
}
