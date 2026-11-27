import { useCallback, useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { ArrowLeft, ArrowRight, AlertCircle, Compass, FileSearch, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { apiRequest } from './lib/api';
import type { Lang } from './i18n/translations';
import type { CategoryRecord, PlatformSettings, SupportedCurrency } from './shared/types';
import { Navbar, type AppSection } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { SpecialistsDirectory, type EnrichedSpecialist } from './components/SpecialistsDirectory';
import { OpenRequestsView, type PublicOpenOrder } from './components/OpenRequestsView';
import { QrVerifyView } from './components/QrVerifyView';
import { WorkspaceView } from './components/WorkspaceView';
import { AdminConsoleView } from './components/AdminConsoleView';
import { AuthModal, type AuthUserSession } from './components/AuthModal';

interface MarketplacePayload {
  categories: CategoryRecord[];
  specialists: EnrichedSpecialist[];
  openOrders: PublicOpenOrder[];
  settings: PlatformSettings;
}

function SectionIntro({ lang, section }: { lang: Lang; section: Exclude<AppSection, 'specialists'> }) {
  const copy = {
    requests: {
      ar: ['فرص العمل', 'استكشف الطلبات المنشورة وقدّم عرضك المناسب.'],
      en: ['Open opportunities', 'Explore published requests and submit a proposal that fits.'],
    },
    verify: {
      ar: ['مركز التحقق', 'تحقق من صحة الاعتمادات المهنية والوثائق عبر رمز مرجعي أو QR.'],
      en: ['Verification center', 'Check professional credentials and documents using a reference code or QR.'],
    },
    workspace: {
      ar: ['مساحة العمل', 'أدر طلباتك وعروضك واتفاقياتك ومراحل التسليم في مكان واحد.'],
      en: ['Your workspace', 'Manage requests, proposals, agreements and delivery milestones in one place.'],
    },
    admin: {
      ar: ['مركز الإدارة والحوكمة', 'إدارة التوثيق والنزاعات والسجل المالي ومراجعة نشاط المنصة.'],
      en: ['Administration & governance', 'Manage verification, disputes, the financial ledger and platform activity.'],
    },
  } as const;
  const [title, description] = copy[section][lang];
  return (
    <div className="relative overflow-hidden border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0B1220]">
      <div className="absolute inset-0 pointer-events-none opacity-60" aria-hidden="true">
        <div className="absolute -top-24 end-10 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-28 start-1/3 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-9 sm:py-12">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
          <Sparkles className="h-4 w-4" />
          WASEET <span className="text-slate-300 dark:text-slate-700">/</span>
          {lang === 'ar' ? 'منصة الخبرات' : 'EXPERTISE PLATFORM'}
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base leading-7 text-slate-600 dark:text-slate-300">{description}</p>
      </div>
    </div>
  );
}

function LoadingState({ lang }: { lang: Lang }) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6" aria-label={lang === 'ar' ? 'جاري التحميل' : 'Loading'}>
      <div className="h-7 w-56 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[0, 1, 2].map((item) => <div key={item} className="h-56 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />)}
      </div>
    </section>
  );
}

export default function App() {
  const [lang, setLang] = useState<Lang>('ar');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currency, setCurrency] = useState<SupportedCurrency>('SAR');
  const [activeSection, setActiveSection] = useState<AppSection>('specialists');
  const [qrLookupCode, setQrLookupCode] = useState<string | undefined>(undefined);
  const [preselectedSpecialistId, setPreselectedSpecialistId] = useState<string | null>(null);
  const [heroSearchQuery, setHeroSearchQuery] = useState<string | undefined>(undefined);
  const [marketplace, setMarketplace] = useState<MarketplacePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentUser, setCurrentUser] = useState<AuthUserSession | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyCode = params.get('verify');
    if (verifyCode) {
      setQrLookupCode(verifyCode);
      setActiveSection('verify');
    }
  }, []);

  const fetchMarketplace = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<MarketplacePayload>('/api/marketplace');
      setMarketplace(res);
      setLoadError('');
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : (lang === 'ar' ? 'تعذر تحميل بيانات المنصة.' : 'Could not load platform data.'));
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    void fetchMarketplace();
  }, [fetchMarketplace]);

  const completedOrdersCount = marketplace
    ? marketplace.specialists.reduce((sum, specialist) => sum + specialist.completedOrdersCount, 0)
    : 0;

  const navigate = (section: AppSection) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isArabic = lang === 'ar';
  const sectionTitles: Record<Exclude<AppSection, 'specialists'>, string> = {
    requests: isArabic ? 'الطلبات المفتوحة' : 'Open requests',
    verify: isArabic ? 'التحقق من الاعتمادات' : 'Credential verification',
    workspace: isArabic ? 'مساحة العمل' : 'Workspace',
    admin: isArabic ? 'الإدارة والحوكمة' : 'Administration',
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex flex-col bg-[#F6F8FC] text-slate-900 dark:bg-[#080E1A] dark:text-slate-100">
        <Navbar lang={lang} activeSection={activeSection} onNavigate={navigate} currentUser={currentUser} onOpenAuth={() => setAuthModalOpen(true)} />
        <main className="flex-1">
          {activeSection === 'specialists' ? (
            <HeroSection
              lang={lang} theme={theme} currency={currency}
              onToggleLang={() => setLang((prev) => prev === 'ar' ? 'en' : 'ar')}
              onToggleTheme={() => setTheme((prev) => prev === 'light' ? 'dark' : 'light')}
              onChangeCurrency={setCurrency} onNavigate={navigate}
              onQuickSearch={(query) => {
                setHeroSearchQuery(query);
                setTimeout(() => document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' }), 50);
              }}
              verifiedCount={marketplace?.specialists.length || 0}
              categoriesCount={marketplace?.categories.length || 0}
              completedOrdersCount={completedOrdersCount}
            />
          ) : (
            <SectionIntro lang={lang} section={activeSection} />
          )}

          {loadError && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
              <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-800 dark:text-rose-200">
                <div className="flex items-start gap-2"><AlertCircle className="h-5 w-5 shrink-0 mt-0.5" /><span>{loadError}</span></div>
                <button type="button" onClick={() => void fetchMarketplace()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 font-bold text-white hover:bg-rose-800">
                  <RefreshCw className="h-4 w-4" />{isArabic ? 'إعادة المحاولة' : 'Try again'}
                </button>
              </div>
            </div>
          )}

          {loading && !marketplace ? <LoadingState lang={lang} /> : !marketplace ? (
            <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"><Compass className="h-8 w-8" /></div>
              <h2 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">{isArabic ? 'المنصة غير متاحة مؤقتاً' : 'The platform is temporarily unavailable'}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">{isArabic ? 'تعذر الاتصال بخدمات وسيط. تحقق من الاتصال ثم أعد المحاولة.' : 'We could not connect to Waseet services. Check your connection and try again.'}</p>
              <button type="button" onClick={() => void fetchMarketplace()} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800"><RefreshCw className="h-4 w-4" />{isArabic ? 'إعادة المحاولة' : 'Retry'}</button>
            </section>
          ) : (
            <>
              {activeSection === 'specialists' && <SpecialistsDirectory lang={lang} currency={currency} categories={marketplace.categories} specialists={marketplace.specialists} externalQuery={heroSearchQuery} onInspectQr={(code) => { setQrLookupCode(code); navigate('verify'); }} onRequestSpecialist={(specialist) => { setPreselectedSpecialistId(specialist.id); if (!currentUser) setAuthModalOpen(true); else navigate('workspace'); }} />}
              {activeSection === 'requests' && <OpenRequestsView lang={lang} currency={currency} categories={marketplace.categories} openOrders={marketplace.openOrders} onGoToWorkspace={() => { if (!currentUser) setAuthModalOpen(true); else navigate('workspace'); }} />}
              {activeSection === 'verify' && <QrVerifyView lang={lang} initialRefCode={qrLookupCode} />}
              {activeSection === 'workspace' && <WorkspaceView lang={lang} currency={currency} currentUser={currentUser} categories={marketplace.categories} preselectedSpecialistId={preselectedSpecialistId} onOpenAuth={() => setAuthModalOpen(true)} onDataChanged={() => void fetchMarketplace()} />}
              {activeSection === 'admin' && <AdminConsoleView lang={lang} currentUser={currentUser} onOpenAuth={() => setAuthModalOpen(true)} onDataChanged={() => void fetchMarketplace()} />}
            </>
          )}
        </main>

        <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-lg font-black text-white">و</span><div><p className="font-extrabold text-slate-950 dark:text-white">WASEET</p><p className="text-[11px] text-slate-500">{isArabic ? 'منصة الخبرات والخدمات المتخصصة' : 'Specialist expertise marketplace'}</p></div></div>
                <p className="mt-4 max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">{isArabic ? 'مساحة موثوقة تجمع أصحاب الاحتياج بالمختصين، وتمنح كل طلب مساراً واضحاً من الاتفاق حتى التسليم.' : 'A trusted space connecting clients with specialists through a clear process from agreement to delivery.'}</p>
              </div>
              <div><p className="text-sm font-bold text-slate-900 dark:text-white">{isArabic ? 'استكشف وسيط' : 'Explore Waseet'}</p><div className="mt-3 flex flex-col items-start gap-2 text-sm text-slate-500 dark:text-slate-400"><button onClick={() => navigate('specialists')} className="hover:text-blue-700">{isArabic ? 'دليل المختصين' : 'Specialists'}</button><button onClick={() => navigate('requests')} className="hover:text-blue-700">{isArabic ? 'الطلبات المفتوحة' : 'Open requests'}</button><button onClick={() => navigate('verify')} className="hover:text-blue-700">{isArabic ? 'التحقق من الاعتمادات' : 'Verification'}</button></div></div>
              <div><p className="text-sm font-bold text-slate-900 dark:text-white">{isArabic ? 'حسابك' : 'Your account'}</p><div className="mt-3 flex flex-col items-start gap-2 text-sm text-slate-500 dark:text-slate-400"><button onClick={() => navigate('workspace')} className="hover:text-blue-700">{isArabic ? 'مساحة العمل' : 'Workspace'}</button><button onClick={() => setAuthModalOpen(true)} className="hover:text-blue-700">{currentUser ? (isArabic ? 'الحساب' : 'Account') : (isArabic ? 'تسجيل الدخول' : 'Sign in')}</button></div></div>
            </div>
            <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400"><span>© {new Date().getFullYear()} Waseet. {isArabic ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</span><span>{isArabic ? 'الخبرة المناسبة، في المكان المناسب.' : 'The right expertise, in the right place.'}</span></div>
          </div>
        </footer>

        <AuthModal open={authModalOpen} lang={lang} categories={marketplace?.categories || []} currentUser={currentUser} onClose={() => setAuthModalOpen(false)} onAuthenticated={(user) => { setCurrentUser(user); if (user && (user.role === 'SUPER_ADMIN' || user.role === 'MODERATOR')) navigate('admin'); else if (user) navigate('workspace'); }} />
      </div>
    </MotionConfig>
  );
}
