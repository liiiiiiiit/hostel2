import React, { useState, useMemo } from 'react';
import { AppLanguage, TravelPhrase } from '../types';
import { UI_TRANSLATIONS } from '../i18n/translations';
import {
  Languages,
  ArrowRightLeft,
  Copy,
  Check,
  Maximize2,
  X,
  Sparkles,
} from 'lucide-react';
import { translateText } from '../services/translator';

interface Props {
  currentLang: AppLanguage;
  phrases: TravelPhrase[];
}

export const TranslatorView: React.FC<Props> = ({ currentLang, phrases }) => {
  const t = UI_TRANSLATIONS[currentLang];

  const [sourceLang, setSourceLang] = useState<AppLanguage | 'auto'>('fa');
  const [targetLang, setTargetLang] = useState<AppLanguage>('hy');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLargeModal, setShowLargeModal] = useState(false);
  const [selectedPhraseCategory, setSelectedPhraseCategory] = useState('all');
  const [translationError,setTranslationError]=useState('');
  const [translatorNote, setTranslatorNote] = useState<string>('');

  const categories = useMemo(() => [
    { id: 'all', label: t.allCategories },
    { id: 'taxi', label: t.catTaxi },
    { id: 'hostel', label: t.catHostel },
    { id: 'rent', label: t.catRent },
    { id: 'shopping', label: t.catShopping },
    { id: 'dining', label: t.catDining },
    { id: 'emergency', label: t.catEmergency },
  ], [t]);

  const handleSwap = () => {
    if (sourceLang === 'auto') return;
    const prevSource = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(prevSource);
    setInputText(outputText);
    setOutputText(inputText);
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsTranslating(true);
    setTranslatorNote('');setTranslationError('');setOutputText('');

    try {
      const res = await translateText(inputText, sourceLang, targetLang,currentLang);
      setOutputText(res.text);
      if (res.notes) setTranslatorNote(res.notes);
    } catch(error) {
      setTranslationError(error instanceof Error?error.message:{fa:'ترجمه انجام نشد.',en:'Translation failed.',ru:'Не удалось перевести.',hy:'Թարգմանությունը չհաջողվեց։'}[currentLang]);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);}
    catch {setTranslationError({fa:'کپی نشد؛ متن را دستی انتخاب کنید.',en:'Copy failed. Select the text manually.',ru:'Не удалось скопировать. Выделите текст вручную.',hy:'Չհաջողվեց պատճենել։ Ընտրեք տեքստը ձեռքով։'}[currentLang]);}
  };

  const handleSelectPhrase = (phrase: TravelPhrase) => {
    const inputPhrase = phrase[currentLang];
    setInputText(inputPhrase);
    const destination=currentLang==='hy'?'fa':'hy';setOutputText(phrase[destination]);setTranslationError('');setTranslatorNote('');
    setSourceLang(currentLang);
    setTargetLang(destination);
  };

  const filteredPhrases = phrases.filter(
    p => selectedPhraseCategory === 'all' || p.category === selectedPhraseCategory
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-info-surface text-info text-xs font-bold">
          <Languages className="w-4 h-4 text-info" />
          <span>YEREVANHUB</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-content">
          {t.translatorPageTitle}
        </h1>
        <p className="text-xs sm:text-sm text-muted">
          {t.translatorSubtitle}
        </p>
      </div>

      {/* Main Translator Box */}
      <div className="bg-surface rounded-3xl border border-edge/90 shadow-xl overflow-hidden">
        {/* Language Selection Header */}
        <div className="bg-canvas border-b border-edge p-3 sm:p-4 flex items-center justify-between gap-3">
          {/* Source Lang */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-bold text-muted hidden sm:inline">{t.translatorSourceLabel}</span>
            <select
              value={sourceLang}
              onChange={e => setSourceLang(e.target.value as any)}
              className="bg-surface border border-edge rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-content focus:ring-2 focus:ring-focus"
            >
              <option value="auto">Auto Detect</option>
              <option value="fa">فارسی (Persian)</option>
              <option value="en">English</option>
              <option value="ru">Русский (Russian)</option>
              <option value="hy">Հայերեն (Armenian)</option>
            </select>
          </div>

          {/* Swap Button */}
          <button
            type="button"
            disabled={sourceLang === 'auto'}
            onClick={handleSwap}
            className="p-2 rounded-xl bg-surface border border-edge hover:bg-surface-inset disabled:opacity-40 text-secondary cursor-pointer transition-colors shadow-xs"
            title="Swap"
            aria-label="Swap languages"
          >
            <ArrowRightLeft className="w-4 h-4 text-info" />
          </button>

          {/* Target Lang */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <span className="text-xs font-bold text-muted hidden sm:inline">{t.translatorTargetLabel}</span>
            <select
              value={targetLang}
              onChange={e => setTargetLang(e.target.value as any)}
              className="bg-surface border border-edge rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-content focus:ring-2 focus:ring-focus"
            >
              <option value="hy">Հայերեն (Armenian)</option>
              <option value="fa">فارسی (Persian)</option>
              <option value="en">English</option>
              <option value="ru">Русский (Russian)</option>
            </select>
          </div>
        </div>

        {/* Text Areas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-edge">
          {/* Input Area */}
          <div className="p-4 sm:p-6 flex flex-col justify-between space-y-4 min-h-[220px]">
            <textarea
              rows={6}
              placeholder={t.typeOrPasteText}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              maxLength={2000}
              className="w-full bg-transparent resize-none text-sm sm:text-base text-content placeholder:text-muted  leading-relaxed font-sans"
            />

            <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-edge">
              <span>{inputText.length} / 2000</span>
              {inputText && (
                <button
                  type="button"
                  onClick={() => setInputText('')}
                  className="text-muted hover:text-secondary cursor-pointer"
                >
                  {t.clearText}
                </button>
              )}
            </div>
          </div>

          {/* Output Area */}
          <div className="p-4 sm:p-6 bg-canvas/50 flex flex-col justify-between space-y-4 min-h-[220px]">
            <div className="flex-1">
              {isTranslating ? (
                <div className="flex items-center gap-2 text-info text-sm py-4 animate-pulse">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>{t.translatingAction}</span>
                </div>
              ) : outputText ? (
                <p className={`text-base sm:text-lg font-bold text-content leading-relaxed select-all ${targetLang === 'hy' ? 'armenian-text' : 'font-sans'}`} dir={targetLang === 'fa' ? 'rtl' : 'ltr'}>
                  {outputText}
                </p>
              ) : (
                <span className="text-muted text-sm">{t.translationAppearsHere}</span>
              )}
            </div>

            {/* Actions for result */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-edge/80">
              <span className="text-[11px] text-muted truncate max-w-[200px]">
                {translatorNote}
              </span>

              {translationError&&<p role="alert" className="rounded-xl bg-danger-surface p-3 text-sm text-danger">{translationError}</p>}
              {outputText && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowLargeModal(true)}
                    className="p-1.5 rounded-lg bg-surface border border-edge hover:bg-surface-inset text-secondary text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                    title={t.fullscreenDisplay}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.fullscreenDisplay}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(outputText)}
                    className="p-1.5 rounded-lg bg-surface border border-edge hover:bg-surface-inset text-secondary text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? t.copiedText : t.copyText}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Translate Action Bar */}
        <div className="bg-canvas p-4 border-t border-edge flex items-center justify-between">
          <span className="text-xs text-muted">
            {t.privacyTranslationNote}
          </span>

          <button
            type="button"
            disabled={isTranslating || !inputText.trim()}
            onClick={handleTranslate}
            className="px-6 py-2.5 rounded-xl bg-info-solid hover:bg-info-solid-hover active:bg-info-solid-hover disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t.translateButton}</span>
          </button>
        </div>
      </div>

      {/* Practical Travel Phrasebook Section */}
      <div className="space-y-6 pt-6 border-t border-edge">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-content flex items-center gap-2">
              <span>{t.travelPhrasesTitle}</span>
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {t.travelPhrasesSubtitle}
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedPhraseCategory(cat.id)}
                className={`px-3 py-1 rounded-xl font-medium cursor-pointer ${
                  selectedPhraseCategory === cat.id
                    ? 'bg-info-solid text-white'
                    : 'bg-surface border border-edge text-secondary hover:bg-canvas'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Phrases List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPhrases.map(phrase => {
            const displayNative = currentLang === 'en' ? phrase.en : currentLang === 'ru' ? phrase.ru : phrase.fa;

            return (
              <div
                key={phrase.id}
                onClick={() => handleSelectPhrase(phrase)}
                className="p-4 rounded-2xl bg-surface border border-edge hover:border-info-edge shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2.5 group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-surface-inset text-secondary font-semibold">
                    {phrase.category}
                  </span>
                  <span className="text-[11px] text-muted font-mono" dir="ltr">
                    {phrase.phoneticHy}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-secondary font-medium">
                    {displayNative}
                  </div>
                  <div className="text-base sm:text-lg font-bold text-content armenian-text group-hover:text-info transition-colors" dir="ltr">
                    {phrase.hy}
                  </div>
                </div>

                {phrase.note && (
                  <div className="text-[11px] text-accent bg-warning-surface p-1.5 rounded-lg">
                    {phrase.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Large Text Presentation Modal for Showing to Driver / Local */}
      {showLargeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-brand text-on-brand max-w-2xl w-full rounded-3xl p-6 sm:p-10 space-y-6 shadow-2xl border border-brand-edge">
            <div className="flex items-center justify-between border-b border-brand-edge pb-4">
              <span className="text-xs text-on-brand-gold font-bold uppercase tracking-wider">
                {t.largeModalTitle}
              </span>
              <button
                type="button"
                onClick={() => setShowLargeModal(false)}
                className="p-1.5 rounded-xl bg-brand-raised hover:bg-brand-raised text-on-brand-muted cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-center">
              <p className={`text-2xl sm:text-4xl font-bold text-on-brand-gold tracking-wide leading-relaxed ${targetLang === 'hy' ? 'armenian-text' : 'font-sans'}`} dir={targetLang === 'fa' ? 'rtl' : 'ltr'}>
                {outputText}
              </p>
              <p className="text-sm text-on-brand-muted border-t border-brand-edge pt-4">
                {inputText}
              </p>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowLargeModal(false)}
                className="px-6 py-2.5 rounded-xl bg-gold hover:bg-gold-hover text-on-gold font-bold text-xs sm:text-sm cursor-pointer shadow-md"
              >
                {t.closeButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
