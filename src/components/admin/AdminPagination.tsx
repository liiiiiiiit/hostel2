import { useLanguage } from "../../context/LanguageContext";
import { adminText } from "../../i18n/admin";

export function AdminPagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  const { currentLang } = useLanguage(),
    t = adminText(currentLang);
  if (pages <= 1) return null;
  return (
    <nav
      aria-label={t.page}
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <button
        type="button"
        className="button-secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        {t.previous}
      </button>
      <span role="status" className="text-sm text-slate-500">
        {t.page} {page.toLocaleString(currentLang)} {t.of}{" "}
        {pages.toLocaleString(currentLang)}
      </span>
      <button
        type="button"
        className="button-secondary"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        {t.next}
      </button>
    </nav>
  );
}
