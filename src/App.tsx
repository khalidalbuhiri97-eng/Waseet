import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from './lib/api';
import type { Lang } from './i18n/translations';
import type { CategoryRecord, PlatformSettings, SupportedCurrency } from './shared/types';
import { Navbar, type AppSection } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import {
  SpecialistsDirectory,
  type EnrichedSpecialist,
} from './components/SpecialistsDirectory';
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

export default function App() {
  const [lang, setLang] = useState<Lang>('ar');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currency, setCurrency] = useState<SupportedCurrency>('SAR');
  const [activeSection, setActiveSection] = useState<AppSection>('specialists');
  const [qrLookupCode, setQrLookupCode] = useState<string | undefined>(undefined);
  const [preselectedSpecialistId, setPreselectedSpecialistId] = useState<string | null>(null);

  const [marketplace, setMarketplace] = useState<MarketplacePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [currentUser, setCurrentUser] = useState<AuthUserSession | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Sync HTML dir, lang, and Tailwind v4 .dark class
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Support QR verification URL deep link (?verify=WST-CR-...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyCode = params.get('verify');
    if (verifyCode) {
      setQrLookupCode(verifyCode);
      setActiveSection('verify');
    }
  }, []);

  const fetchMarketplace = useCallback(async () => {
    try {
      const res = await apiRequest<MarketplacePayload>('/api/marketplace');
      setMarketplace(res);
      setLoadError('');
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMarketplace();
  }, [fetchMarketplace]);

  const completedOrdersCount = marketplace
    ? marketplace.specialists.reduce((sum, s) => sum + s.completedOrdersCount, 0)
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar
        lang={lang}
        activeSection={activeSection}
        onNavigate={(section) => setActiveSection(section)}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      <main className="flex-1">
        <HeroSection
          lang={lang}
          theme={theme}
          currency={currency}
          onToggleLang={() => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'))}
          onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
          onChangeCurrency={setCurrency}
          onNavigate={setActiveSection}
          verifiedCount={marketplace?.specialists.length || 0}
          categoriesCount={marketplace?.categories.length || 0}
          completedOrdersCount={completedOrdersCount}
        />

        {loadError && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
            <div className="p-4 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 rounded-lg text-sm text-red-700 dark:text-red-300">
              {loadError}
            </div>
          </div>
        )}

        {loading && !marketplace ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((k) => (
              <div
                key={k}
                className="h-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
              />
            ))}
          </div>
        ) : (
          marketplace && (
            <>
              {activeSection === 'specialists' && (
                <SpecialistsDirectory
                  lang={lang}
                  currency={currency}
                  categories={marketplace.categories}
                  specialists={marketplace.specialists}
                  onInspectQr={(refCode) => {
                    setQrLookupCode(refCode);
                    setActiveSection('verify');
                  }}
                  onRequestSpecialist={(spec) => {
                    setPreselectedSpecialistId(spec.id);
                    if (!currentUser) {
                      setAuthModalOpen(true);
                    } else {
                      setActiveSection('workspace');
                    }
                  }}
                />
              )}

              {activeSection === 'requests' && (
                <OpenRequestsView
                  lang={lang}
                  currency={currency}
                  categories={marketplace.categories}
                  openOrders={marketplace.openOrders}
                  onGoToWorkspace={() => {
                    if (!currentUser) {
                      setAuthModalOpen(true);
                    } else {
                      setActiveSection('workspace');
                    }
                  }}
                />
              )}

              {activeSection === 'verify' && (
                <QrVerifyView lang={lang} initialRefCode={qrLookupCode} />
              )}

              {activeSection === 'workspace' && (
                <WorkspaceView
                  lang={lang}
                  currency={currency}
                  currentUser={currentUser}
                  categories={marketplace.categories}
                  preselectedSpecialistId={preselectedSpecialistId}
                  onOpenAuth={() => setAuthModalOpen(true)}
                  onDataChanged={() => void fetchMarketplace()}
                />
              )}

              {activeSection === 'admin' && (
                <AdminConsoleView
                  lang={lang}
                  currentUser={currentUser}
                  onOpenAuth={() => setAuthModalOpen(true)}
                  onDataChanged={() => void fetchMarketplace()}
                />
              )}
            </>
          )
        )}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            wseet — {lang === 'ar' ? 'منصة تجمع الخبرة بالفرصة' : 'Where Expertise Meets Opportunity'}
          </p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveSection('verify')}
              className="hover:text-slate-900 dark:hover:text-white"
            >
              {lang === 'ar' ? 'التحقق عبر QR' : 'QR Verification'}
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('requests')}
              className="hover:text-slate-900 dark:hover:text-white"
            >
              {lang === 'ar' ? 'سياسة النزاهة الأكاديمية' : 'Academic Integrity'}
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('admin')}
              className="hover:text-slate-900 dark:hover:text-white"
            >
              {lang === 'ar' ? 'حوكمة الإدارة' : 'Governance Console'}
            </button>
          </div>
        </div>
      </footer>

      <AuthModal
        open={authModalOpen}
        lang={lang}
        categories={marketplace?.categories || []}
        currentUser={currentUser}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={(user) => {
          setCurrentUser(user);
          if (user && (user.role === 'SUPER_ADMIN' || user.role === 'MODERATOR')) {
            setActiveSection('admin');
          } else if (user) {
            setActiveSection('workspace');
          }
        }}
      />
    </div>
  );
}
