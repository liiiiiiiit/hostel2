import React, { useState, useRef } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { appStore } from "../../services/store";
import { dashboardText } from "../../i18n/dashboard";
import { adminText } from "../../i18n/admin";
import { uniqueArticleSlug } from "../../utils/admin";
import { DashboardEmpty } from "../DashboardLayout";
import { AdminField as Field } from "./AdminField";
import type { ActionResult, Article, AppLanguage } from "../../types";

export function AdminArticles({
  onNavigate,
  initiallyOpen = false,
}: {
  onNavigate: (view: string, params?: Record<string, string>) => void;
  initiallyOpen?: boolean;
}) {
  const { currentLang, tAdmin } = useLanguage();
  const t = dashboardText(currentLang),
    admin = adminText(currentLang),
    state = appStore.getState();
  const [showForm, setShowForm] = useState(initiallyOpen),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const run = async (task: () => Promise<ActionResult>, done?: () => void) => {
    if (lock.current) return;
    lock.current = true;
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
      lock.current = false;
      setBusy(false);
    }
  };
  const [articleTranslations, setArticleTranslations] = useState<
    NonNullable<Article["translations"]>
  >({});
  const [articleForm, setArticleForm] = useState({
    id: "",
    title: "",
    category: "",
    summary: "",
    content: "",
    tags: "",
    image: "",
    sources: "",
    language: currentLang as AppLanguage,
    status: "draft" as "draft" | "published",
  });
  const saveArticle = (event: React.FormEvent) => {
    event.preventDefault();
    const now = new Date().toISOString();
    const existing = state.articles.find((a) => a.id === articleForm.id);
    const article: Article = {
      translations: articleTranslations,
      id: articleForm.id || `article-${crypto.randomUUID()}`,
      slug:
        existing?.slug || uniqueArticleSlug(articleForm.title, state.articles),
      title: articleForm.title.trim(),
      summary: articleForm.summary.trim(),
      category: articleForm.category.trim(),
      content: articleForm.content.trim(),
      tags: articleForm.tags
        .split(/[,،]/)
        .map((s) => s.trim())
        .filter(Boolean),
      featuredImage: articleForm.image,
      author: existing?.author || state.currentUser?.name || "YEREVANHUB",
      language: articleForm.language,
      status: articleForm.status,
      lastVerifiedDate: existing?.lastVerifiedDate || "",
      sources: articleForm.sources
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    void run(
      () => appStore.saveArticle(article),
      () => setShowForm(false),
    );
  };
  const formActions = (
    <div className="flex flex-wrap gap-2 pt-2">
      <button className="button-primary" disabled={busy}>
        {busy ? t.saving : t.save}
      </button>
      <button
        type="button"
        className="button-secondary"
        disabled={busy}
        onClick={() => setShowForm(false)}
      >
        {t.cancel}
      </button>
    </div>
  );
  const sectionHeader = (label: string, add: () => void) => (
    <div className="flex flex-wrap justify-between gap-3 items-center">
      <h2 className="font-semibold text-lg">{label}</h2>
      <button className="button-primary" disabled={busy} onClick={add}>
        <Plus size={16} />
        {t.add}
      </button>
    </div>
  );
  return (
    <section className="space-y-5">
      {feedback && (
        <p
          role={feedback.ok ? "status" : "alert"}
          className={`rounded-xl p-4 text-sm ${feedback.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}
        >
          {feedback.text}
        </p>
      )}
      <>
        {sectionHeader(t.articles, () => {
          setArticleTranslations({});
          setArticleForm({
            id: "",
            title: "",
            category: "",
            summary: "",
            content: "",
            tags: "",
            image: "",
            sources: "",
            language: currentLang,
            status: "draft",
          });
          setShowForm(true);
        })}
        {showForm && (
          <form
            className="surface p-5 space-y-4"
            onSubmit={saveArticle}
            aria-busy={busy}
          >
            <fieldset disabled={busy} className="space-y-4 min-w-0">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={tAdmin.articleTitleLabel}>
                  <input
                    required
                    maxLength={500}
                    dir={articleForm.language === "fa" ? "rtl" : "ltr"}
                    className="field w-full"
                    value={articleForm.title}
                    onChange={(e) =>
                      setArticleForm({ ...articleForm, title: e.target.value })
                    }
                  />
                </Field>
                <Field label={tAdmin.articleCategoryLabel}>
                  <input
                    required
                    className="field w-full"
                    value={articleForm.category}
                    onChange={(e) =>
                      setArticleForm({
                        ...articleForm,
                        category: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label={tAdmin.articleLangLabel}>
                  <select
                    className="field w-full"
                    value={articleForm.language}
                    onChange={(e) =>
                      setArticleForm({
                        ...articleForm,
                        language: e.target.value as AppLanguage,
                      })
                    }
                  >
                    {(["fa", "en", "ru", "hy"] as const).map((lang) => (
                      <option key={lang} value={lang}>
                        {
                          {
                            fa: "فارسی",
                            en: "English",
                            ru: "Русский",
                            hy: "Հայերեն",
                          }[lang]
                        }
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={tAdmin.articleStatusLabel}>
                  <select
                    className="field w-full"
                    value={articleForm.status}
                    onChange={(e) =>
                      setArticleForm({
                        ...articleForm,
                        status: e.target.value as "draft" | "published",
                      })
                    }
                  >
                    <option value="draft">{t.draft}</option>
                    <option value="published">{t.published}</option>
                  </select>
                </Field>
                <Field label={t.photo}>
                  <input
                    type="url"
                    className="field w-full"
                    value={articleForm.image}
                    onChange={(e) =>
                      setArticleForm({ ...articleForm, image: e.target.value })
                    }
                  />
                </Field>
                <Field label={tAdmin.articleTagsLabel}>
                  <input
                    className="field w-full"
                    value={articleForm.tags}
                    onChange={(e) =>
                      setArticleForm({ ...articleForm, tags: e.target.value })
                    }
                  />
                </Field>
              </div>
              <Field label={tAdmin.articleSummaryLabel}>
                <textarea
                  required
                  className="field w-full"
                  rows={2}
                  value={articleForm.summary}
                  onChange={(e) =>
                    setArticleForm({ ...articleForm, summary: e.target.value })
                  }
                />
              </Field>
              <Field label={tAdmin.articleContentLabel}>
                <textarea
                  required
                  className="field w-full min-h-56"
                  value={articleForm.content}
                  onChange={(e) =>
                    setArticleForm({ ...articleForm, content: e.target.value })
                  }
                />
              </Field>
              <Field label={t.sources}>
                <textarea
                  className="field w-full"
                  rows={2}
                  value={articleForm.sources}
                  onChange={(e) =>
                    setArticleForm({ ...articleForm, sources: e.target.value })
                  }
                />
              </Field>
              <fieldset className="space-y-4">
                {(["fa", "en", "ru", "hy"] as const)
                  .filter((lang) => lang !== articleForm.language)
                  .map((lang) => (
                    <details className="border rounded-xl p-4" key={lang}>
                      <summary>
                        {
                          {
                            fa: "فارسی",
                            en: "English",
                            ru: "Русский",
                            hy: "Հայերեն",
                          }[lang]
                        }
                      </summary>
                      <div className="space-y-3 mt-3">
                        {(["title", "summary", "content"] as const).map(
                          (key) => (
                            <label key={key} className="block text-sm">
                              {key === "title"
                                ? tAdmin.articleTitleLabel
                                : key === "summary"
                                  ? tAdmin.articleSummaryLabel
                                  : tAdmin.articleContentLabel}{" "}
                              · {lang}
                              <textarea
                                className="field w-full mt-2"
                                dir={lang === "fa" ? "rtl" : "ltr"}
                                value={articleTranslations[lang]?.[key] ?? ""}
                                onChange={(e) =>
                                  setArticleTranslations({
                                    ...articleTranslations,
                                    [lang]: {
                                      title: "",
                                      summary: "",
                                      content: "",
                                      ...articleTranslations[lang],
                                      [key]: e.target.value,
                                    },
                                  })
                                }
                              />
                            </label>
                          ),
                        )}
                      </div>
                    </details>
                  ))}
              </fieldset>
              {formActions}
            </fieldset>
          </form>
        )}
        <div className="space-y-3">
          {!state.articles.length && <DashboardEmpty title={t.noResults} />}
          {state.articles.map((a) => (
            <article
              className="surface p-5 flex flex-wrap justify-between gap-4 items-center"
              key={a.id}
            >
              <div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {a.category} · {a.language.toUpperCase()} ·{" "}
                  {a.status === "published" ? t.published : t.draft}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="button-secondary"
                  disabled={busy}
                  onClick={() => {
                    setArticleTranslations(a.translations ?? {});
                    setArticleForm({
                      id: a.id,
                      title: a.title,
                      category: a.category,
                      summary: a.summary,
                      content: a.content,
                      tags: a.tags.join(", "),
                      image: a.featuredImage,
                      sources: a.sources.join("\n"),
                      language: a.language,
                      status: a.status,
                    });
                    setShowForm(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <Pencil size={15} />
                  {admin.edit}
                </button>
                {a.status === "published" && (
                  <button
                    className="button-secondary"
                    onClick={() =>
                      onNavigate("article-detail", { slug: a.slug })
                    }
                  >
                    {t.open}
                  </button>
                )}
                <button
                  className="button-secondary text-rose-700"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(t.removeConfirm))
                      void run(() => appStore.deleteArticle(a.id));
                  }}
                  aria-label={`${t.remove}: ${a.title}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </>
    </section>
  );
}
