import React from 'react';
import { AppLanguage, Article } from '../types';
import { UI_TRANSLATIONS } from '../i18n/translations';
import {
  BookOpen,
  Calendar,
  User,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Share2,
} from 'lucide-react';

interface Props {
  currentLang: AppLanguage;
  article: Article;
  relatedArticles: Article[];
  onNavigate: (view: string, params?: any) => void;
}

const ARTICLE_DETAIL_TEXTS = {
  fa: {
    breadcrumbHome: 'صفحه اصلی',
    breadcrumbGuide: 'راهنمای ارمنستان',
    publishedDateLabel: 'تاریخ انتشار:',
    verifiedDateLabel: 'تاریخ آخرین راستی‌آزمایی میدانی:',
    authorLabel: 'نویسنده:',
    sourcesLabel: 'منابع و مراجع رسمی:',
    relatedArticlesTitle: 'مطالب مرتبط در همین دسته',
  },
  en: {
    breadcrumbHome: 'Home',
    breadcrumbGuide: 'Armenia Guide',
    publishedDateLabel: 'Published:',
    verifiedDateLabel: 'Last Field Verification Date:',
    authorLabel: 'Author:',
    sourcesLabel: 'Official Sources & References:',
    relatedArticlesTitle: 'Related Articles in this Category',
  },
  ru: {
    breadcrumbHome: 'Главная',
    breadcrumbGuide: 'Гид по Армении',
    publishedDateLabel: 'Дата публикации:',
    verifiedDateLabel: 'Дата последней проверки:',
    authorLabel: 'Автор:',
    sourcesLabel: 'Официальные источники:',
    relatedArticlesTitle: 'Похожие статьи в этой категории',
  },
  hy: {
    breadcrumbHome: 'Գլխավոր',
    breadcrumbGuide: 'Հայաստանի ուղեցույց',
    publishedDateLabel: 'Հրապարակված է՝',
    verifiedDateLabel: 'Վերջին ստուգման ամսաթիվ՝',
    authorLabel: 'Հեղինակ՝',
    sourcesLabel: 'Պաշտոնական աղբյուրներ՝',
    relatedArticlesTitle: 'Նմանատիպ նյութեր այս բաժնում',
  },
};

export const ArticleDetailView: React.FC<Props> = ({
  currentLang,
  article,
  relatedArticles,
  onNavigate,
}) => {
  const isRtl = currentLang === 'fa';
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;
  const tr = ARTICLE_DETAIL_TEXTS[currentLang] || ARTICLE_DETAIL_TEXTS.fa;
  const t = UI_TRANSLATIONS[currentLang];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-muted">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="hover:text-success cursor-pointer"
        >
          {tr.breadcrumbHome}
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={() => onNavigate('guide')}
          className="hover:text-success cursor-pointer"
        >
          {tr.breadcrumbGuide}
        </button>
        <span>/</span>
        <span className="text-content font-semibold truncate">{article.title}</span>
      </nav>

      {/* Main Article Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-success-surface text-success text-xs font-bold">
            {article.category}
          </span>
          <span className="text-xs text-muted">
            {tr.publishedDateLabel} {article.createdAt.split('T')[0]}
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-content leading-tight">
          {article.title}
        </h1>

        <p className="text-sm sm:text-base text-secondary leading-relaxed font-medium">
          {article.summary}
        </p>

        {/* Verified Date Badge */}
        <div className="p-3.5 rounded-2xl bg-canvas border border-edge text-xs text-secondary flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-success shrink-0" />
            <span>
              <strong>{tr.verifiedDateLabel}</strong> {article.lastVerifiedDate}
            </span>
          </div>
          <div className="text-muted">
            {tr.authorLabel} <strong className="text-content">{article.author}</strong>
          </div>
        </div>
      </header>

      {/* Featured Image */}
      <div className="aspect-16/9 rounded-3xl overflow-hidden bg-surface-inset">
        <img
          src={article.featuredImage}
          alt={article.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Article Content */}
      <div className="bg-surface rounded-3xl p-6 sm:p-10 border border-edge/90 shadow-xs space-y-6 text-content text-sm sm:text-base leading-relaxed whitespace-pre-line">
        {article.content}
      </div>

      {/* Sources & References */}
      {article.sources && article.sources.length > 0 && (
        <div className="p-5 rounded-2xl bg-canvas border border-edge text-xs space-y-2">
          <span className="font-bold text-content block">{tr.sourcesLabel}</span>
          <ul className="list-disc list-inside space-y-1 text-secondary">
            {article.sources.map((src, i) => (
              <li key={i}>{src}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <div className="pt-8 border-t border-edge space-y-4">
          <h2 className="text-lg font-bold text-content">{tr.relatedArticlesTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {relatedArticles.map(rel => (
              <div
                key={rel.id}
                onClick={() => onNavigate('article-detail', { slug: rel.slug })}
                className="p-4 rounded-2xl bg-surface border border-edge shadow-xs hover:border-success-edge cursor-pointer space-y-2 transition-colors"
              >
                <span className="text-[11px] font-bold text-success">{rel.category}</span>
                <h3 className="font-bold text-sm text-content line-clamp-1">{rel.title}</h3>
                <p className="text-xs text-muted line-clamp-2">{rel.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
