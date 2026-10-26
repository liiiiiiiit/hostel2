import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { AppLanguage, User } from './types';
import { appStore } from './services/store';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomeView } from './views/HomeView';
import { AuthModal } from './views/AuthModal';
import { parseRoute, routeHash } from './utils/navigation';
import { useLanguage } from './context/LanguageContext';

const HostelsView = lazy(() => import('./views/HostelsView').then(module => ({ default: module.HostelsView })));
const HostelDetailView = lazy(() => import('./views/HostelDetailView').then(module => ({ default: module.HostelDetailView })));
const BookingTrackingView = lazy(() => import('./views/BookingTrackingView').then(module => ({ default: module.BookingTrackingView })));
const RentalsView = lazy(() => import('./views/RentalsView').then(module => ({ default: module.RentalsView })));
const RentalDetailView = lazy(() => import('./views/RentalDetailView').then(module => ({ default: module.RentalDetailView })));
const RentalTrackingView = lazy(() => import('./views/RentalTrackingView').then(module => ({ default: module.RentalTrackingView })));
const GuideView = lazy(() => import('./views/GuideView').then(module => ({ default: module.GuideView })));
const ArticleDetailView = lazy(() => import('./views/ArticleDetailView').then(module => ({ default: module.ArticleDetailView })));
const TranslatorView = lazy(() => import('./views/TranslatorView').then(module => ({ default: module.TranslatorView })));
const AdminPanelView = lazy(() => import('./views/AdminPanelView').then(module => ({ default: module.AdminPanelView })));
const ManagerPanelView = lazy(() => import('./views/ManagerPanelView').then(module => ({ default: module.ManagerPanelView })));
const TravelerAccountView = lazy(() => import('./views/TravelerAccountView').then(module => ({ default: module.TravelerAccountView })));
const StaticPages = lazy(() => import('./views/StaticPages').then(module => ({ default: module.StaticPages })));

const SavedPlacesView = lazy(() => import('./views/SavedPlacesView').then(module => ({ default: module.SavedPlacesView })));

export default function App() {
  const [storeState, setStoreState] = useState(() => appStore.getState());
  const { currentLang, setLanguage } = useLanguage();
  const navigationVersion = useRef(0);
  const mainRef = useRef<HTMLElement>(null);

  const [activeView, setActiveView] = useState<string>(() => parseRoute(window.location.hash).view);
  const [viewParams, setViewParams] = useState<any>(() => parseRoute(window.location.hash).params);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = appStore.subscribe(() => {
      setStoreState({ ...appStore.getState() });
    });
    const timer = window.setInterval(() => { void appStore.refresh().catch(() => {}); }, 15_000);
    return () => { unsubscribe(); window.clearInterval(timer); };
  }, []);

  // Every page has a stable URL; refresh and browser Back retain the selected view.
  useEffect(() => {
    let active = true;
    const handleHash = async () => {
      const version = ++navigationVersion.current;
      const route = parseRoute(window.location.hash);
      setTrackingError(''); setActiveView(route.view); setViewParams(route.params);
      const tracking = route.view === 'booking-track' || route.view === 'rental-track';
      setTrackingLoading(tracking);
      try {
        await appStore.track(route.view === 'booking-track' ? String(route.params.token) : '', route.view === 'rental-track' ? String(route.params.token) : '');
      } catch {
        if (active && version === navigationVersion.current && tracking) setTrackingError(({ fa: 'ارتباط برقرار نشد. دوباره تلاش کنید.', en: 'Unable to connect. Please try again.', ru: 'Нет соединения. Попробуйте ещё раз.', hy: 'Կապը չհաստատվեց։ Փորձեք կրկին։' })[currentLang]);
      }
      if (active && version === navigationVersion.current) { setTrackingLoading(false); mainRef.current?.focus({ preventScroll: true }); }
    };
    void handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => { active = false; window.removeEventListener('hashchange', handleHash); };
  }, []);

  const handleNavigate = (view: string, params: any = {}) => {
    const hash = routeHash(view, params);
    if (window.location.hash !== hash) window.location.hash = hash;
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  const handleLogout = async () => {
    const result = await appStore.logout();
    if (!result.success) { window.alert(result.error); return; }
    if (activeView === 'admin' || activeView === 'manager' || activeView === 'account') {
      handleNavigate('home');
    }
  };

  const currentUser = storeState.currentUser;

  const unavailable = () => (
    <div className="max-w-3xl mx-auto p-8 text-center" role="alert">
      <p>{({ fa: 'صفحه یافت نشد یا دسترسی مجاز نیست.', en: 'Page not found or access unavailable.', ru: 'Страница не найдена или доступ недоступен.', hy: 'Էջը չի գտնվել կամ հասանելի չէ։' })[currentLang]}</p>
      <button className="mt-4 underline" onClick={() => handleNavigate('home')}>YEREVANHUB</button>
    </div>
  );

  // Render current view
  const renderView = () => {
    if (trackingLoading) return <div className="p-8 text-center" role="status">YEREVANHUB…</div>;
    if (trackingError) return <div role="alert" className="p-8 text-center">{trackingError}</div>;
    switch (activeView) {
      case 'saved': return <SavedPlacesView onNavigate={handleNavigate} />;
      case 'home':
        return (
          <HomeView
            currentLang={currentLang}
            hostels={appStore.getHostels()}
            rentals={appStore.getRentals()}
            articles={appStore.getArticles()}
            phrases={appStore.getPhrases()}
            onNavigate={handleNavigate}
            getHostelRating={id => appStore.getHostelAverageRating(id)}
          />
        );

      case 'hostels':
        return (
          <HostelsView
            key={JSON.stringify(viewParams)}
            currentLang={currentLang}
            hostels={appStore.getHostels()}
            onNavigate={handleNavigate}
            getHostelRating={id => appStore.getHostelAverageRating(id)}
            initialFilter={viewParams}
          />
        );

      case 'hostel-detail': {
        const hostel = appStore.getHostelByIdOrSlug(viewParams?.id || '');
        if (!hostel?.isPublished) return unavailable();
        const reviews = storeState.reviews.filter(r => r.hostelId === hostel.id && r.status === 'approved');
        return (
          <HostelDetailView
            key={`${hostel.id}:${viewParams.checkIn ?? ''}:${viewParams.checkOut ?? ''}:${viewParams.guests ?? ''}`}
            initialBooking={viewParams}
            currentLang={currentLang}
            hostel={hostel}
            reviews={reviews}
            onNavigate={handleNavigate}
            getHostelRating={id => appStore.getHostelAverageRating(id)}
          />
        );
      }

      case 'booking-track': {
        const booking = appStore.getBookingByToken(viewParams?.token || '');
        if (!booking) return unavailable();
        const hostel = storeState.hostels.find(h => h.id === booking?.hostelId);
        return (
          <BookingTrackingView
            key={booking.id}
            currentLang={currentLang}
            booking={booking}
            hostel={hostel}
            onNavigate={handleNavigate}
          />
        );
      }

      case 'rentals':
        return (
          <RentalsView
            currentLang={currentLang}
            key={JSON.stringify(viewParams)}
            rentals={appStore.getRentals()}
            onNavigate={handleNavigate}
            initialFilter={viewParams}
          />
        );

      case 'rental-detail': {
        const rental = appStore.getRentalByIdOrSlug(viewParams?.id || '');
        if (!rental || rental.status !== 'published') return unavailable();
        return (
          <RentalDetailView
            key={rental.id}
            currentLang={currentLang}
            rental={rental}
            onNavigate={handleNavigate}
          />
        );
      }

      case 'rental-track': {
        const inquiry = appStore.getRentalInquiryByToken(viewParams?.token || '');
        if (!inquiry) return unavailable();
        const property = storeState.rentals.find(r => r.id === inquiry?.propertyId);
        return (
          <RentalTrackingView
            currentLang={currentLang}
            inquiry={inquiry}
            property={property}
            onNavigate={handleNavigate}
          />
        );
      }

      case 'guide':
        return (
          <GuideView
            currentLang={currentLang}
            articles={appStore.getArticles()}
            onNavigate={handleNavigate}
          />
        );

      case 'article-detail': {
        const slug = viewParams?.slug || 'armenia-visa-and-residency-guide-for-iranians-2026';
        const article = appStore.getArticleBySlug(slug);
        if (!article || article.status !== 'published') return unavailable();
        const related = storeState.articles
          .filter(a => a.id !== article.id && a.category === article.category && a.status === 'published')
          .slice(0, 2);
        return (
          <ArticleDetailView
            currentLang={currentLang}
            article={article}
            relatedArticles={related}
            onNavigate={handleNavigate}
          />
        );
      }

      case 'translator':
        return (
          <TranslatorView
            currentLang={currentLang}
            phrases={appStore.getPhrases()}
          />
        );

      case 'admin':
        if (!currentUser?.isActive || currentUser.role !== 'admin') return unavailable();
        return <AdminPanelView currentLang={currentLang} onNavigate={handleNavigate} />;

      case 'manager':
        if (!currentUser?.isActive || currentUser.role !== 'hostel_manager') return unavailable();
        return <ManagerPanelView currentLang={currentLang} onNavigate={handleNavigate} />;

      case 'account':
        return currentUser ? (
          <TravelerAccountView
            currentLang={currentLang}
            currentUser={currentUser}
            onNavigate={handleNavigate}
          />
        ) : (
          <HomeView
            currentLang={currentLang}
            hostels={appStore.getHostels()}
            rentals={appStore.getRentals()}
            articles={appStore.getArticles()}
            phrases={appStore.getPhrases()}
            onNavigate={handleNavigate}
            getHostelRating={id => appStore.getHostelAverageRating(id)}
          />
        );

      case 'about':
      case 'contact':
      case 'rules':
      case 'privacy':
        return <StaticPages currentLang={currentLang} pageType={activeView} />;

      default: return unavailable();
    }
  };

  return (
    <div className="app-shell min-h-screen flex flex-col text-slate-900">
      <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); mainRef.current?.focus(); mainRef.current?.scrollIntoView(); }}>{currentLang === 'fa' ? 'رفتن به محتوا' : 'Skip to content'}</a>
      {/* Top Header */}
      <Header
        currentLang={currentLang}
        onLanguageChange={setLanguage}
        activeView={activeView}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />


      {storeState.previewMode && <div role="status" className="px-4 py-3 bg-amber-50 text-amber-950 text-center text-sm">{({ fa: 'پیش‌نمایش: مرور و مقایسه فعال است؛ ثبت رزرو و ورود هنوز فعال نشده‌اند.', en: 'Preview: browse and compare stays. Booking and sign-in are not enabled yet.', ru: 'Предпросмотр: просмотр и сравнение доступны. Бронирование и вход пока не включены.', hy: 'Նախադիտում․ դիտումն ու համեմատությունը հասանելի են։ Ամրագրումն ու մուտքը դեռ միացված չեն։' })[currentLang]}</div>}
      {/* Main Content Area */}
      <main id="main-content" ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={<div className="p-8 text-center" role="status">YEREVANHUB…</div>}>
          {renderView()}
        </Suspense>
      </main>

      {/* Global Footer */}
      <Footer currentLang={currentLang} onNavigate={handleNavigate} />

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          currentLang={currentLang}
          onClose={() => setShowAuthModal(false)}
          onSuccess={user => {
            if (user.role === 'admin') handleNavigate('admin');
            else if (user.role === 'hostel_manager') handleNavigate('manager');
            else handleNavigate('account');
          }}
        />
      )}
    </div>
  );
}
