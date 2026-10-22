import React, { useState, useEffect } from 'react';
import { AppLanguage, User } from './types';
import { appStore } from './services/store';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomeView } from './views/HomeView';
import { HostelsView } from './views/HostelsView';
import { HostelDetailView } from './views/HostelDetailView';
import { ImmediateStayView } from './views/ImmediateStayView';
import { BookingTrackingView } from './views/BookingTrackingView';
import { RentalsView } from './views/RentalsView';
import { RentalDetailView } from './views/RentalDetailView';
import { RentalTrackingView } from './views/RentalTrackingView';
import { GuideView } from './views/GuideView';
import { ArticleDetailView } from './views/ArticleDetailView';
import { TranslatorView } from './views/TranslatorView';
import { AdminPanelView } from './views/AdminPanelView';
import { ManagerPanelView } from './views/ManagerPanelView';
import { TravelerAccountView } from './views/TravelerAccountView';
import { AuthModal } from './views/AuthModal';
import { StaticPages } from './views/StaticPages';

export default function App() {
  const [storeState, setStoreState] = useState(() => appStore.getState());
  const [currentLang, setCurrentLang] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem('yerevanhub_lang');
    return (saved as AppLanguage) || 'fa'; // Default Persian on first visit
  });

  const [activeView, setActiveView] = useState<string>('home');
  const [viewParams, setViewParams] = useState<any>({});
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = appStore.subscribe(() => {
      setStoreState({ ...appStore.getState() });
    });
    return unsubscribe;
  }, []);

  // Update HTML lang & dir based on selected language
  useEffect(() => {
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'fa' ? 'rtl' : 'ltr';
    localStorage.setItem('yerevanhub_lang', currentLang);
  }, [currentLang]);

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
    } else if (view === 'home') {
      window.location.hash = '';
    }
  };

  const handleLogout = () => {
    appStore.logout();
    if (activeView === 'admin' || activeView === 'manager' || activeView === 'account') {
      handleNavigate('home');
    }
  };

  const currentUser = storeState.currentUser;

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
        const hostel = appStore.getHostelByIdOrSlug(viewParams?.id || 'hostel-1') || storeState.hostels[0];
        const reviews = storeState.reviews.filter(r => r.hostelId === hostel.id && r.status === 'approved');
        return (
          <HostelDetailView
            currentLang={currentLang}
            hostel={hostel}
            reviews={reviews}
            onNavigate={handleNavigate}
            getHostelRating={id => appStore.getHostelAverageRating(id)}
          />
        );
      }

      case 'immediate-stay':
        return (
          <ImmediateStayView
            currentLang={currentLang}
            hostels={appStore.getHostels()}
            onNavigate={handleNavigate}
            getHostelRating={id => appStore.getHostelAverageRating(id)}
          />
        );

      case 'booking-track': {
        const token = viewParams?.token || storeState.bookings[0]?.privateToken;
        const booking = appStore.getBookingByToken(token) || storeState.bookings[0];
        const hostel = storeState.hostels.find(h => h.id === booking?.hostelId);
        return (
          <BookingTrackingView
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
        const rental = appStore.getRentalByIdOrSlug(viewParams?.id || 'rental-1') || storeState.rentals[0];
        return (
          <RentalDetailView
            currentLang={currentLang}
            rental={rental}
            onNavigate={handleNavigate}
          />
        );
      }

      case 'rental-track': {
        const token = viewParams?.token || storeState.rentalInquiries[0]?.privateToken;
        const inquiry = appStore.getRentalInquiryByToken(token) || storeState.rentalInquiries[0];
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
        const article = appStore.getArticleBySlug(slug) || storeState.articles[0];
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
        return <AdminPanelView currentLang={currentLang} onNavigate={handleNavigate} />;

      case 'manager':
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
        onLanguageChange={setCurrentLang}
        activeView={activeView}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {renderView()}
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
