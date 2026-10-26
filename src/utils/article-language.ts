import type { Article, AppLanguage } from "../types/index.js";
export function articleInLanguage(
  article: Article,
  language: AppLanguage,
): Article | undefined {
  if (article.language === language) return article;
  const translation = article.translations?.[language];
  return translation?.title.trim() && translation.content.trim()
    ? { ...article, ...translation, language }
    : undefined;
}
