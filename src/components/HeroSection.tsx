import { useState } from 'react';
import { Globe, Moon, Search, ShieldCheck, Sun } from 'lucide-react';
import type { Lang } from '../i18n/translations';
import { TEXT } from '../i18n/translations';
import type { SupportedCurrency } from '../shared/types';
import type { AppSection } from './Navbar';

interface HeroSectionProps {
  lang: Lang;
  theme: 'light' | 'dark';
  currency: SupportedCurrency;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  onChangeCurrency: (curr: SupportedCurrency) => void;
  onNavigate: (section: AppSection) => void;
  verifiedCount: number;
  categoriesCount: number;
  completedOrdersCount: number;
}

const HERO_IMG_PATH = '/src/assets/images/hero_wseet_workspace_1795807712500.jpg';

export function HeroSection({
  lang,
  theme,
  currency,
  onToggleLang,
  onToggleTheme,
  onChangeCurrency,
  onNavigate,
  verifiedCount,
  categoriesCount,
  completedOrdersCount,
}: HeroSectionProps) {
  const t = TEXT[lang];
  const [imgError, setImgError] = useState(false);

  return (
    <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      {/* Compact Utility Toolbar below Top Bar (keeps Top Bar strictly 3 zones) */}
      <div className="border-b border-slate-200/80 dark:border-slate-800 bg-stone-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
          <p className="truncate max-w-2xl">{t.ledgerRuleBanner}</p>

          <div className="flex items-center gap-3 shrink-0">
            {/* Currency segmented control */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-md">
              {(['SAR', 'USD', 'USDT'] as SupportedCurrency[]).map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => onChangeCurrency(curr)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    currency === curr
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onToggleLang}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 whitespace-nowrap shrink-0"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{t.languageLabel}</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 whitespace-nowrap shrink-0"
            >
              {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              <span>{theme === 'light' ? t.themeDark : t.themeLight}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-column Hero Split with items-stretch */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400 tracking-wide">
                {lang === 'ar'
                  ? 'التوثيق الإلزامي · السجل المزدوج · النزاهة الأكاديمية'
                  : 'Mandatory Verification · Double-Entry Ledger · Academic Integrity'}
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-bold leading-tight text-slate-900 dark:text-white headline-balance">
                {t.heroTitle}
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                {t.heroSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('workspace')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Search className="w-4 h-4" />
                <span>{lang === 'ar' ? 'اطلب خدمة أو ابدأ كمختص' : 'Post Request or Join'}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('verify')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{t.heroSecondaryAction}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            {!imgError ? (
              <div className="relative h-64 sm:h-80 lg:h-full min-h-[280px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-stone-100 dark:bg-slate-800">
                <img
                  src={HERO_IMG_PATH}
                  alt={
                    lang === 'ar'
                      ? 'بيئة عمل استشارية وبحثية حديثة لمنصة wseet'
                      : 'Modern research and consulting workspace for wseet'
                  }
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-64 sm:h-80 lg:h-full min-h-[280px] rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-100 to-stone-200 dark:from-slate-800 dark:to-slate-900 flex flex-col items-center justify-center p-8 text-center">
                <ShieldCheck className="w-10 h-10 text-blue-700 dark:text-blue-400 mb-3" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t.brand}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Full-width 4-column summary strip directly below hero split */}
        <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'المختصون الموثقون' : 'Verified Specialists'}
            </p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {verifiedCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'التصنيفات التخصصية' : 'Service Categories'}
            </p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {categoriesCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'عملات التسوية المعتمدة' : 'Settlement Currencies'}
            </p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              SAR · USD · USDT
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'طلبات مكتملة موثقة' : 'Verified Completions'}
            </p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {completedOrdersCount}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
