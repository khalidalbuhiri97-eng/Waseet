import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpLeft, ArrowUpRight, Globe, Moon, Search, ShieldCheck, Sun } from 'lucide-react';
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
  onQuickSearch: (query: string) => void;
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
  onQuickSearch,
  verifiedCount,
  categoriesCount,
  completedOrdersCount,
}: HeroSectionProps) {
  const t = TEXT[lang];
  const [imgError, setImgError] = useState(false);
  const [heroQuery, setHeroQuery] = useState('');

  const ArrowIcon = lang === 'ar' ? ArrowUpLeft : ArrowUpRight;

  const pillars =
    lang === 'ar'
      ? [
          {
            num: '01.',
            title: 'توثيق إلزامي عبر QR',
            desc: 'لا يُسمح لأي مختص بتقديم عرض قبل التحقق من الهوية والمؤهلات مع سجل تحقق عام دون كشف البيانات الشخصية.',
          },
          {
            num: '02.',
            title: 'اتفاقية رقمية ملزمة',
            desc: 'لقطة عقد غير قابلة للتعديل تثبت المخرجات والموعد النهائي وعدد التعديلات وسعر الصرف قبل الدفع.',
          },
          {
            num: '03.',
            title: 'سجل مالي مزدوج القيد',
            desc: 'فصل تام بين الأموال المحجوزة ومستحقات المختصين وعمولة المنصة والمبالغ المستردة بدقة محاسبية.',
          },
        ]
      : [
          {
            num: '01.',
            title: 'Mandatory QR Verification',
            desc: 'Specialists cannot submit offers until identity and degrees are verified, backed by a zero-PII public QR registry.',
          },
          {
            num: '02.',
            title: 'Immutable Agreement Snapshot',
            desc: 'Scope, deliverables, revision limits, and locked FX rates are signed digitally before order funding.',
          },
          {
            num: '03.',
            title: 'Double-Entry Financial Ledger',
            desc: 'Strict accounting segregation across held funds, specialist payables, platform commission, and refunds.',
          },
        ];

  return (
    <section className="border-b border-stone-200 dark:border-slate-800 bg-white dark:bg-[#0D121B]">
      {/* Compact Utility Bar */}
      <div className="border-b border-stone-200/80 dark:border-slate-800/80 bg-[#F8F7F4] dark:bg-[#090C12]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
          <p className="truncate max-w-2xl">{t.ledgerRuleBanner}</p>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-0.5 p-0.5 bg-stone-200/80 dark:bg-slate-800 rounded-lg">
              {(['SAR', 'USD', 'USDT'] as SupportedCurrency[]).map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => onChangeCurrency(curr)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    currency === curr
                      ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onToggleLang}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-stone-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-stone-300 dark:hover:border-slate-600 whitespace-nowrap shrink-0 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{t.languageLabel}</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-stone-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-stone-300 dark:hover:border-slate-600 whitespace-nowrap shrink-0 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              <span>{theme === 'light' ? t.themeDark : t.themeLight}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Editorial Hero Split */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 flex flex-col justify-between space-y-8"
          >
            <div className="space-y-5">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 tracking-wide">
                {lang === 'ar'
                  ? 'wseet · منصة تجمع الخبرة بالفرصة'
                  : 'wseet · Where Verified Expertise Meets Opportunity'}
              </p>

              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-[1.18] text-slate-950 dark:text-white headline-balance">
                {t.heroTitle}
              </h1>

              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                {t.heroSubtitle}
              </p>

              {/* Quick Search Bar integrated smoothly into Hero */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onQuickSearch(heroQuery);
                }}
                className="flex flex-col sm:flex-row gap-2.5 pt-1 max-w-xl"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={heroQuery}
                    onChange={(e) => setHeroQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full ps-10 pe-3.5 py-2.5 text-sm border border-stone-300 dark:border-slate-700 rounded-lg bg-[#F8F7F4] dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-700"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{lang === 'ar' ? 'ابحث عن مختص' : 'Find Specialist'}</span>
                  <ArrowIcon className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="flex flex-wrap items-center gap-5 pt-2 text-sm">
              <button
                type="button"
                onClick={() => onNavigate('workspace')}
                className="font-semibold text-slate-950 dark:text-white underline underline-offset-4 hover:text-blue-700 dark:hover:text-blue-400 whitespace-nowrap"
              >
                {lang === 'ar' ? 'نشر طلب خدمة جديد' : 'Post a New Request'}
              </button>
              <span className="text-stone-300 dark:text-slate-700" aria-hidden="true">/</span>
              <button
                type="button"
                onClick={() => onNavigate('verify')}
                className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <span>{t.heroSecondaryAction}</span>
              </button>
            </div>
          </motion.div>

          {/* Right Media Column with Architectural Frame & Measured Contrast Scrim */}
          <motion.div
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6"
          >
            {!imgError ? (
              <div className="relative h-72 sm:h-88 lg:h-full min-h-[320px] rounded-2xl overflow-hidden border border-stone-200 dark:border-slate-800 bg-stone-100 dark:bg-slate-900">
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
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex items-end p-6">
                  <div className="text-white space-y-1">
                    <p className="text-xs font-mono tracking-wide text-slate-200">
                      SAR · USD · USDT (TRC-20)
                    </p>
                    <p className="text-sm sm:text-base font-semibold">
                      {lang === 'ar'
                        ? 'وساطة معرفية محمية بالتوثيق المرجعي والتحكيم المالي المزدوج'
                        : 'Knowledge mediation protected by credential verification and double-entry governance'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-72 sm:h-88 lg:h-full min-h-[320px] rounded-2xl border border-stone-200 dark:border-slate-800 bg-gradient-to-br from-stone-100 to-stone-200 dark:from-slate-800 dark:to-slate-900 flex flex-col items-center justify-center p-8 text-center">
                <ShieldCheck className="w-10 h-10 text-blue-700 dark:text-blue-400 mb-3" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t.brand}
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Full-width 4-column Summary Strip */}
        <div className="mt-12 pt-8 border-t border-stone-200 dark:border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'المختصون الموثقون' : 'Verified Specialists'}
            </p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-950 dark:text-white">
              {verifiedCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'التصنيفات التخصصية' : 'Service Categories'}
            </p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-950 dark:text-white">
              {categoriesCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'عملات التسوية المعتمدة' : 'Settlement Currencies'}
            </p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-950 dark:text-white">
              SAR · USD · USDT
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'طلبات مكتملة موثقة' : 'Verified Completions'}
            </p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-950 dark:text-white">
              {completedOrdersCount}
            </p>
          </div>
        </div>

        {/* 3 Numbered Editorial Governance Pillars */}
        <div className="mt-8 pt-8 border-t border-stone-200/80 dark:border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((item) => (
            <div key={item.num} className="space-y-1.5">
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                <span className="font-mono text-blue-700 dark:text-blue-400 me-2">{item.num}</span>
                {item.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
