import React, { useState, useMemo } from 'react';
import { AppLanguage, Article } from '../types';
import { UI_TRANSLATIONS } from '../i18n/translations';
import {
  BookOpen,
  Search,
  Calendar,
  Tag,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  currentLang: AppLanguage;
  articles: Article[];
  onNavigate: (view: string, params?: any) => void;
}

export const GuideView: React.FC<Props> = ({
  currentLang,
  articles,
  onNavigate,
}) => {
  const t = UI_TRANSLATIONS[currentLang];
  const isRtl = currentLang === 'fa';
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const CATEGORIES = useMemo(() => [
    { id: 'all', label: t.allCategories },
    { id: 'visa', label: currentLang === 'en' ? 'Visa & Residency' : currentLang === 'ru' ? 'Виза и ВНЖ' : currentLang === 'hy' ? 'Վիզա և կացություն' : 'ویزا و اقامت' },
    { id: 'cost', label: currentLang === 'en' ? 'Cost of Living' : currentLang === 'ru' ? 'Стоимость жизни' : currentLang === 'hy' ? 'Ապրուստի արժեք' : 'هزینه‌های سفر و زندگی' },
    { id: 'first_time', label: currentLang === 'en' ? 'First-time Guide' : currentLang === 'ru' ? 'Первый визит' : currentLang === 'hy' ? 'Առաջին այցելություն' : 'راهنمای اولین سفر و تازهواردها' },
    { id: 'taxi', label: currentLang === 'en' ? 'Taxi & Transit' : currentLang === 'ru' ? 'Такси и транспорт' : currentLang === 'hy' ? 'Տաքսի և տրանսպորտ' : 'تاکسی و حمل‌ونقل عمومی' },
    { id: 'money', label: currentLang === 'en' ? 'Currency & Money' : currentLang === 'ru' ? 'Валюта и банки' : currentLang === 'hy' ? 'Արժույթ և բանկեր' : 'پول و صرافی' },
    { id: 'sim', label: currentLang === 'en' ? 'SIM & Internet' : currentLang === 'ru' ? 'Связь и интернет' : currentLang === 'hy' ? 'Կապ և ինտերնետ' : 'سیم‌کارت و اینترنت' },
  ], [t, currentLang]);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = useMemo(() => {
    return articles
      .filter(a => a.status === 'published')
      .filter(a => {
        if (selectedCategory !== 'all') {
          // match category partial
          const catObj = CATEGORIES.find(c => c.id === selectedCategory);
          if (catObj && !a.category.includes(catObj.id) && !a.category.includes(catObj.label)) {
            // fuzzy match
            if (selectedCategory === 'visa' && !a.category.includes('ویزا')) return false;
            if (selectedCategory === 'cost' && !a.category.includes('هزینه')) return false;
            if (selectedCategory === 'taxi' && !a.category.includes('تاکسی') && !a.category.includes('حمل')) return false;
            if (selectedCategory === 'money' && !a.category.includes('پول') && !a.category.includes('صرافی')) return false;
            if (selectedCategory === 'sim' && !a.category.includes('سیم') && !a.category.includes('اینترنت')) return false;
          }
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            a.title.toLowerCase().includes(q) ||
            a.summary.toLowerCase().includes(q) ||
            a.tags.some(tag => tag.toLowerCase().includes(q))
          );
        }
        return true;
      });
  }, [articles, selectedCategory, searchQuery, CATEGORIES]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>{t.guideRefBadge}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900">
          {t.guidePageTitle}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          {t.guidePageSubtitle}
        </p>
      </div>

      {/* Search & Categories Bar */}
      <div className="space-y-4">
        <div className="relative max-w-xl mx-auto">
          <Search className="w-4 h-4 text-slate-400 absolute top-3.5 right-4 pointer-events-none" />
          <input
            type="text"
            placeholder={t.searchGuidePlaceholder}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 pr-11 text-sm shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredArticles.map(article => (
          <div
            key={article.id}
            onClick={() => onNavigate('article-detail', { slug: article.slug })}
            className="group bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col cursor-pointer"
          >
            <div className="aspect-16/10 overflow-hidden bg-slate-100 relative">
              <img
                src={article.featuredImage}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-medium shadow-xs">
                {article.category}
              </span>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
                  {article.title}
                </h2>
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                  {article.summary}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1 text-emerald-800 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t.lastVerifiedLabel} {article.lastVerifiedDate}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {article.tags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 group-hover:gap-1.5 transition-all">
                    <span>{t.readMoreButton}</span>
                    <ArrowIcon className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
