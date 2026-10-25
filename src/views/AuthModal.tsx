import React, { useState } from 'react';
import { AppLanguage, User } from '../types';
import { UI_TRANSLATIONS } from '../i18n/translations';
import { X, Shield, Key, User as UserIcon, AlertCircle } from 'lucide-react';
import { appStore } from '../services/store';

interface Props {
  currentLang: AppLanguage;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

const AUTH_TEXTS = {
  fa: {
    headerTitle: 'ورود به سیستم',
    quickDemoLabel: 'ورود سریع با حساب‌های آزمایشی:',
    roleAdmin: 'مدیر کل',
    roleManager: 'هاستل‌دار',
    roleTraveler: 'مسافر',
    tabLogin: 'ورود به حساب',
    tabRegister: 'ثبت‌نام اختیاری مسافر',
    emailLabel: 'ایمیل',
    passwordLabel: 'رمز عبور',
    nameLabel: 'نام و نام خانوادگی',
    phoneLabel: 'شماره تماس (اختیاری)',
    loginButton: 'ورود به سامانه',
    registerButton: 'ثبت‌نام و ورود',
    loginError: 'اطلاعات ورود نادرست است.',
    registerError: 'خطایی در ثبت‌نام رخ داد.',
  },
  en: {
    headerTitle: 'System Access',
    quickDemoLabel: 'Quick Demo Logins:',
    roleAdmin: 'Super Admin',
    roleManager: 'Hostel Host',
    roleTraveler: 'Traveler',
    tabLogin: 'Sign In',
    tabRegister: 'Optional Traveler Sign Up',
    emailLabel: 'Email Address',
    passwordLabel: 'Password',
    nameLabel: 'Full Name',
    phoneLabel: 'Phone (optional)',
    loginButton: 'Sign In',
    registerButton: 'Register & Continue',
    loginError: 'Invalid email or password.',
    registerError: 'An error occurred during registration.',
  },
  ru: {
    headerTitle: 'Вход в систему',
    quickDemoLabel: 'Быстрый вход для демо:',
    roleAdmin: 'Главный админ',
    roleManager: 'Хостельер',
    roleTraveler: 'Гость',
    tabLogin: 'Вход',
    tabRegister: 'Регистрация путешественника',
    emailLabel: 'Эл. почта',
    passwordLabel: 'Пароль',
    nameLabel: 'Полное имя',
    phoneLabel: 'Телефон (необязательно)',
    loginButton: 'Войти',
    registerButton: 'Зарегистрироваться',
    loginError: 'Неверный адрес почты или пароль.',
    registerError: 'Ошибка при регистрации.',
  },
  hy: {
    headerTitle: 'Մուտք համակարգ',
    quickDemoLabel: 'Արագ մուտք փորձնական հաշիվներով՝',
    roleAdmin: 'Գլխավոր ադմին',
    roleManager: 'Հոսթելի տեր',
    roleTraveler: 'Ճանապարհորդ',
    tabLogin: 'Մուտք գործել',
    tabRegister: 'Ճանապարհորդի գրանցում',
    emailLabel: 'Էլ. հասցե',
    passwordLabel: 'Գաղտնաբառ',
    nameLabel: 'Անուն և ազգանուն',
    phoneLabel: 'Հեռախոսահամար (ըստ ցանկության)',
    loginButton: 'Մուտք',
    registerButton: 'Գրանցվել',
    loginError: 'Մուտքանունը կամ գաղտնաբառը սխալ է:',
    registerError: 'Գրանցման սխալ տեղի ունեցավ:',
  },
};

export const AuthModal: React.FC<Props> = ({ currentLang, onClose, onSuccess }) => {
  const t = UI_TRANSLATIONS[currentLang];
  const tr = AUTH_TEXTS[currentLang] || AUTH_TEXTS.fa;
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (busy) return;
    setBusy(true);
    try {
      const res = await appStore.login(email, password);
      if (res.success && res.user) {
        onSuccess(res.user);
        onClose();
      } else {
        setError(res.error || tr.loginError);
      }
    } catch { setError(tr.loginError); } finally { setBusy(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (busy) return;
    setBusy(true);
    try {
      const res = await appStore.registerTraveler(name, email, phone, password);
      if (res.success && res.user) {
        onSuccess(res.user);
        onClose();
      } else {
        setError(res.error || tr.registerError);
      }
    } catch { setError(tr.registerError); } finally { setBusy(false); }
  };

  const fillQuickDemo = (role: 'admin' | 'manager' | 'traveler') => {
    setTab('login');
    setError('');
    if (role === 'admin') {
      setEmail('admin@yerevanhub.com');
      setPassword('Admin@2026');
    } else if (role === 'manager') {
      setEmail('manager.kentron@yerevanhub.com');
      setPassword('Hostel@2026');
    } else {
      setEmail('traveler@example.com');
      setPassword('Traveler@2026');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="brand-name font-black text-lg text-slate-900">YEREVANHUB</span>
            <span className="text-xs text-slate-400">{tr.headerTitle}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Demo Credentials Autofill */}
        {appStore.getState().demoMode && <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
          <span className="font-bold text-slate-700 block">{tr.quickDemoLabel}</span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => fillQuickDemo('admin')}
              className="py-1.5 px-2 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 font-bold hover:bg-purple-100 transition-colors text-center cursor-pointer"
            >
              {tr.roleAdmin}
            </button>
            <button
              type="button"
              onClick={() => fillQuickDemo('manager')}
              className="py-1.5 px-2 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold hover:bg-emerald-100 transition-colors text-center cursor-pointer"
            >
              {tr.roleManager}
            </button>
            <button
              type="button"
              onClick={() => fillQuickDemo('traveler')}
              className="py-1.5 px-2 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-bold hover:bg-amber-100 transition-colors text-center cursor-pointer"
            >
              {tr.roleTraveler}
            </button>
          </div>
        </div>}

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 pb-1">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold transition-colors cursor-pointer border-b-2 ${
              tab === 'login' ? 'border-amber-500 text-amber-900' : 'border-transparent text-slate-400'
            }`}
          >
            {tr.tabLogin}
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold transition-colors cursor-pointer border-b-2 ${
              tab === 'register' ? 'border-amber-500 text-amber-900' : 'border-transparent text-slate-400'
            }`}
          >
            {tr.tabRegister}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 text-xs text-red-700 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{tr.emailLabel}</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs ltr-isolate text-left font-medium"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{tr.passwordLabel}</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs ltr-isolate text-left"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-md transition-colors"
            >
              {tr.loginButton}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{tr.nameLabel}</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
                placeholder="Name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{tr.emailLabel}</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs ltr-isolate text-left font-medium"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{tr.passwordLabel}</label>
              <input type="password" required minLength={8} autoComplete="new-password" value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs ltr-isolate text-left" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{tr.phoneLabel}</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs ltr-isolate text-left"
                placeholder="+374 91 ..."
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs cursor-pointer shadow-md transition-colors"
            >
              {tr.registerButton}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
