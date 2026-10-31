import {TranslatorView} from './views/TranslatorView';
import {articleInLanguage} from './utils/article-language';
import {publicPage} from './utils/public-seo';
import {RecommendationsView} from './views/RecommendationsView';
import {parseBrowserRoute,browserPath} from './utils/public-routes';
import {AccountActionView} from './components/AccountSettings';
import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { AppLanguage, User } from './types';
import { appStore } from './services/store';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomeView } from './views/HomeView';
import { AuthModal } from './views/AuthModal';
import { parseRoute, routeHash } from './utils/navigation';
import { useLanguage } from './context/LanguageContext';
import { ContentLoading } from './components/ContentLoading';
import { loadingText, type StartupStatus } from './i18n/loading';

const HostelsView = lazy(() => import('./views/HostelsView').then(module => ({ default: module.HostelsView })));
const HostelDetailView = lazy(() => import('./views/HostelDetailView').then(module => ({ default: module.HostelDetailView })));
const BookingTrackingView = lazy(() => import('./views/BookingTrackingView').then(module => ({ default: module.BookingTrackingView })));
const RentalsView = lazy(() => import('./views/RentalsView').then(module => ({ default: module.RentalsView })));
const RentalDetailView = lazy(() => import('./views/RentalDetailView').then(module => ({ default: module.RentalDetailView })));
const RentalTrackingView = lazy(() => import('./views/RentalTrackingView').then(module => ({ default: module.RentalTrackingView })));
const GuideView = lazy(() => import('./views/GuideView').then(module => ({ default: module.GuideView })));
const ArticleDetailView = lazy(() => import('./views/ArticleDetailView').then(module => ({ default: module.ArticleDetailView })));
const AdminPanelView = lazy(() => import('./views/AdminPanelView').then(module => ({ default: module.AdminPanelView })));
const ManagerPanelView = lazy(() => import('./views/ManagerPanelView').then(module => ({ default: module.ManagerPanelView })));
const TravelerAccountView = lazy(() => import('./views/TravelerAccountView').then(module => ({ default: module.TravelerAccountView })));
const StaticPages = lazy(() => import('./views/StaticPages').then(module => ({ default: module.StaticPages })));

const SavedPlacesView = lazy(() => import('./views/SavedPlacesView').then(module => ({ default: module.SavedPlacesView })));

export default function App({ startupStatus = 'ready', onStartupRetry }: { startupStatus?: StartupStatus; onStartupRetry?: () => void } = {}) {
  const [storeState, setStoreState] = useState(() => appStore.getState());
  const { currentLang, setLanguage } = useLanguage();
  const navigationVersion = useRef(0);
  const mainRef = useRef<HTMLElement>(null);
  const requestedTracking = useRef({ booking: '', inquiry: '' });

  const [activeView, setActiveView] = useState<string>(() => parseBrowserRoute(window.location.pathname+window.location.search,window.location.hash).view);
  const [viewParams, setViewParams] = useState<any>(() => parseBrowserRoute(window.location.pathname+window.location.search,window.location.hash).params);
  const [trackingLoading, setTrackingLoading] = useState(() => ['booking-track', 'rental-track'].includes(parseBrowserRoute(window.location.pathname + window.location.search, window.location.hash).view));
  const [trackingError, setTrackingError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = appStore.subscribe(() => {
      setStoreState({ ...appStore.getState() });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (startupStatus !== 'ready') return;
    const timer = window.setInterval(() => { void appStore.refresh().catch(() => {}); }, 15_000);
    return () => window.clearInterval(timer);
  }, [startupStatus]);

  // Every page has a stable URL; refresh and browser Back retain the selected view.
  useEffect(() => {
    let active = true;
    const handleHash = async () => {
      const version = ++navigationVersion.current;
      const route = parseBrowserRoute(window.location.pathname+window.location.search,window.location.hash);
      const language=window.location.pathname.split('/')[1];if(['fa','en','ru','hy'].includes(language))setLanguage(language as AppLanguage);
      setTrackingError(''); setActiveView(route.view); setViewParams(route.params);
      const tracking = route.view === 'booking-track' || route.view === 'rental-track';
      setTrackingLoading(tracking);
      // Bootstrap fetches the initial public state. Tracking pages still fetch
      // their private data, and leaving one clears its token. Other public
      // navigation reuses the state instead of repeating the initial GET.
      if (startupStatus !== 'ready') return;
      const tokens = { booking: route.view === 'booking-track' ? String(route.params.token) : '', inquiry: route.view === 'rental-track' ? String(route.params.token) : '' };
      try {
        if (tracking || tokens.booking !== requestedTracking.current.booking || tokens.inquiry !== requestedTracking.current.inquiry) {
          requestedTracking.current = tokens;
          await appStore.track(tokens.booking, tokens.inquiry);
        }
      } catch {
        if (active && version === navigationVersion.current && tracking) setTrackingError(({ fa: 'ارتباط برقرار نشد. دوباره تلاش کنید.', en: 'Unable to connect. Please try again.', ru: 'Нет соединения. Попробуйте ещё раз.', hy: 'Կապը չհաստատվեց։ Փորձեք կրկին։' })[currentLang]);
      }
      if (active && version === navigationVersion.current) { setTrackingLoading(false); mainRef.current?.focus({ preventScroll: true }); }
    };
    void handleHash();
    window.addEventListener('hashchange', handleHash);window.addEventListener('popstate',handleHash);
    return () => { active = false; window.removeEventListener('hashchange', handleHash);window.removeEventListener('popstate',handleHash); };
  }, [startupStatus, currentLang]);

  const handleNavigate = (view: string, params: any = {}) => {
    const path=browserPath(view,params,currentLang,appStore.getState());
    if(window.location.pathname+window.location.search+window.location.hash!==path){window.history.pushState({},'',path);window.dispatchEvent(new PopStateEvent('popstate'));}
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  const handleLogout = async () => {
    const result = await appStore.logout();
    if (!result.success) { window.alert(result.error); return; }
    if (activeView === 'admin' || activeView === 'manager' || activeView === 'account') {
      handleNavigate('home');
    }
  };

  useEffect(()=>{
    const isPrivate=!!window.location.hash||['admin','manager','account','account-action','booking-track','rental-track','saved','not-found'].includes(activeView);
    const pagePath=window.location.pathname==='/'?'/'+currentLang+'/':window.location.pathname;const page=publicPage(storeState,pagePath+window.location.search,window.location.origin);
    document.title=isPrivate?'YEREVANHUB':page.title;
    const meta=(name:string,value:string,property=false)=>{const selector=property?`meta[property="${name}"]`:`meta[name="${name}"]`;let element=document.head.querySelector(selector);if(!element){element=document.createElement('meta');element.setAttribute(property?'property':'name',name);document.head.appendChild(element);}element.setAttribute('content',value);};
    meta('robots',isPrivate?'noindex,nofollow':page.status===404||page.noindex?'noindex,nofollow':'index,follow');meta('description',isPrivate?'':page.description??'');meta('og:title',isPrivate?'YEREVANHUB':page.title);meta('og:description',isPrivate?'':page.description??'');if(!isPrivate&&page.image)meta('og:image',new URL(page.image,window.location.origin).href,true);else document.head.querySelector('meta[property="og:image"]')?.remove();
    meta('og:url',window.location.origin+(isPrivate?'/':pagePath));
    const canonical=document.head.querySelector('link[rel="canonical"]')??document.head.appendChild(document.createElement('link'));canonical.setAttribute('rel','canonical');canonical.setAttribute('href',window.location.origin+(isPrivate?'/':pagePath));
    for(const node of document.head.querySelectorAll('link[hreflang]'))node.remove();
    if(!isPrivate&&page.status===200)for(const lang of ['fa','en','ru','hy']){if(activeView==='article-detail'){const original=storeState.articles.find(a=>a.slug===viewParams.slug||a.id===viewParams.slug);if(!original||!articleInLanguage(original,lang as AppLanguage))continue;}const link=document.createElement('link');link.rel='alternate';link.hreflang=lang;link.href=window.location.origin+pagePath.replace(/^\/(fa|en|ru|hy)/,'/'+lang);document.head.appendChild(link);}
  },[activeView,currentLang,storeState,viewParams]);
  const currentUser = storeState.currentUser;

  const unavailable = () => (
    <div className="max-w-3xl mx-auto p-8 text-center" role="alert">
      <p>{({ fa: 'صفحه یافت نشد یا دسترسی مجاز نیست.', en: 'Page not found or access unavailable.', ru: 'Страница не найдена или доступ недоступен.', hy: 'Էջը չի գտնվել կամ հասանելի չէ։' })[currentLang]}</p>
      <button className="mt-4 underline" onClick={() => handleNavigate('home')}>YEREVANHUB</button>
    </div>
  );

  // Render current view
  const renderView = () => {
    if (startupStatus !== 'ready' && !['home', 'translator'].includes(activeView))
      return startupStatus === 'error' ? <TranslatorView currentLang={currentLang} phrases={appStore.getPhrases()} /> : <ContentLoading lang={currentLang} />;
    if (trackingLoading) return <ContentLoading lang={currentLang} />;
    if (trackingError) return <div role="alert" className="p-8 text-center">{trackingError}</div>;
    switch (activeView) {
      case 'account-action':return <AccountActionView purpose={String(viewParams.purpose)} token={String(viewParams.token)}/>;
      case 'recommendations':return <RecommendationsView onNavigate={handleNavigate} initial={{...viewParams,amenities:typeof viewParams.amenities==='string'?viewParams.amenities.split(',').filter(Boolean):viewParams.amenities}}/>;
      case 'saved': return <SavedPlacesView onNavigate={handleNavigate} />;
      case 'home':
        return (
          <HomeView
            loading={startupStatus === 'loading'}
            unavailable={startupStatus === 'error'}
            currentLang={currentLang}
            hostels={appStore.getHostels()}
            rentals={appStore.getRentals()}
            articles={appStore.getArticles().flatMap(article=>articleInLanguage(article,currentLang)??[])}
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
            articles={appStore.getArticles().flatMap(article=>articleInLanguage(article,currentLang)??[])}
            onNavigate={handleNavigate}
          />
        );

      case 'article-detail': {
        const slug = viewParams?.slug || 'armenia-visa-and-residency-guide-for-iranians-2026';
        const originalArticle=appStore.getArticleBySlug(slug);const article=originalArticle?articleInLanguage(originalArticle,currentLang):undefined;
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
            articles={appStore.getArticles().flatMap(article=>articleInLanguage(article,currentLang)??[])}
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
        {startupStatus === 'error' && <div role="alert" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm text-rose-900 bg-rose-50"><p>{loadingText(currentLang).failed}</p><button type="button" onClick={onStartupRetry} className="button-secondary">{loadingText(currentLang).retry}</button></div>}
        <Suspense fallback={<ContentLoading lang={currentLang} />}>
          {renderView()}
        </Suspense>
        {startupStatus === 'error' && activeView === 'home' && <TranslatorView currentLang={currentLang} phrases={appStore.getPhrases()} />}
      </main>

      {/* Global Footer */}
      {!['admin','manager','account'].includes(activeView)&&<Footer currentLang={currentLang} onNavigate={handleNavigate} />}

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
