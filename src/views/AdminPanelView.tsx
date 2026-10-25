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
  Image as ImageIcon,
  Upload,
  Trash2,
  Check,
  Link as LinkIcon,
  Sparkles,
  X,
  Download,
  Search,
  DollarSign,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { appStore } from '../services/store';
import { useLanguage } from '../context/LanguageContext';

export const ARMENIA_PHOTO_PRESETS = [
  {
    id: 'republic-sq',
    title: { fa: 'میدان جمهوری ایروان', en: 'Republic Square Yerevan', ru: 'Площадь Республики Ереван', hy: 'Հանրապետության հրապարակ Երևան' },
    desc: { fa: 'معماری سنگ توف و قلب پایتخت', en: 'Tuff stone architecture & capital heart', ru: 'Архитектура из туфа и центр столицы', hy: 'Տուֆե ճարտարապետություն' },
    url: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'cascade',
    title: { fa: 'مجموعه پله‌های کاسکاد', en: 'The Cascade Complex', ru: 'Комплекс Каскад', hy: 'Կասկադ համալիր' },
    desc: { fa: 'نمای پانورامای شهر و هنر مدرن', en: 'City panorama & contemporary arts', ru: 'Панорама города и современное искусство', hy: 'Քաղաքի համայնապատկեր' },
    url: 'https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'ararat-view',
    title: { fa: 'چشم‌انداز کوه آرارات', en: 'Mount Ararat Scenic View', ru: 'Вид на гору Арарат', hy: 'Արարատ լեռան տեսարան' },
    desc: { fa: 'نماد طبیعی ارمنستان و هوای مطبوع', en: 'Historic mountain & fresh climate', ru: 'Символ Армении и чистый воздух', hy: 'Հայաստանի բնական խորհրդանիշ' },
    url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'dilijan',
    title: { fa: 'طبیعت کوهستانی دیلیجان', en: 'Dilijan Mountain Resort', ru: 'Горная природа Дилижана', hy: 'Դիլիջանի լեռնային բնություն' },
    desc: { fa: 'جنگل‌های سرسبز و آب‌وهوای کوهستانی', en: 'Green forests & alpine climate', ru: 'Зеленые леса и чистый горный воздух', hy: 'Կանաչ անտառներ և մաքուր օդ' },
    url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'kilikia-bus',
    title: { fa: 'پایانه مسافربری و اتوبوس', en: 'Kilikia Bus Station & Transit', ru: 'Автовокзал Киликия и трансфер', hy: 'Կիլիկիա ավտոկայան' },
    desc: { fa: 'ترمینال مرکزی کیلیکیا و ورود شبانه', en: 'Central terminal & night arrivals', ru: 'Центральный вокзал и ночные заезды', hy: 'Կենտրոնական ավտոկայան' },
    url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'money-dram',
    title: { fa: 'صرافی، پول و درام ارمنستان', en: 'Currency Exchange & Armenian Dram', ru: 'Обмен валют и армянский драм', hy: 'Տարադրամի փոխանակում և դրամ' },
    desc: { fa: 'تبدیل ارز، سوپرمارکت‌های ۲۴ ساعته ساس', en: 'Currency rates & 24h SAS markets', ru: 'Курсы валют и круглосуточный SAS', hy: 'Արժույթի փոխանակում' },
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'sim-telecom',
    title: { fa: 'سیم‌کارت و اینترنت پرسرعت', en: 'SIM Cards & High-Speed Mobile Data', ru: 'Сим-карты и мобильный интернет', hy: 'SIM քարտեր և արագ ինտերնետ' },
    desc: { fa: 'اپراتورهای Viva و Ucom و بسته‌های دیتا', en: 'Viva & Ucom 5G/4G connectivity', ru: 'Операторы связи Viva, Ucom и тарифы', hy: 'Կապի օպերատորներ Viva և Ucom' },
    url: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'apartment-interior',
    title: { fa: 'اجاره آپارتمان و نکات قرارداد', en: 'Apartment Rentals & Contracts', ru: 'Аренда квартир и договор', hy: 'Բնակարանների վարձակալություն' },
    desc: { fa: 'املاک، نکات کاداستر و هزینه‌های کومونال', en: 'Real estate, utilities & lease tips', ru: 'Недвижимость, коммунальные услуги', hy: 'Անշարժ գույք և կոմունալ ծախսեր' },
    url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
  },
];

interface Props {
  currentLang?: AppLanguage;
  onNavigate: (view: string, params?: any) => void;
}

export const AdminPanelView: React.FC<Props> = ({ onNavigate }) => {
  const { currentLang, tAdmin, getLocalized } = useLanguage();
  const store = appStore.getState();
  const [activeTab, setActiveTab] = useState<
    'kpi' | 'bookings' | 'hostels' | 'managers' | 'coupons' | 'reviews' | 'rentals' | 'articles' | 'audit'
  >('kpi');

  // Booking filtering & search
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'rejected' | 'no_show'>('all');

  // New Hostel Form Modal state
  const [showAddHostelModal, setShowAddHostelModal] = useState(false);
  const [newHostelNameFa, setNewHostelNameFa] = useState('');
  const [newHostelNameEn, setNewHostelNameEn] = useState('');
  const [newHostelAddressFa, setNewHostelAddressFa] = useState('');
  const [newHostelDistrict, setNewHostelDistrict] = useState('Kentron');
  const [newHostelMinPrice, setNewHostelMinPrice] = useState(4800);
  const [newHostelReception24, setNewHostelReception24] = useState(true);
  const [newHostelPhoto, setNewHostelPhoto] = useState('https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80');
  const [newHostelLat, setNewHostelLat] = useState(40.1780);
  const [newHostelLng, setNewHostelLng] = useState(44.5130);

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
  const [artCategory, setArtCategory] = useState('ویزا و اقامت');
  const [artContent, setArtContent] = useState('');
  const [artSummary, setArtSummary] = useState('');
  const [artTags, setArtTags] = useState('');
  const [artStatus, setArtStatus] = useState<'published' | 'draft'>('published');
  const [artLanguage, setArtLanguage] = useState<AppLanguage>(currentLang);
  const [artImage, setArtImage] = useState<string>(ARMENIA_PHOTO_PRESETS[0].url);
  const [artImageMode, setArtImageMode] = useState<'preset' | 'upload' | 'url'>('preset');
  const [artCustomUrl, setArtCustomUrl] = useState('');

  // KPIs & Financial Analytics
  const pendingBookings = store.bookings.filter(b => b.status === 'pending');
  const confirmedBookings = store.bookings.filter(b => b.status === 'confirmed');
  const completedBookings = store.bookings.filter(b => b.status === 'completed');
  const urgentUnanswered = store.bookings.filter(b => b.status === 'pending' && b.isImmediateArrival);
  const entranceIssues = store.bookings.filter(b => b.entranceIssueReported);
  const pendingReviews = store.reviews.filter(r => r.status === 'pending');
  const pendingRentalInquiries = store.rentalInquiries.filter(i => i.status === 'pending_review');

  // Financial Metrics
  const totalGrossTurnoverAMD = [...confirmedBookings, ...completedBookings].reduce((acc, b) => acc + b.finalAmountAMD, 0);
  const totalCommissionEarnedAMD = Math.round(totalGrossTurnoverAMD * 0.10); // 10% platform fee
  const conversionRate = store.bookings.length > 0
    ? Math.round(([...confirmedBookings, ...completedBookings].length / store.bookings.length) * 100)
    : 100;

  // Filtered Bookings for Tab 2
  const filteredBookings = store.bookings.filter(b => {
    if (bookingStatusFilter !== 'all' && b.status !== bookingStatusFilter) return false;
    if (bookingSearch.trim()) {
      const q = bookingSearch.toLowerCase();
      const matchTrack = b.trackingCode.toLowerCase().includes(q);
      const matchName = b.guestName.toLowerCase().includes(q);
      const matchContact = b.guestContact.toLowerCase().includes(q);
      const matchHostel = b.hostelName.toLowerCase().includes(q);
      if (!matchTrack && !matchName && !matchContact && !matchHostel) return false;
    }
    return true;
  });

  // Export handlers
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(store, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `yerevanhub-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    const headers = ['TrackingCode', 'GuestName', 'Contact', 'Hostel', 'RoomType', 'CheckIn', 'CheckOut', 'Quantity', 'AmountAMD', 'Status'];
    const rows = store.bookings.map(b => [
      b.trackingCode,
      `"${b.guestName.replace(/"/g, '""')}"`,
      `"${b.guestContact}"`,
      `"${b.hostelName}"`,
      `"${b.roomTypeName}"`,
      b.checkIn,
      b.checkOut,
      b.quantity,
      b.finalAmountAMD,
      b.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bookings-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleCreateHostel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHostelNameFa.trim()) return;

    appStore.saveHostel({
      id: `hostel-${Date.now()}`,
      slug: newHostelNameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `hostel-${Date.now()}`,
      name: {
        fa: newHostelNameFa.trim(),
        en: newHostelNameEn.trim() || newHostelNameFa.trim(),
        ru: newHostelNameFa.trim(),
        hy: newHostelNameFa.trim(),
      },
      city: 'Yerevan',
      district: newHostelDistrict,
      address: {
        fa: newHostelAddressFa.trim(),
        en: newHostelAddressFa.trim(),
        ru: newHostelAddressFa.trim(),
        hy: newHostelAddressFa.trim(),
      },
      coordinates: {
        lat: Number(newHostelLat) || 40.1780,
        lng: Number(newHostelLng) || 44.5130,
      },
      photos: [newHostelPhoto],
      roomTypes: [
        {
          id: `rt-dorm-${Date.now()}`,
          name: { fa: 'تخت در خوابگاه اشتراکی', en: 'Dorm Bed', ru: 'Место в общей комнате', hy: 'Մահճակալ' },
          type: 'dorm_mixed',
          pricePerNightAMD: Number(newHostelMinPrice) || 4800,
          totalBedsOrRooms: 8,
          description: { fa: 'تخت خوابگاهی راحت با کمد و پریز برق', en: 'Comfortable dorm bed with locker and power socket', ru: 'Удобное место в номере с розеткой и шкафчиком', hy: 'Հարմարավետ մահճակալ' },
          hasCurtain: true,
          hasBedsidePlug: true,
          hasPersonalLocker: true,
          requiresOwnLock: false,
        }
      ],
      minPricePerNightAMD: Number(newHostelMinPrice) || 4800,
      amenities: {
        wifi: true,
        lockers: true,
        elevator: true,
        coworking: true,
      },
      reception24h: newHostelReception24,
      freeLuggageStorage: true,
      lateArrivalAvailable: true,
      languagesSpoken: ['fa', 'en', 'ru', 'hy'],
      rules: {
        quietHours: '23:00 - 08:00',
        cancellationPolicy: 'لغو رایگان تا ۲۴ ساعت قبل از ورود',
        acceptedPaymentMethodsOnArrival: ['Cash AMD', 'Cash USD', 'Card'],
      },
      isPublished: true,
      checkInStandardTime: '14:00',
      checkOutStandardTime: '12:00',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setNewHostelNameFa('');
    setNewHostelNameEn('');
    setNewHostelAddressFa('');
    setShowAddHostelModal(false);
  };

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setArtImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!artTitle.trim() || !artContent.trim()) return;

    const finalImage = artImage || ARMENIA_PHOTO_PRESETS[0].url;
    const tagsList = artTags.trim()
      ? artTags.split(/[,،]+/).map(t => t.trim()).filter(Boolean)
      : [artCategory];

    appStore.saveArticle({
      id: '',
      slug: artTitle.toLowerCase().trim().replace(/[^a-zA-Z0-9\u0600-\u06FF\u0530-\u058F\u0400-\u04FF]+/g, '-'),
      title: artTitle.trim(),
      summary: artSummary.trim() || artTitle.trim(),
      category: artCategory,
      tags: tagsList,
      featuredImage: finalImage,
      content: artContent.trim(),
      author: 'YEREVANHUB',
      language: artLanguage,
      status: artStatus,
      lastVerifiedDate: new Date().toISOString().split('T')[0],
      sources: ['YEREVANHUB Official Field Research'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setArtTitle('');
    setArtSummary('');
    setArtContent('');
    setArtTags('');
    setArtCustomUrl('');
  };

  const statusLabels: Record<string, Record<AppLanguage, string>> = {
    confirmed: { fa: 'تأییدشده', en: 'Confirmed', ru: 'Подтверждено', hy: 'Հաստատված' },
    pending: { fa: 'در انتظار بررسی', en: 'Pending', ru: 'В ожидании', hy: 'Սպասվող' },
    completed: { fa: 'تکمیل‌شده', en: 'Completed', ru: 'Завершено', hy: 'Ավարտված' },
    rejected: { fa: 'ردشده', en: 'Rejected', ru: 'Отклонено', hy: 'Մերժված' },
    cancelled: { fa: 'لغوشده', en: 'Cancelled', ru: 'Отменено', hy: 'Չեղարկված' },
    no_show: { fa: 'عدم حضور', en: 'No Show', ru: 'Не заехал', hy: 'Չներկայացավ' },
  };

  const getStatusText = (status: string) => {
    return statusLabels[status]?.[currentLang] || status;
  };

  const tabsConfig = [
    { id: 'kpi', label: tAdmin.tabKpi, icon: Shield, badge: urgentUnanswered.length + entranceIssues.length },
    { id: 'bookings', label: tAdmin.tabBookings, icon: Clock, badge: pendingBookings.length },
    { id: 'hostels', label: tAdmin.tabHostels, icon: Building2 },
    { id: 'managers', label: tAdmin.tabManagers, icon: Key },
    { id: 'coupons', label: tAdmin.tabCoupons, icon: Tag },
    { id: 'reviews', label: tAdmin.tabReviews, icon: Star, badge: pendingReviews.length },
    { id: 'rentals', label: tAdmin.tabRentals, icon: Home, badge: pendingRentalInquiries.length },
    { id: 'articles', label: tAdmin.tabArticles, icon: BookOpen },
    { id: 'audit', label: tAdmin.tabAudit, icon: FileText },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header with Status & Fast Export */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black shadow-md shadow-purple-500/20 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="brand-name text-lg font-black text-slate-900">YEREVANHUB</span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-xs font-bold">
                {tAdmin.panelTitle}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>پلتفرم فعال (Live)</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {tAdmin.panelSubtitle}
            </p>
          </div>
        </div>

        {/* Action Controls: Export Data & Quick Reports */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>خروجی اکسل رزروها (CSV)</span>
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-purple-200 transition-colors"
            title="Backup System"
          >
            <Download className="w-3.5 h-3.5 text-purple-600" />
            <span>پشتیبان‌گیری سامانه (JSON)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
        {tabsConfig.map(tab => {
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

      {/* TAB 1: EXECUTIVE FINANCIAL & OPERATIONAL DASHBOARD */}
      {activeTab === 'kpi' && (
        <div className="space-y-6">
          {/* Top 4 Executive Financial & Growth Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-md space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold">گردش مالی ناخالص (GMV)</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black font-mono tracking-tight text-white">
                ֏ {totalGrossTurnoverAMD.toLocaleString()} <span className="text-xs font-normal text-slate-400">AMD</span>
              </div>
              <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>حجم تراکنش‌های قطعی و تکمیل‌شده</span>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold">سهم کارمزد پلتفرم (۱۰٪)</span>
                <BarChart3 className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black font-mono text-purple-700">
                ֏ {totalCommissionEarnedAMD.toLocaleString()} <span className="text-xs font-normal text-slate-500">AMD</span>
              </div>
              <div className="text-[11px] text-purple-600 font-medium">
                مبنای تسویه هفتگی با هاستل‌داران
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold">نرخ پذیرش و تأیید</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {conversionRate}%
              </div>
              <div className="text-[11px] text-slate-500">
                {completedBookings.length + confirmedBookings.length} از {store.bookings.length} رزرو تایید یا انجام‌شده
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold">اقامتگاه‌های ثبت‌شده</span>
                <Building2 className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {store.hostels.length + store.rentals.length}
              </div>
              <div className="text-[11px] text-amber-700 font-medium">
                {store.hostels.length} هاستل • {store.rentals.length} واحد آپارتمان
              </div>
            </div>
          </div>

          {/* Operational Status Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">{tAdmin.kpiPendingBookings}</span>
                <span className="text-2xl font-black text-slate-900">{pendingBookings.length}</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${pendingBookings.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                {pendingBookings.length > 0 ? 'نیاز به بررسی' : 'پاسخ داده شده'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">{tAdmin.kpiUrgentImmediate}</span>
                <span className="text-2xl font-black text-red-600">{urgentUnanswered.length}</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${urgentUnanswered.length > 0 ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                {urgentUnanswered.length > 0 ? 'فوری' : 'هیچ'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">{tAdmin.kpiEntranceIssues}</span>
                <span className="text-2xl font-black text-rose-600">{entranceIssues.length}</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${entranceIssues.length > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'}`}>
                {entranceIssues.length > 0 ? 'گزارش مشکل' : 'آرام'}
              </span>
            </div>
          </div>

          {/* Financial Ledger Table per Hostel */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <span>دفتر کل و گزارش کارمزد هاستل‌های طرف قرارداد</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  محاسبه ۱۰٪ سهم کارمزد پلتفرم YEREVANHUB بر مبنای رزروهای انجام‌شده
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                دوره تسویه: هفتگی (شنبه‌ها)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[11px]">
                    <th className="pb-3 text-right">نام هاستل</th>
                    <th className="pb-3 text-center">ناحیه شهری</th>
                    <th className="pb-3 text-center">رزروهای قطعی</th>
                    <th className="pb-3 text-left">گردش ناخالص (AMD)</th>
                    <th className="pb-3 text-left">کارمزد پلتفرم ۱۰٪ (AMD)</th>
                    <th className="pb-3 text-center">وضعیت تسویه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {store.hostels.map(h => {
                    const hostelBookings = store.bookings.filter(b => b.hostelId === h.id && (b.status === 'confirmed' || b.status === 'completed'));
                    const turnover = hostelBookings.reduce((sum, b) => sum + b.finalAmountAMD, 0);
                    const commission = Math.round(turnover * 0.10);

                    return (
                      <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 font-bold text-slate-900">
                          {getLocalized(h.name, h.name.fa)}
                        </td>
                        <td className="py-3.5 text-center text-slate-500">
                          {h.district}
                        </td>
                        <td className="py-3.5 text-center font-bold text-slate-800">
                          {hostelBookings.length}
                        </td>
                        <td className="py-3.5 text-left font-mono font-bold text-slate-900">
                          ֏ {turnover.toLocaleString()}
                        </td>
                        <td className="py-3.5 text-left font-mono font-bold text-purple-700">
                          ֏ {commission.toLocaleString()}
                        </td>
                        <td className="py-3.5 text-center">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            تراز متعادل ✓
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">{tAdmin.quickActionsTitle}</h3>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('bookings')}
                className="px-4 py-2.5 rounded-xl bg-purple-50 text-purple-900 hover:bg-purple-100 font-bold text-xs cursor-pointer flex items-center gap-2"
              >
                <Clock className="w-4 h-4 text-purple-700" />
                <span>{tAdmin.manageBookingsAction}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('hostels')}
                className="px-4 py-2.5 rounded-xl bg-amber-50 text-amber-900 hover:bg-amber-100 font-bold text-xs cursor-pointer flex items-center gap-2"
              >
                <Building2 className="w-4 h-4 text-amber-700" />
                <span>مدیریت و ثبت هاستل جدید</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('coupons')}
                className="px-4 py-2.5 rounded-xl bg-blue-50 text-blue-900 hover:bg-blue-100 font-bold text-xs cursor-pointer flex items-center gap-2"
              >
                <Tag className="w-4 h-4 text-blue-700" />
                <span>{tAdmin.createCouponAction}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('articles')}
                className="px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-900 hover:bg-emerald-100 font-bold text-xs cursor-pointer flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-emerald-700" />
                <span>{tAdmin.publishArticleAction}</span>
              </button>
            </div>
          </div>

          {/* Urgent Alerts section */}
          {entranceIssues.length > 0 && (
            <div className="p-5 rounded-3xl bg-red-50 border border-red-200 space-y-3">
              <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>{tAdmin.entranceIssuesDesc}</span>
              </div>
              <div className="space-y-2">
                {entranceIssues.map(b => (
                  <div key={b.id} className="p-3 bg-white rounded-2xl border border-red-200 text-xs flex justify-between items-center">
                    <div>
                      <strong>{b.guestName}</strong> ({b.guestContact}) - {b.hostelName}
                      <div className="text-slate-500">{b.entranceIssueNote}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('booking-track', { token: b.privateToken })}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs cursor-pointer"
                    >
                      {tAdmin.btnPassengerLink}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL BOOKINGS WITH SEARCH & STATUS FILTERS */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span>مدیریت جامع رزروها و پذیرش مسافران ({filteredBookings.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                جستجو، تغییر وضعیت، تسویه و صدور لینک اختصاصی پیگیری مسافر
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>خروجی CSV</span>
            </button>
          </div>

          {/* Search Bar & Status Filter Chips */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={bookingSearch}
                onChange={e => setBookingSearch(e.target.value)}
                placeholder="جستجو با شماره پیگیری (YVN-...)، نام مسافر، شماره تماس یا نام هاستل..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
              {bookingSearch && (
                <button
                  type="button"
                  onClick={() => setBookingSearch('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-slate-400 text-[11px] font-bold ml-2">فیلتر وضعیت:</span>
              {[
                { id: 'all', label: 'همه وضعیت‌ها', count: store.bookings.length },
                { id: 'pending', label: 'در انتظار بررسی', count: pendingBookings.length },
                { id: 'confirmed', label: 'تأییدشده', count: confirmedBookings.length },
                { id: 'completed', label: 'تکمیل‌شده', count: completedBookings.length },
                { id: 'rejected', label: 'ردشده', count: store.bookings.filter(b => b.status === 'rejected').length },
                { id: 'cancelled', label: 'لغوشده', count: store.bookings.filter(b => b.status === 'cancelled').length },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setBookingStatusFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-xs flex items-center gap-1.5 ${
                    bookingStatusFilter === f.id
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${bookingStatusFilter === f.id ? 'bg-purple-800 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Bookings List */}
          <div className="space-y-3">
            {filteredBookings.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-slate-400 text-xs">
                رزروی با مشخصات فیلترشده یافت نشد.
              </div>
            ) : (
              filteredBookings.map(b => (
                <div key={b.id} className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
                        {b.trackingCode}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{b.guestName}</span>
                      <span className="text-xs text-slate-500 ltr-isolate">{b.guestContact}</span>
                      {b.isImmediateArrival && (
                        <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-bold">
                          {tAdmin.immediateArrivalBadge}
                        </span>
                      )}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                      b.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      b.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      b.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {getStatusText(b.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl">
                    <div>{tAdmin.tableColHostel}: <strong className="text-slate-800 block mt-0.5">{b.hostelName}</strong></div>
                    <div>{tAdmin.tableColRoom}: <strong className="text-slate-800 block mt-0.5">{b.roomTypeName}</strong></div>
                    <div>{tAdmin.tableColDates}: <strong className="text-slate-800 ltr-isolate block mt-0.5">{b.checkIn} → {b.checkOut}</strong></div>
                    <div>{tAdmin.tableColAmount}: <strong className="text-slate-900 font-mono font-bold block mt-0.5">֏ {b.finalAmountAMD.toLocaleString()} AMD</strong></div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 justify-end">
                    <button
                      type="button"
                      onClick={() => onNavigate('booking-track', { token: b.privateToken })}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{tAdmin.btnPassengerLink}</span>
                    </button>

                    {b.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => appStore.updateBookingStatus(b.id, 'confirmed')}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer transition-colors"
                        >
                          {tAdmin.btnConfirm}
                        </button>
                        <button
                          type="button"
                          onClick={() => appStore.updateBookingStatus(b.id, 'rejected', 'عدم ظرفیت')}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer transition-colors"
                        >
                          {tAdmin.btnReject}
                        </button>
                      </>
                    )}

                    {b.status === 'confirmed' && (
                      <button
                        type="button"
                        onClick={() => appStore.updateBookingStatus(b.id, 'completed')}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer transition-colors"
                      >
                        {tAdmin.btnComplete}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: HOSTELS & INVENTORY */}
      {activeTab === 'hostels' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                <span>{tAdmin.hostelsListTitle} ({store.hostels.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تعریف هاستل‌های جدید، مدیریت ظرفیت، وضعیت انتشار و کنترل پذیرش ۲۴ ساعته
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddHostelModal(!showAddHostelModal)}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddHostelModal ? 'بستن فرم' : 'ثبت هاستل جدید در پلتفرم'}</span>
            </button>
          </div>

          {/* Add New Hostel Form Card */}
          {showAddHostelModal && (
            <div className="bg-white p-6 rounded-3xl border-2 border-purple-200 shadow-md space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>ثبت و اضافه کردن هاستل جدید به ایروان‌هاب</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddHostelModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateHostel} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">نام هاستل (فارسی) *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: هاستل هوس ایروان"
                      value={newHostelNameFa}
                      onChange={e => setNewHostelNameFa(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">نام هاستل (انگلیسی)</label>
                    <input
                      type="text"
                      placeholder="e.g. House Hostel Yerevan"
                      value={newHostelNameEn}
                      onChange={e => setNewHostelNameEn(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 ltr-isolate text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ناحیه شهری</label>
                    <select
                      value={newHostelDistrict}
                      onChange={e => setNewHostelDistrict(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900"
                    >
                      <option value="Kentron">مرکز (Kentron)</option>
                      <option value="Arabkir">آرابکیر (Arabkir)</option>
                      <option value="Cascade">کاسکاد (Cascade)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">آدرس دقیق در ایروان *</label>
                    <input
                      type="text"
                      required
                      placeholder="ایروان، ناحیه کنترون، خیابان ماشتوتس..."
                      value={newHostelAddressFa}
                      onChange={e => setNewHostelAddressFa(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">قیمت شروع هر تخت (درام)</label>
                    <input
                      type="number"
                      min={1000}
                      step={100}
                      value={newHostelMinPrice}
                      onChange={e => setNewHostelMinPrice(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">عرض جغرافیایی (Latitude)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newHostelLat}
                      onChange={e => setNewHostelLat(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono ltr-isolate text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">طول جغرافیایی (Longitude)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newHostelLng}
                      onChange={e => setNewHostelLng(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono ltr-isolate text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">لینک تصویر پیش‌فرض</label>
                    <input
                      type="url"
                      value={newHostelPhoto}
                      onChange={e => setNewHostelPhoto(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 ltr-isolate text-left"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={newHostelReception24}
                      onChange={e => setNewHostelReception24(e.target.checked)}
                      className="rounded-md text-purple-600 focus:ring-purple-500"
                    />
                    <span>پذیرش ۲۴ ساعته شبانه‌روزی فعال است</span>
                  </label>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                  >
                    ثبت و ذخیره هاستل
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Hostels Grid with Rich Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {store.hostels.map(h => (
              <div key={h.id} className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                      <img
                        src={h.photos[0]}
                        alt={getLocalized(h.name, h.name.fa)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{getLocalized(h.name, h.name.fa)}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1">{getLocalized(h.address, h.address.fa)}</p>
                      <span className="text-[11px] text-amber-800 font-bold block mt-0.5">
                        {h.city} • {h.district}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${h.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {h.isPublished ? tAdmin.activeStatus : tAdmin.inactiveStatus}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs bg-slate-50 p-3 rounded-2xl">
                  <span className="font-bold text-slate-700 block">{tAdmin.tableColRoom}:</span>
                  {h.roomTypes.map(rt => (
                    <div key={rt.id} className="py-1 px-2 rounded-lg bg-white flex justify-between items-center shadow-2xs">
                      <span className="text-slate-800">{getLocalized(rt.name, rt.name.fa)}</span>
                      <span className="font-mono font-bold text-slate-900">
                        ֏ {rt.pricePerNightAMD.toLocaleString()} AMD ({rt.totalBedsOrRooms} تخت)
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex flex-wrap gap-2 justify-between items-center text-xs border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                    <span>{tAdmin.receptionLabel} {h.reception24h ? '۲۴/۷' : h.checkInStandardTime}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-600 ltr-isolate">{h.coordinates.lat.toFixed(4)}, {h.coordinates.lng.toFixed(4)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => appStore.toggleHostelPublished(h.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        h.isPublished ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}
                    >
                      {h.isPublished ? 'تغییر به پیش‌نویس' : 'انتشار در سایت'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('hostel-detail', { id: h.id })}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-colors"
                    >
                      {tAdmin.viewOnSiteBtn}
                    </button>
                  </div>
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
            <h2 className="text-base font-bold text-slate-900">{tAdmin.createManagerTitle}</h2>
            <form onSubmit={handleCreateManager} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                required
                placeholder={tAdmin.managerNameLabel}
                value={mgrName}
                onChange={e => setMgrName(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900"
              />
              <input
                type="email"
                required
                placeholder={tAdmin.managerEmailLabel}
                value={mgrEmail}
                onChange={e => setMgrEmail(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 ltr-isolate text-left"
              />
              <select
                value={mgrHostelId}
                onChange={e => setMgrHostelId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900"
              >
                {store.hostels.map(h => (
                  <option key={h.id} value={h.id}>{getLocalized(h.name, h.name.fa)}</option>
                ))}
              </select>
              <button
                type="submit"
                className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                {tAdmin.createManagerBtn}
              </button>
            </form>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900">{tAdmin.activeManagersTitle}:</h3>
            {store.users.filter(u => u.role === 'hostel_manager').map(mgr => (
              <div key={mgr.id} className="p-4 rounded-2xl bg-white border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <strong className="text-slate-900 text-sm block">{mgr.name}</strong>
                  <span className="text-slate-400 ltr-isolate">{mgr.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${mgr.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {mgr.isActive ? tAdmin.activeStatus : tAdmin.inactiveStatus}
                  </span>
                  <button
                    type="button"
                    onClick={() => appStore.toggleManagerActive(mgr.id)}
                    className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    Toggle
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
          {/* Explanation Banner for Default 3 Codes */}
          <div className="bg-purple-50/90 border border-purple-200/90 rounded-2xl p-4 text-xs text-purple-950 space-y-2">
            <div className="font-bold flex items-center gap-2 text-purple-900 text-sm">
              <Tag className="w-4 h-4 text-purple-700" />
              <span>{tAdmin.couponsNoticeTitle}</span>
            </div>
            <p className="text-purple-800 leading-relaxed font-normal">
              {tAdmin.couponsNoticeDesc}
            </p>
            <ul className="list-disc list-inside space-y-1 text-purple-900 font-medium">
              <li><strong className="font-mono text-purple-950">WELCOME10</strong> (10%)</li>
              <li><strong className="font-mono text-purple-950">SUMMER20</strong> (20%)</li>
              <li><strong className="font-mono text-purple-950">EXPIRED50</strong> (50% expired)</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">{tAdmin.createCouponTitle}</h2>
            <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <input
                type="text"
                required
                placeholder={tAdmin.couponCodeLabel}
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
                className="uppercase bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-900"
              />
              <input
                type="number"
                min={1}
                max={100}
                required
                placeholder={tAdmin.couponPercentLabel}
                value={couponPercent}
                onChange={e => setCouponPercent(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900"
              />
              <input
                type="number"
                placeholder={tAdmin.couponMaxUsesLabel}
                value={couponMaxUses}
                onChange={e => setCouponMaxUses(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900"
              />
              <input
                type="text"
                placeholder={tAdmin.couponDescLabel}
                value={couponDesc}
                onChange={e => setCouponDesc(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900"
              />
              <button
                type="submit"
                className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                {tAdmin.createCouponBtn}
              </button>
            </form>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">{tAdmin.existingCouponsTitle} ({store.coupons.length}):</h3>
            </div>
            {store.coupons.map(c => (
              <div key={c.code} className="p-4 rounded-2xl bg-white border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <span className="font-mono text-base font-black text-purple-700 block">{c.code}</span>
                  <span className="text-slate-600">{c.percent}% • {c.description}</span>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    {c.usedCount} / {c.maxUses || '∞'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${c.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {c.active ? tAdmin.activeStatus : tAdmin.inactiveStatus}
                  </span>
                  <button
                    type="button"
                    onClick={() => appStore.toggleCoupon(c.code)}
                    className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer font-medium transition-colors"
                  >
                    Toggle
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete coupon ${c.code}?`)) {
                        appStore.deleteCoupon(c.code);
                      }
                    }}
                    className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 cursor-pointer transition-colors"
                    title={tAdmin.deleteCouponBtn}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
          <h2 className="text-lg font-black text-slate-900">{tAdmin.reviewsTitle}</h2>
          <div className="space-y-3">
            {store.reviews.map(rev => (
              <div key={rev.id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{rev.guestName}</span>
                    <span className="text-xs text-slate-400 mr-2"> - {rev.hostelName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <span>{rev.rating} / 5</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl">{rev.comment}</p>

                {rev.adminReply && (
                  <div className="text-xs text-purple-900 bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                    <strong>{tAdmin.replyToGuestLabel}</strong> {rev.adminReply}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                    rev.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                    rev.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {rev.status === 'approved' ? tAdmin.activeStatus : rev.status === 'pending' ? tAdmin.filterPending : tAdmin.filterRejected}
                  </span>

                  <div className="flex gap-2">
                    {rev.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => appStore.moderateReview(rev.id, 'approved')}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer transition-colors"
                      >
                        {tAdmin.btnApprove}
                      </button>
                    )}
                    {rev.status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() => appStore.moderateReview(rev.id, 'rejected')}
                        className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer transition-colors"
                      >
                        {tAdmin.btnReject}
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
          <h2 className="text-lg font-black text-slate-900">{tAdmin.rentalsInquiriesTitle}</h2>
          <div className="space-y-3">
            {store.rentalInquiries.map(inq => (
              <div key={inq.id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="font-mono font-bold text-blue-700">{inq.trackingCode}</span>
                    <strong className="text-slate-900 text-sm mr-2"> {inq.guestName}</strong>
                    <span className="text-slate-400 mr-2 ltr-isolate">{inq.contact}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold">
                    {inq.status}
                  </span>
                </div>

                <p className="text-xs text-slate-700 font-semibold">{inq.propertyTitle}</p>
                <div className="text-xs text-slate-500">
                  {inq.requestType === 'visit' ? `Visit: ${inq.proposedVisitDate}` : `Rent: ${inq.desiredStartDate} (${inq.desiredDurationText})`}
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => appStore.updateRentalInquiryStatus(inq.id, 'coordinating', 'Contacted owner')}
                    className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold cursor-pointer"
                  >
                    {tAdmin.statusContacted}
                  </button>
                  <button
                    type="button"
                    onClick={() => appStore.updateRentalInquiryStatus(inq.id, 'agreed', 'Final agreement reached')}
                    className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                  >
                    {tAdmin.statusClosed}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: ARTICLES PUBLISHER & IMAGE STUDIO */}
      {activeTab === 'articles' && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">
                <BookOpen className="w-4 h-4" />
                <span>{tAdmin.articlesTitle}</span>
              </div>
              <h2 className="text-lg font-black text-slate-900">
                {tAdmin.createArticleTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {tAdmin.imageStudioDesc}
              </p>
            </div>

            <form onSubmit={handleCreateArticle} className="space-y-4">
              {/* Title & Category */}
              <div className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder={tAdmin.articleTitleLabel}
                  value={artTitle}
                  onChange={e => setArtTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-hidden transition-all"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">{tAdmin.articleCategoryLabel}</label>
                    <select
                      value={artCategory}
                      onChange={e => setArtCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                    >
                      <option value="ویزا و اقامت">Visa & Residency / ویزا و اقامت</option>
                      <option value="هزینه‌های سفر و زندگی">Travel & Living Costs / هزینه‌ها</option>
                      <option value="راهنمای اولین سفر و تازهواردها">First Arrival Guide / راهنمای ورود</option>
                      <option value="تاکسی و حمل‌ونقل عمومی">Transit & Taxi / حمل‌ونقل و تاکسی</option>
                      <option value="پول و صرافی">Money & Exchange / صرافی و ارز</option>
                      <option value="سیم‌کارت و اینترنت">SIM Cards & Telecom / سیم‌کارت و دیتا</option>
                      <option value="اجارهٔ خانه و نکات سکونت">Apartment Rental / اجاره خانه</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">{tAdmin.articleLangLabel}</label>
                    <select
                      value={artLanguage}
                      onChange={e => setArtLanguage(e.target.value as AppLanguage)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                    >
                      <option value="fa">فارسی (FA)</option>
                      <option value="en">English (EN)</option>
                      <option value="ru">Русский (RU)</option>
                      <option value="hy">Հայերեն (HY)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">{tAdmin.articleStatusLabel}</label>
                    <select
                      value={artStatus}
                      onChange={e => setArtStatus(e.target.value as 'published' | 'draft')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold"
                    >
                      <option value="published">{tAdmin.statusPublished}</option>
                      <option value="draft">{tAdmin.statusDraft}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder={tAdmin.articleSummaryLabel}
                    value={artSummary}
                    onChange={e => setArtSummary(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                  />
                  <input
                    type="text"
                    placeholder={tAdmin.articleTagsLabel}
                    value={artTags}
                    onChange={e => setArtTags(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* IMAGE SELECTION STUDIO */}
              <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-purple-700" />
                    <span className="font-bold text-xs text-slate-900">
                      {tAdmin.imageStudioTitle}
                    </span>
                  </div>

                  {/* Mode switcher */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-purple-200/80 text-[11px] font-semibold text-slate-600">
                    <button
                      type="button"
                      onClick={() => setArtImageMode('preset')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        artImageMode === 'preset'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'hover:bg-purple-50 text-slate-700'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{tAdmin.modePreset}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setArtImageMode('upload')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        artImageMode === 'upload'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'hover:bg-purple-50 text-slate-700'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>{tAdmin.modeUpload}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setArtImageMode('url')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        artImageMode === 'url'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'hover:bg-purple-50 text-slate-700'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>{tAdmin.modeUrl}</span>
                    </button>
                  </div>
                </div>

                {/* Sub-mode 1: Preset Gallery */}
                {artImageMode === 'preset' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {ARMENIA_PHOTO_PRESETS.map(preset => {
                        const isSelected = artImage === preset.url;
                        const titleText = preset.title[currentLang] || preset.title.fa;
                        const descText = preset.desc[currentLang] || preset.desc.fa;
                        return (
                          <button
                            type="button"
                            key={preset.id}
                            onClick={() => setArtImage(preset.url)}
                            className={`group relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all p-0 ${
                              isSelected
                                ? 'border-purple-600 ring-2 ring-purple-500/30 shadow-md scale-101'
                                : 'border-white/80 hover:border-purple-300 opacity-80 hover:opacity-100'
                            }`}
                          >
                            <div className="aspect-16/10 bg-slate-200 overflow-hidden">
                              <img
                                src={preset.url}
                                alt={titleText}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent flex flex-col justify-end p-2 text-white pointer-events-none text-left">
                              <span className="text-[10px] font-bold line-clamp-1">{titleText}</span>
                              <span className="text-[9px] text-slate-300 line-clamp-1">{descText}</span>
                            </div>
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs pointer-events-none">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sub-mode 2: Local File Upload */}
                {artImageMode === 'upload' && (
                  <div className="space-y-2">
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-purple-300 hover:border-purple-500 bg-white/80 hover:bg-white rounded-2xl p-6 cursor-pointer transition-colors text-center">
                      <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-2">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        {tAdmin.uploadBtn}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1">
                        JPG, PNG, WebP
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* Sub-mode 3: Direct URL */}
                {artImageMode === 'url' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder={tAdmin.customUrlPlaceholder}
                        value={artCustomUrl}
                        onChange={e => setArtCustomUrl(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 ltr-isolate text-left"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (artCustomUrl.trim()) {
                            setArtImage(artCustomUrl.trim());
                          }
                        }}
                        className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                )}

                {/* LIVE PREVIEW OF CHOSEN IMAGE */}
                {artImage && (
                  <div className="pt-2 border-t border-purple-200/70">
                    <div className="flex items-center justify-between text-[11px] font-bold text-purple-900 mb-2">
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{tAdmin.selectedImagePreview}:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setArtImage(ARMENIA_PHOTO_PRESETS[0].url)}
                        className="text-slate-400 hover:text-purple-700 text-[10px] cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="relative aspect-21/9 sm:aspect-24/7 rounded-2xl overflow-hidden bg-slate-900 shadow-md">
                      <img
                        src={artImage}
                        alt="Article preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = ARMENIA_PHOTO_PRESETS[0].url;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3.5">
                        <div className="text-white">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300 block">
                            {artCategory}
                          </span>
                          <span className="text-xs sm:text-sm font-bold line-clamp-1">
                            {artTitle || 'Article Title'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Full Content */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {tAdmin.articleContentLabel}
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder="### 1. Key Information..."
                  value={artContent}
                  onChange={e => setArtContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 leading-relaxed focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-hidden transition-all"
                />
              </div>

              {/* Submit CTA */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer flex items-center gap-2 hover:-translate-y-0.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{tAdmin.saveArticleBtn}</span>
                </button>
              </div>
            </form>
          </div>

          {/* LIST OF REGISTERED ARTICLES */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                {tAdmin.publishedArticlesTitle} ({store.articles.length}):
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {store.articles.map(art => (
                <div
                  key={art.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-all text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80 shadow-2xs">
                      <img
                        src={art.featuredImage}
                        alt={art.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = ARMENIA_PHOTO_PRESETS[0].url;
                        }}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 text-sm font-bold truncate block">
                          {art.title}
                        </strong>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 uppercase">
                          {art.language || 'fa'}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5 flex items-center gap-2">
                        <span className="text-purple-700 font-semibold">{art.category}</span>
                        <span>•</span>
                        <span>{tAdmin.colVerifiedDate}: {art.lastVerifiedDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <span
                      className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                        art.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {art.status === 'published' ? tAdmin.statusPublished : tAdmin.statusDraft}
                    </span>

                    <button
                      type="button"
                      onClick={() => onNavigate('article-detail', { slug: art.slug })}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="View"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>View</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete article "${art.title}"?`)) {
                          appStore.deleteArticle(art.id);
                        }
                      }}
                      className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 cursor-pointer transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-slate-900">{tAdmin.auditTitle}</h2>
          <p className="text-xs text-slate-500">{tAdmin.auditSubtitle}</p>
          <div className="space-y-2">
            {store.auditLogs.map(log => (
              <div key={log.id} className="p-3 rounded-xl bg-white border border-slate-200 text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold text-purple-700 mr-2">[{log.action}]</span>
                  <span className="text-slate-800">{log.details}</span>
                  <span className="text-[11px] text-slate-400 mr-2">by {log.actorName} ({log.actorRole})</span>
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
