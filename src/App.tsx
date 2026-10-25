import React, { Suspense, lazy, useState, useEffect } from 'react';
import { AppLanguage, User } from './types';
import { appStore } from './services/store';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomeView } from './views/HomeView';
import { AuthModal } from './views/AuthModal';
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

export default function App() {
  const [storeState, setStoreState] = useState(() => appStore.getState());
  const { currentLang, setLanguage } = useLanguage();

  const [activeView, setActiveView] = useState<string>('home');
  const [viewParams, setViewParams] = useState<any>({});
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = appStore.subscribe(() => {
      setStoreState({ ...appStore.getState() });
    });
    appStore.expirePendingBookings();
    const timer = window.setInterval(() => appStore.expirePendingBookings(), 30_000);
    return () => { unsubscribe(); window.clearInterval(timer); };
  }, []);

  // Handle URL hash or direct parameter initialization
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('/booking/')) {
        const token = hash.replace('/booking/', '');
        setActiveView('booking-track');
        setViewParams({ token });
      } else if (hash.startsWith('/rental-request/')) {
        const token = hash.replace('/rental-request/', '');
        setActiveView('rental-track');
        setViewParams({ token });
      } else {
        setActiveView('home');
        setViewParams({});
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleNavigate = (view: string, params: any = {}) => {
    setActiveView(view);
    setViewParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update URL hash for private tracking links without full page reload
    if (view === 'booking-track' && params?.token) {
      window.location.hash = `/booking/${params.token}`;
    } else if (view === 'rental-track' && params?.token) {
      window.location.hash = `/rental-request/${params.token}`;
    } else {
      if (window.location.hash) window.history.pushState(null, '', window.location.pathname + window.location.search);
    }
  };

  const handleLogout = () => {
    appStore.logout();
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
    switch (activeView) {
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
            key={hostel.id}
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

      default:
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
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
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

      {/* Main Content Area */}
      <main className="flex-1">
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
