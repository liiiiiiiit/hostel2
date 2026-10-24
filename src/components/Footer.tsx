import React from 'react';
import { AppLanguage } from '../types';
import { UI_TRANSLATIONS } from '../i18n/translations';
import { Building2, Phone, Send, Clock, ShieldCheck, MapPin } from 'lucide-react';

interface Props {
  currentLang: AppLanguage;
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<Props> = ({ currentLang, onNavigate }) => {
  const t = UI_TRANSLATIONS[currentLang];

  return (
    <footer className="bg-slate-900 text-slate-300 pt-14 pb-10 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-md">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="brand-name text-2xl font-black text-white tracking-wider">
                YEREVANHUB
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t.tagline}
            </p>
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-amber-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>{t.noOnlinePaymentNote}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wide uppercase mb-4">
              {t.footerSectionsTitle}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('hostels')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t.navHostels}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('rentals')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t.navRentals}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('guide')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t.navGuide}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('translator')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t.navTranslator}
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Info */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wide uppercase mb-4">
              {t.footerPoliciesTitle}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('rules')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t.bookingRules}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('privacy')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t.privacyPolicy}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('about')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t.navAbout}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {t.navContact}
                </button>
              </li>
            </ul>
          </div>

          {/* Local Contact & Coordination */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm tracking-wide uppercase mb-4">
              {t.footerAboutTitle}
            </h4>
            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Asia/Yerevan (GMT+4)</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="ltr-isolate font-mono text-slate-300">+374 10 555 123</span>
              </div>
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="ltr-isolate font-mono text-slate-300">@YerevanHubSupport</span>
              </div>
              <div className="flex items-start gap-2 pt-1">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Kentron, Yerevan, Armenia</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Rights & Timezone Notice */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>{t.footerRights}</p>
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{t.timezoneNotice}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
