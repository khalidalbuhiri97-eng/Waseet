import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowUpLeft, ArrowUpRight, ArrowLeft, ArrowRight, Globe, Moon,
  Search, ShieldCheck, Sun, FileCheck2, WalletCards, MessageCircle,
} from 'lucide-react';
import heroImage from '../assets/images/hero_wseet_workspace_1795807712500.jpg';
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

export function HeroSection({
  lang, theme, currency, onToggleLang, onToggleTheme, onChangeCurrency,
  onNavigate, onQuickSearch, verifiedCount, categoriesCount, completedOrdersCount,
}: HeroSectionProps) {
  const t = TEXT[lang];
  const [heroQuery, setHeroQuery] = useState('');
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowUpLeft : ArrowUpRight;
  const DirectionIcon = isAr ? ArrowLeft : ArrowRight;

  const stats = [
    { value: verifiedCount, label: isAr ? 'مختصون موثقون' : 'Verified specialists', icon: ShieldCheck },
    { value: categoriesCount, label: isAr ? 'مجالات تخصصية' : 'Specialty categories', icon: FileCheck2 },
    { value: completedOrdersCount, label: isAr ? 'طلبات مكتملة' : 'Completed requests', icon: WalletCards },
  ];

  const features = [
    {
      icon: ShieldCheck,
      title: isAr ? 'ملفات مهنية قابلة للتحقق' : 'Verifiable professional profiles',
      desc: isAr ? 'راجع حالة اعتماد المختص ومصدر التحقق قبل بدء التعامل.' : 'Review a specialist’s credential status and verification source.',
    },
    {
      icon: FileCheck2,
      title: isAr ? 'اتفاق واضح لكل طلب' : 'A clear agreement for every request',
      desc: isAr ? 'حدد نطاق العمل والتسليم والمدة والتعديلات قبل اعتماد العرض.' : 'Define scope, delivery, timeline and revisions before accepting an offer.',
    },
    {
      icon: MessageCircle,
      title: isAr ? 'تواصل منظم داخل المنصة' : 'Organized in-platform communication',
      desc: isAr ? 'تابع تفاصيل الطلب ومراحله ورسائله من مساحة عمل واحدة.' : 'Keep request details, progress and messages in one workspace.',
    },
  ];

  return (
    <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-[#F6F8FC] dark:bg-[#080E1A]">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -start-28 h-96 w-96 rounded-full bg-blue-400/15 blur-3xl" />
        <div className="absolute top-24 -end-32 h-96 w-96 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
      </div>

      <div className="relative border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
            {t.ledgerRuleBanner}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
              {(['SAR', 'USD', 'USDT'] as SupportedCurrency[]).map((curr) => (
                <button key={curr} type="button" onClick={() => onChangeCurrency(curr)}
                  aria-pressed={currency === curr}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${currency === curr ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
                  {curr}
                </button>
              ))}
            </div>
            <button type="button" onClick={onToggleLang} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-400">
              <Globe className="h-3.5 w-3.5" />{t.languageLabel}
            </button>
            <button type="button" onClick={onToggleTheme} aria-label={theme === 'light' ? t.themeDark : t.themeLight}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-slate-700 dark:text-slate-200 hover:border-blue-400">
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-12 sm:pt-16 sm:pb-16 lg:pt-20 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-9 lg:gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-7">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50/90 dark:bg-blue-950/50 px-3 py-1.5 text-xs font-semibold text-blue-800 dark:text-blue-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {isAr ? 'وسيطك للخدمات والخبرات المتخصصة' : 'Your hub for specialist services and expertise'}
              </div>
              <h1 className="text-[2rem] sm:text-5xl lg:text-[3.35rem] font-extrabold leading-[1.2] tracking-tight text-slate-950 dark:text-white headline-balance">
                {isAr ? 'اعثر على الخبرة المناسبة، وأنجز عملك بثقة.' : 'Find the right expertise. Move your work forward.'}
              </h1>
              <p className="max-w-xl text-base sm:text-lg leading-8 text-slate-600 dark:text-slate-300">
                {isAr
                  ? 'منصة تربط أصحاب الطلبات بالمختصين في المجالات العلمية والمهنية والتقنية، مع ملفات موثقة ومسار عمل واضح من الطلب حتى التسليم.'
                  : 'A marketplace connecting clients with academic, professional and technical specialists through verifiable profiles and a clear workflow from request to delivery.'}
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); onQuickSearch(heroQuery.trim()); }}
              className="flex flex-col sm:flex-row gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-xl shadow-slate-900/5 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={heroQuery} onChange={(e) => setHeroQuery(e.target.value)}
                  placeholder={t.searchPlaceholder} aria-label={t.searchPlaceholder}
                  className="w-full rounded-xl bg-transparent py-3 ps-10 pe-3 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400" />
              </div>
              <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                {isAr ? 'ابحث عن مختص' : 'Find a specialist'}<ArrowIcon className="h-4 w-4" />
              </button>
            </form>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button type="button" onClick={() => onNavigate('requests')}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500">
                {isAr ? 'استعرض الطلبات المفتوحة' : 'Explore open requests'}<DirectionIcon className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => onNavigate('workspace')}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 px-5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 transition hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                {isAr ? 'انشر طلب خدمة' : 'Post a service request'}
              </button>
              <button type="button" onClick={() => onNavigate('verify')}
                className="inline-flex min-h-12 items-center justify-center gap-2 px-2 py-3 text-sm font-semibold text-blue-800 dark:text-blue-300 hover:underline">
                <ShieldCheck className="h-4 w-4" />{t.heroSecondaryAction}
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: isAr ? -18 : 18 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="lg:col-span-6">
            <div className="relative mx-auto max-w-2xl">
              <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-blue-500/20 via-cyan-400/10 to-indigo-500/20 blur-xl" />
              <div className="relative overflow-hidden rounded-[1.6rem] border border-white/70 dark:border-slate-700 bg-slate-200 shadow-2xl shadow-blue-950/15">
                <img src={heroImage} alt={isAr ? 'مساحة عمل احترافية ترمز إلى التعاون والخبرة' : 'Professional workspace representing collaboration and expertise'}
                  className="h-[290px] w-full object-cover sm:h-[390px] lg:h-[440px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">WASEET · {isAr ? 'منصة الخبرات' : 'EXPERTISE MARKETPLACE'}</p>
                  <p className="mt-2 max-w-md text-lg sm:text-xl font-bold leading-relaxed">
                    {isAr ? 'من الطلب الأول إلى التسليم النهائي، كل خطوة في مكان واحد.' : 'From the first request to final delivery, every step in one place.'}
                  </p>
                </div>
              </div>
              <div className="absolute -bottom-5 end-4 sm:end-7 flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 shadow-xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{isAr ? 'تحقق واضح من الاعتمادات' : 'Credential transparency'}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{isAr ? 'اعرف حالة الملف ومصدره' : 'See status and source'}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 border-y border-slate-200 dark:border-slate-800 py-6 sm:grid-cols-3 sm:gap-8">
          {stats.map(({ value, label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-extrabold tabular-nums text-slate-950 dark:text-white">{value.toLocaleString(isAr ? 'ar' : 'en')}</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 pt-8 md:grid-cols-3 md:gap-8">
          {features.map(({ icon: Icon, title, desc }, index) => (
            <div key={title} className="flex gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-white"><span className="me-2 text-xs text-blue-600 dark:text-blue-400">0{index + 1}</span>{title}</p>
                <p className="mt-1.5 text-xs leading-6 text-slate-600 dark:text-slate-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
