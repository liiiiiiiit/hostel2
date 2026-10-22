import React, { useState } from 'react';
import {
  AppLanguage,
  Booking,
  Hostel,
  RentalProperty,
  RentalInquiry,
  Coupon,
  Review,
  Article,
  AuditLog,
  User,
} from '../types';
import {
  Shield,
  Building2,
  Home,
  Tag,
  Star,
  BookOpen,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Eye,
  FileText,
  Key,
  ExternalLink,
} from 'lucide-react';
import { appStore } from '../services/store';

interface Props {
  currentLang: AppLanguage;
  onNavigate: (view: string, params?: any) => void;
}

export const AdminPanelView: React.FC<Props> = ({ currentLang, onNavigate }) => {
  const store = appStore.getState();
  const [activeTab, setActiveTab] = useState<
    'kpi' | 'bookings' | 'hostels' | 'managers' | 'coupons' | 'reviews' | 'rentals' | 'articles' | 'audit'
  >('kpi');

  // New coupon form
  const [couponCode, setCouponCode] = useState('');
  const [couponPercent, setCouponPercent] = useState(15);
  const [couponMinAmount, setCouponMinAmount] = useState(0);
  const [couponMaxUses, setCouponMaxUses] = useState(50);
  const [couponDesc, setCouponDesc] = useState('');

  // New Manager form
  const [mgrName, setMgrName] = useState('');
  const [mgrEmail, setMgrEmail] = useState('');
  const [mgrHostelId, setMgrHostelId] = useState(store.hostels[0]?.id || '');
  const [mgrPass, setMgrPass] = useState('Hostel@2026');

  // New Article form
  const [artTitle, setArtTitle] = useState('');
  const [artCategory, setArtCategory] = useState('راهنماها');
  const [artContent, setArtContent] = useState('');
  const [artSummary, setArtSummary] = useState('');

  // Review reply state
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});

  // KPIs
  const pendingBookings = store.bookings.filter(b => b.status === 'pending');
  const urgentUnanswered = store.bookings.filter(b => b.status === 'pending' && b.isImmediateArrival);
  const entranceIssues = store.bookings.filter(b => b.entranceIssueReported);
  const pendingReviews = store.reviews.filter(r => r.status === 'pending');
  const pendingRentalInquiries = store.rentalInquiries.filter(i => i.status === 'pending_review');

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    appStore.addCoupon({
      code: couponCode.trim(),
      percent: Number(couponPercent),
      minAmountAMD: Number(couponMinAmount),
      maxUses: Number(couponMaxUses),
      usedCount: 0,
      active: true,
      startsAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
      description: couponDesc.trim(),
    });
    setCouponCode('');
    setCouponDesc('');
  };

  const handleCreateManager = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mgrName || !mgrEmail) return;
    appStore.createHostelManager({
      name: mgrName,
      email: mgrEmail,
      initialPassword: mgrPass,
      assignedHostelIds: [mgrHostelId],
    });
    setMgrName('');
    setMgrEmail('');
  };

  const handleCreateArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!artTitle || !artContent) return;
    appStore.saveArticle({
      id: '',
      slug: artTitle.toLowerCase().replace(/\s+/g, '-'),
      title: artTitle,
      summary: artSummary,
      category: artCategory,
      tags: [artCategory],
      featuredImage: 'https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&w=1200&q=80',
      content: artContent,
      author: 'مدیریت YEREVANHUB',
      language: 'fa',
      status: 'published',
      lastVerifiedDate: new Date().toISOString().split('T')[0],
      sources: ['تحقیقات میدانی YEREVANHUB'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setArtTitle('');
    setArtSummary('');
    setArtContent('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black shadow-md shadow-purple-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="brand-name text-lg font-black text-slate-900">YEREVANHUB</span>
              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 text-xs font-bold">
                پنل مدیریت کل
              </span>
            </div>
            <p className="text-xs text-slate-500">
              مدیریت یکپارچه هاستل‌ها، املاک، رزروها، تخفیف‌ها، نظرات و مقالات
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
        {[
          { id: 'kpi', label: 'داشبورد و آمار اصلی', icon: Shield, badge: urgentUnanswered.length + entranceIssues.length },
          { id: 'bookings', label: 'مدیریت رزروها', icon: Clock, badge: pendingBookings.length },
          { id: 'hostels', label: 'هاستل‌ها و تخت‌ها', icon: Building2 },
          { id: 'managers', label: 'حساب‌های هاستلدار', icon: Key },
          { id: 'coupons', label: 'کدهای تخفیف درصدی', icon: Tag },
          { id: 'reviews', label: 'بررسی نظرات مسافران', icon: Star, badge: pendingReviews.length },
          { id: 'rentals', label: 'املاک و استعلام‌ها', icon: Home, badge: pendingRentalInquiries.length },
          { id: 'articles', label: 'افزودن و انتشار مقالات', icon: BookOpen },
          { id: 'audit', label: 'گزارش وقایع و امنیت', icon: FileText },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* TAB 1: KPI OVERVIEW */}
      {activeTab === 'kpi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-medium">رزروهای در انتظار تأیید</span>
              <div className="text-3xl font-black text-slate-900">{pendingBookings.length}</div>
              <span className="text-[11px] text-amber-600 font-bold block">نیازمند بررسی سریع</span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-medium">درخواست‌های ورود فوری</span>
              <div className="text-3xl font-black text-red-600">{urgentUnanswered.length}</div>
              <span className="text-[11px] text-red-600 font-bold block">مسافر تازه از راه رسیده</span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-medium">گزارش مشکل در ورود / درب</span>
              <div className="text-3xl font-black text-rose-600">{entranceIssues.length}</div>
              <span className="text-[11px] text-rose-600 font-bold block">نیازمند تماس اضطراری با هاستل</span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-medium">نظرات نیازمند بررسی</span>
              <div className="text-3xl font-black text-indigo-600">{pendingReviews.length}</div>
              <span className="text-[11px] text-indigo-600 font-bold block">تأیید قبل از انتشار عمومی</span>
            </div>
          </div>

          {/* Urgent Alerts section */}
          {entranceIssues.length > 0 && (
            <div className="p-5 rounded-3xl bg-red-50 border border-red-200 space-y-3">
              <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>گزارش‌های فوری عدم پاسخگویی یا مشکل ورود مسافران در محل هاستل:</span>
              </div>
              <div className="space-y-2">
                {entranceIssues.map(b => (
                  <div key={b.id} className="p-3 bg-white rounded-2xl border border-red-200 text-xs flex justify-between items-center">
                    <div>
                      <strong>{b.guestName}</strong> ({b.guestContact}) در هاستل <strong>{b.hostelName}</strong>
                      <div className="text-slate-500">{b.entranceIssueNote}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('booking-track', { token: b.privateToken })}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs"
                    >
                      مشاهده پیوند مسافر
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-slate-900">تمام رزروهای هاستل‌ها در سامانه</h2>
          <div className="space-y-3">
            {store.bookings.map(b => (
              <div key={b.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-purple-700">{b.trackingCode}</span>
                    <span className="font-bold text-slate-900 text-sm">{b.guestName}</span>
                    <span className="text-xs text-slate-500 ltr-isolate">{b.guestContact}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                    b.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    b.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {b.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600">
                  <div>هاستل: <strong className="text-slate-800">{b.hostelName}</strong></div>
                  <div>اتاق: <strong className="text-slate-800">{b.roomTypeName}</strong></div>
                  <div>تاریخ: <strong className="text-slate-800">{b.checkIn} تا {b.checkOut}</strong></div>
                  <div>مبلغ در محل: <strong className="text-slate-900">{b.finalAmountAMD.toLocaleString()} AMD</strong></div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 justify-end">
                  <button
                    type="button"
                    onClick={() => onNavigate('booking-track', { token: b.privateToken })}
                    className="px-3 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>پیوند مسافر</span>
                  </button>

                  {b.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => appStore.updateBookingStatus(b.id, 'confirmed')}
                        className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                      >
                        تأیید رزرو
                      </button>
                      <button
                        type="button"
                        onClick={() => appStore.updateBookingStatus(b.id, 'rejected', 'عدم ظرفیت')}
                        className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs cursor-pointer"
                      >
                        رد درخواست
                      </button>
                    </>
                  )}

                  {b.status === 'confirmed' && (
                    <button
                      type="button"
                      onClick={() => appStore.updateBookingStatus(b.id, 'completed')}
                      className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs cursor-pointer"
                    >
                      ثبت پایان اقامت (تکمیل)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: HOSTELS & INVENTORY */}
      {activeTab === 'hostels' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">فهرست هاستل‌ها و موجودی تخت‌ها</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {store.hostels.map(h => (
              <div key={h.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base">{h.name.fa}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${h.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {h.isPublished ? 'منتشر شده' : 'پیش‌نویس'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{h.address.fa}</p>

                <div className="space-y-1.5 text-xs">
                  <span className="font-bold text-slate-700 block">انواع اتاق‌ها:</span>
                  {h.roomTypes.map(rt => (
                    <div key={rt.id} className="p-2 rounded-lg bg-slate-50 flex justify-between items-center">
                      <span>{rt.name.fa}</span>
                      <span className="font-bold text-slate-900">{rt.pricePerNightAMD.toLocaleString()} AMD (ظرفیت: {rt.totalBedsOrRooms})</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-between items-center text-xs text-slate-500">
                  <span>پذیرش ۲۴ ساعته: {h.reception24h ? 'بله' : 'خیر'}</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('hostel-detail', { id: h.id })}
                    className="text-amber-700 font-bold hover:underline"
                  >
                    مشاهده صفحه عمومی
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: HOSTEL MANAGERS */}
      {activeTab === 'managers' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">ایجاد حساب مسئول هاستل (هاستل‌دار جدید)</h2>
            <form onSubmit={handleCreateManager} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                required
                placeholder="نام مسئول هاستل"
                value={mgrName}
                onChange={e => setMgrName(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
              />
              <input
                type="email"
                required
                placeholder="ایمیل ورود"
                value={mgrEmail}
                onChange={e => setMgrEmail(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs ltr-isolate text-left"
              />
              <select
                value={mgrHostelId}
                onChange={e => setMgrHostelId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
              >
                {store.hostels.map(h => (
                  <option key={h.id} value={h.id}>{h.name.fa}</option>
                ))}
              </select>
              <button
                type="submit"
                className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer"
              >
                ایجاد حساب هاستل‌دار
              </button>
            </form>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900">مسئولین فعال در سیستم:</h3>
            {store.users.filter(u => u.role === 'hostel_manager').map(mgr => (
              <div key={mgr.id} className="p-4 rounded-2xl bg-white border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <strong className="text-slate-900 text-sm block">{mgr.name}</strong>
                  <span className="text-slate-400 ltr-isolate">{mgr.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${mgr.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {mgr.isActive ? 'فعال' : 'غیرفعال'}
                  </span>
                  <button
                    type="button"
                    onClick={() => appStore.toggleManagerActive(mgr.id)}
                    className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    تغییر وضعیت
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">تعریف کد تخفیف درصدی سراسری هاستل‌ها</h2>
            <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <input
                type="text"
                required
                placeholder="کد (مثلاً AUTUMN25)"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
                className="uppercase bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono"
              />
              <input
                type="number"
                min={1}
                max={100}
                required
                placeholder="درصد (۱-۱۰۰)"
                value={couponPercent}
                onChange={e => setCouponPercent(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
              />
              <input
                type="number"
                placeholder="سقف استفاده کل"
                value={couponMaxUses}
                onChange={e => setCouponMaxUses(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
              />
              <input
                type="text"
                placeholder="توضیحات"
                value={couponDesc}
                onChange={e => setCouponDesc(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
              />
              <button
                type="submit"
                className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer"
              >
                ثبت کد تخفیف
              </button>
            </form>
          </div>

          <div className="space-y-3">
            {store.coupons.map(c => (
              <div key={c.code} className="p-4 rounded-2xl bg-white border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <span className="font-mono text-base font-black text-purple-700 block">{c.code}</span>
                  <span className="text-slate-600">{c.percent}٪ تخفیف اقامت • {c.description}</span>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    استفاده‌شده: {c.usedCount} از {c.maxUses || 'نامحدود'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${c.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {c.active ? 'فعال' : 'غیرفعال'}
                  </span>
                  <button
                    type="button"
                    onClick={() => appStore.toggleCoupon(c.code)}
                    className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    تغییر وضعیت
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: REVIEWS MODERATION */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-slate-900">بررسی و تأیید نظرات مسافران (پیش از انتشار)</h2>
          <div className="space-y-3">
            {store.reviews.map(rev => (
              <div key={rev.id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{rev.guestName}</span>
                    <span className="text-xs text-slate-400 mr-2">برای {rev.hostelName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <span>{rev.rating} از ۵</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl">{rev.comment}</p>

                {rev.adminReply && (
                  <div className="text-xs text-purple-900 bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                    <strong>پاسخ مدیر YEREVANHUB:</strong> {rev.adminReply}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                    rev.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                    rev.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    وضعیت: {rev.status === 'approved' ? 'تأییدشده و عمومی' : rev.status === 'pending' ? 'در انتظار بررسی' : 'رد شده'}
                  </span>

                  <div className="flex gap-2">
                    {rev.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => appStore.moderateReview(rev.id, 'approved')}
                        className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                      >
                        تأیید و انتشار عمومی
                      </button>
                    )}
                    {rev.status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() => appStore.moderateReview(rev.id, 'rejected')}
                        className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
                      >
                        رد نظر
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: RENTALS & INQUIRIES */}
      {activeTab === 'rentals' && (
        <div className="space-y-6">
          <h2 className="text-lg font-black text-slate-900">درخواست‌های اجاره و بازدید املاک (هماهنگی با مالک)</h2>
          <div className="space-y-3">
            {store.rentalInquiries.map(inq => (
              <div key={inq.id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="font-mono font-bold text-blue-700">{inq.trackingCode}</span>
                    <strong className="text-slate-900 text-sm mr-2">{inq.guestName}</strong>
                    <span className="text-slate-400 mr-2 ltr-isolate">{inq.contact}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold">
                    {inq.status}
                  </span>
                </div>

                <p className="text-xs text-slate-700 font-semibold">{inq.propertyTitle}</p>
                <div className="text-xs text-slate-500">
                  نوع: {inq.requestType === 'visit' ? `بازدید در تاریخ ${inq.proposedVisitDate}` : `اجاره شروع ${inq.desiredStartDate} برای ${inq.desiredDurationText}`}
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => appStore.updateRentalInquiryStatus(inq.id, 'coordinating', 'با مالک تماس گرفته شد')}
                    className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold cursor-pointer"
                  >
                    هماهنگی با مالک
                  </button>
                  <button
                    type="button"
                    onClick={() => appStore.updateRentalInquiryStatus(inq.id, 'agreed', 'توافق نهایی صورت گرفت')}
                    className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                  >
                    ثبت توافق نهایی
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: ARTICLES PUBLISHER (Manual one-by-one) */}
      {activeTab === 'articles' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">افزودن دستی مقاله و راهنما توسط مدیر (تک‌تک)</h2>
            <form onSubmit={handleCreateArticle} className="space-y-3">
              <input
                type="text"
                required
                placeholder="عنوان مقاله"
                value={artTitle}
                onChange={e => setArtTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="خلاصه کوتاه"
                  value={artSummary}
                  onChange={e => setArtSummary(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
                />
                <select
                  value={artCategory}
                  onChange={e => setArtCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
                >
                  <option value="ویزا و اقامت">ویزا و اقامت</option>
                  <option value="هزینه‌های سفر و زندگی">هزینه‌های سفر و زندگی</option>
                  <option value="تاکسی و حمل‌ونقل عمومی">تاکسی و حمل‌ونقل عمومی</option>
                  <option value="پول و صرافی">پول و صرافی</option>
                  <option value="سیم‌کارت و اینترنت">سیم‌کارت و اینترنت</option>
                  <option value="اجارهٔ خانه و نکات سکونت">اجارهٔ خانه و نکات سکونت</option>
                </select>
              </div>
              <textarea
                rows={5}
                required
                placeholder="متن کامل مطلب..."
                value={artContent}
                onChange={e => setArtContent(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer"
              >
                انتشار مستقیم در سایت
              </button>
            </form>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900">مطالب ثبت‌شده در سایت:</h3>
            {store.articles.map(art => (
              <div key={art.id} className="p-4 rounded-2xl bg-white border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <strong className="text-slate-900 text-sm block">{art.title}</strong>
                  <span className="text-slate-500">{art.category} • آخرین بررسی: {art.lastVerifiedDate}</span>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${art.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {art.status === 'published' ? 'منتشرشده' : 'پیش‌نویس'}
                  </span>
                  <button
                    type="button"
                    onClick={() => appStore.deleteArticle(art.id)}
                    className="text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 9: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-slate-900">گزارش لحظه‌ای عملیات مدیران و سامانه</h2>
          <div className="space-y-2">
            {store.auditLogs.map(log => (
              <div key={log.id} className="p-3 rounded-xl bg-white border border-slate-200 text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold text-purple-700 mr-2">[{log.action}]</span>
                  <span className="text-slate-800">{log.details}</span>
                  <span className="text-[11px] text-slate-400 mr-2">توسط {log.actorName} ({log.actorRole})</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono ltr-isolate">{log.timestamp.split('.')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
