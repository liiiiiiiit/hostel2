import {workflowText} from '../i18n/workflows';
import React, { useEffect, useRef, useState } from 'react';
import type { AppLanguage, User } from '../types';
import { X, ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { appStore } from '../services/store';
interface Props { currentLang: AppLanguage; onClose: () => void; onSuccess: (user: User) => void }
const copy = {
  fa: { title: 'خوش آمدید', intro: 'رزروها و سفرهایتان، در یک جا.', login: 'ورود', register: 'ساخت حساب', email: 'ایمیل', password: 'رمز عبور', name: 'نام و نام خانوادگی', phone: 'تلفن (اختیاری)', submit: 'ورود به حساب', create: 'ساخت حساب و ادامه', close: 'بستن', show: 'نمایش رمز', hide: 'پنهان‌کردن رمز', minimum: 'حداقل ۸ کاراکتر', working: 'لطفاً صبر کنید…', demo: 'حساب‌های آزمایشی', admin: 'مدیر سایت', manager: 'هاستل‌دار', traveler: 'مسافر', error: 'درخواست انجام نشد. دوباره تلاش کنید.', private: 'اطلاعات حساب شما خصوصی می‌ماند.', preview: 'ورود و ثبت‌نام در این پیش‌نمایش فعال نیست.' },
  en: { title: 'Welcome back', intro: 'Your stays and trips, in one place.', login: 'Sign In', register: 'Create account', email: 'Email address', password: 'Password', name: 'Full name', phone: 'Phone (optional)', submit: 'Sign In', create: 'Create account', close: 'Close', show: 'Show password', hide: 'Hide password', minimum: 'At least 8 characters', working: 'Please wait…', demo: 'Demo accounts', admin: 'Administrator', manager: 'Host', traveler: 'Traveler', error: 'Something went wrong. Please try again.', private: 'Your account details stay private.', preview: 'Sign-in and registration are not enabled in this preview.' },
  ru: { title: 'Добро пожаловать', intro: 'Ваши бронирования и поездки в одном месте.', login: 'Вход', register: 'Регистрация', email: 'Эл. почта', password: 'Пароль', name: 'Имя и фамилия', phone: 'Телефон (необязательно)', submit: 'Войти', create: 'Создать аккаунт', close: 'Закрыть', show: 'Показать пароль', hide: 'Скрыть пароль', minimum: 'Не менее 8 символов', working: 'Подождите…', demo: 'Демо-аккаунты', admin: 'Администратор', manager: 'Владелец', traveler: 'Путешественник', error: 'Не удалось выполнить запрос. Повторите попытку.', private: 'Данные вашего аккаунта конфиденциальны.', preview: 'Вход и регистрация пока недоступны в предпросмотре.' },
  hy: { title: 'Բարի գալուստ', intro: 'Ձեր ամրագրումներն ու ուղևորությունները մեկ տեղում։', login: 'Մուտք', register: 'Գրանցում', email: 'Էլ. հասցե', password: 'Գաղտնաբառ', name: 'Անուն և ազգանուն', phone: 'Հեռախոս (ըստ ցանկության)', submit: 'Մուտք գործել', create: 'Ստեղծել հաշիվ', close: 'Փակել', show: 'Ցույց տալ գաղտնաբառը', hide: 'Թաքցնել գաղտնաբառը', minimum: 'Առնվազն 8 նիշ', working: 'Սպասեք…', demo: 'Փորձնական հաշիվներ', admin: 'Ադմինիստրատոր', manager: 'Հոսթելի տեր', traveler: 'Ճանապարհորդ', error: 'Հարցումը չկատարվեց։ Փորձեք կրկին։', private: 'Ձեր հաշվի տվյալները գաղտնի են։', preview: 'Նախադիտման մուտքն ու գրանցումը դեռ հասանելի չեն։' },
};
export const AuthModal: React.FC<Props> = ({ currentLang, onClose, onSuccess }) => {
  const t = copy[currentLang];
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [name, setName] = useState(''); const [phone, setPhone] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [visible, setVisible] = useState(false);
  const dialog = useRef<HTMLDivElement>(null); const busyRef = useRef(busy); busyRef.current = busy;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) onClose();
      if (event.key !== 'Tab') return;
      const elements = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),[tabindex="0"]') ?? [])].filter(element => element.getClientRects().length > 0);
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); if (previous?.isConnected) previous.focus(); };
  }, []);
  useEffect(() => { (dialog.current?.querySelector(tab === 'register' ? '#auth-name' : '#auth-email') as HTMLElement | null)?.focus(); }, [tab]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return; setError(''); setBusy(true);
    try {
      const result = tab === 'login' ? await appStore.login(email, password) : await appStore.registerTraveler(name, email, phone, password);
      if (result.success && result.user) { onSuccess(result.user); onClose(); }
      else setError(result.error || t.error);
    } catch { setError(t.error); } finally { setBusy(false); }
  };
  const demo = (role: 'admin' | 'manager' | 'traveler') => {
    setTab('login'); setError(''); setEmail(role === 'admin' ? 'admin@yerevanhub.com' : role === 'manager' ? 'manager.kentron@yerevanhub.com' : 'traveler@example.com');
    setPassword(role === 'admin' ? 'Admin@2026' : role === 'manager' ? 'Hostel@2026' : 'Traveler@2026');
  };
  return <div className="fixed inset-0 z-[70] bg-brand/55 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="auth-title" className="bg-surface rounded-[1.75rem] shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto p-6 sm:p-8">
      <div className="flex items-center justify-between mb-7"><span className="brand-name text-xs tracking-[.2em]">YEREVANHUB</span><button className="p-2 rounded-full hover:bg-surface-inset" type="button" aria-label={t.close} onClick={onClose} disabled={busy}><X size={20} /></button></div>
      <h1 id="auth-title" className="text-2xl font-bold mb-2">{t.title}</h1><p className="text-sm text-muted mb-6">{t.intro}</p>
      {appStore.getState().previewMode ? <p role="status" className="p-4 rounded-xl bg-warning-surface text-sm">{t.preview}</p> : <>
        <div role="tablist" className="flex bg-surface-inset rounded-xl p-1 mb-6">{(['login','register'] as const).map(value => <button key={value} id={`auth-${value}-tab`} role="tab" aria-selected={tab === value} aria-controls="auth-form" type="button" disabled={busy} onClick={() => { setTab(value); setError(''); }} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === value ? 'bg-surface shadow-sm' : 'text-muted'}`}>{value === 'login' ? t.login : t.register}</button>)}</div>
        <form id="auth-form" role="tabpanel" aria-labelledby={`auth-${tab}-tab`} onSubmit={submit} className="space-y-4">
          {tab === 'register' && <div><label className="field-label" htmlFor="auth-name">{t.name}</label><input id="auth-name" autoComplete="name" required maxLength={100} value={name} onChange={event => setName(event.target.value)} className="field" /></div>}
          <div><label className="field-label" htmlFor="auth-email">{t.email}</label><input id="auth-email" type="email" autoComplete="email" required maxLength={254} dir="ltr" placeholder="name@example.com" value={email} onChange={event => setEmail(event.target.value)} className="field text-start" /></div>
          <div><label className="field-label" htmlFor="auth-password">{t.password}</label><div className="relative"><input id="auth-password" type={visible ? 'text' : 'password'} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} required minLength={tab === 'register' ? 8 : undefined} maxLength={128} dir="ltr" value={password} onChange={event => setPassword(event.target.value)} className="field !pe-12" /><button type="button" className="absolute end-2 top-2 p-2 text-muted" aria-label={visible ? t.hide : t.show} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{tab === 'register' && <p className="text-xs text-muted mt-1">{t.minimum}</p>}</div>
          {tab === 'register' && <div><label className="field-label" htmlFor="auth-phone">{t.phone}</label><input id="auth-phone" type="tel" autoComplete="tel" dir="ltr" maxLength={50} value={phone} onChange={event => setPhone(event.target.value)} className="field" /></div>}
          {error && <p role="alert" className="bg-danger-surface text-danger rounded-xl p-3 text-sm">{error}</p>}
          <button type="submit" disabled={busy} className="button-primary w-full !mt-6">{busy ? t.working : tab === 'login' ? t.submit : t.create}<ArrowRight size={17} className={currentLang === 'fa' ? 'rotate-180' : ''} /></button>
        {tab==='login'&&<button type="button" className="text-sm underline" disabled={busy||!email} onClick={async()=>{setBusy(true);try{const result=await appStore.action('requestPasswordRecovery',[email,currentLang]);setError(result.success?workflowText(currentLang)('recoverySent'):result.error||t.error);}finally{setBusy(false);}}}>{workflowText(currentLang)('forgot')}</button>}</form>
        {appStore.getState().demoMode && <details className="border-t border-edge pt-4 mt-6 text-xs"><summary className="text-muted">{t.demo}</summary><div className="flex gap-2 mt-3">{(['admin','manager','traveler'] as const).map(role => <button key={role} type="button" disabled={busy} onClick={() => demo(role)} className="border rounded-lg p-2 flex-1">{t[role]}</button>)}</div></details>}
        <p className="flex gap-2 justify-center items-center text-xs text-muted mt-6"><LockKeyhole size={13} />{t.private}</p>
      </>}
    </div>
  </div>;
};
