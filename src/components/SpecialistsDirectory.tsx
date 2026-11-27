import { useMemo, useState } from 'react';
import { QrCode, Search, ShieldCheck, Star } from 'lucide-react';
import type { Lang } from '../i18n/translations';
import { convertCurrency, formatMoney, TEXT } from '../i18n/translations';
import type {
  CategoryRecord,
  ReviewRecord,
  SpecialistProfile,
  SpecialistService,
  SupportedCurrency,
  VerificationDocument,
} from '../shared/types';

export interface EnrichedSpecialist extends SpecialistProfile {
  verifiedDocuments: Array<
    Pick<
      VerificationDocument,
      | 'id'
      | 'docType'
      | 'titleAr'
      | 'titleEn'
      | 'issuingAuthority'
      | 'status'
      | 'verificationMethod'
      | 'verificationSource'
      | 'confidenceLevel'
      | 'verifiedAt'
    >
  >;
  services: SpecialistService[];
  reviews: ReviewRecord[];
}

interface SpecialistsDirectoryProps {
  lang: Lang;
  currency: SupportedCurrency;
  categories: CategoryRecord[];
  specialists: EnrichedSpecialist[];
  onInspectQr: (refCode: string) => void;
  onRequestSpecialist: (specialist: EnrichedSpecialist) => void;
}

export function SpecialistsDirectory({
  lang,
  currency,
  categories,
  specialists,
  onInspectQr,
  onRequestSpecialist,
}: SpecialistsDirectoryProps) {
  const t = TEXT[lang];
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDegree, setSelectedDegree] = useState<string>('ALL');
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return specialists.filter((spec) => {
      if (selectedCategory !== 'ALL' && spec.primaryCategoryId !== selectedCategory) {
        return false;
      }
      if (selectedDegree !== 'ALL' && spec.highestDegree !== selectedDegree) {
        return false;
      }
      if (!q) return true;
      return (
        spec.displayName.toLowerCase().includes(q) ||
        spec.headlineAr.toLowerCase().includes(q) ||
        spec.headlineEn.toLowerCase().includes(q) ||
        spec.bioAr.toLowerCase().includes(q) ||
        spec.credentialRefCode.toLowerCase().includes(q)
      );
    });
  }, [specialists, query, selectedCategory, selectedDegree]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {lang === 'ar' ? 'دليل المختصين الموثقين' : 'Verified Specialists Directory'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {lang === 'ar'
              ? 'جميع المختصين الظاهرين اجتازوا التحقق الإلزامي من الهوية والمؤهلات العلمية أو المهنية.'
              : 'All listed specialists have passed mandatory identity and academic/professional credential verification.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full ps-9 pe-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
            />
          </div>

          <select
            value={selectedDegree}
            onChange={(e) => setSelectedDegree(e.target.value)}
            aria-label={t.allDegrees}
            className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          >
            <option value="ALL">{t.allDegrees}</option>
            <option value="PHD">{lang === 'ar' ? 'دكتوراه' : 'PhD'}</option>
            <option value="MASTERS">{lang === 'ar' ? 'ماجستير' : 'Masters'}</option>
            <option value="BACHELORS">{lang === 'ar' ? 'بكالوريوس' : 'Bachelors'}</option>
            <option value="PRO_LICENSE">{lang === 'ar' ? 'ترخيص مهني' : 'Pro License'}</option>
          </select>
        </div>
      </div>

      {/* Category interactive segmented filter controls */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            selectedCategory === 'ALL'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {t.allCategories}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === cat.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {lang === 'ar' ? cat.nameAr : cat.nameEn}
          </button>
        ))}
      </div>

      {/* Specialists Grid — Zero-Pill Metadata Discipline */}
      {filtered.length === 0 ? (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-10 text-center space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {lang === 'ar'
              ? 'لا يوجد مختصون مطابقون لمعايير البحث الحالية.'
              : 'No verified specialists match the current filters.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedCategory('ALL');
              setSelectedDegree('ALL');
            }}
            className="px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((spec) => {
            const category = categories.find((c) => c.id === spec.primaryCategoryId);
            const primaryService = spec.services[0];
            const convertedPrice = primaryService
              ? convertCurrency(primaryService.basePrice, primaryService.baseCurrency, currency)
              : null;

            return (
              <article
                key={spec.id}
                className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* Top Identity Row */}
                  <div className="flex items-start gap-4">
                    {spec.avatarUrl && !failedAvatars[spec.id] ? (
                      <img
                        src={spec.avatarUrl}
                        alt={spec.displayName}
                        referrerPolicy="no-referrer"
                        onError={() => setFailedAvatars((prev) => ({ ...prev, [spec.id]: true }))}
                        className="w-16 h-16 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-lg text-slate-700 dark:text-slate-200 shrink-0">
                        {spec.displayName.slice(0, 2)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                        {spec.displayName}
                      </h3>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {lang === 'ar' ? spec.headlineAr : spec.headlineEn}
                      </p>
                      {/* Clean unboxed metadata row */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{lang === 'ar' ? category?.nameAr : category?.nameEn}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {t.verifiedCredentialLabel}
                        </span>
                        {spec.isInternalTeam && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-blue-700 dark:text-blue-400 font-medium">
                              {t.internalTeamLabel}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {lang === 'ar' ? spec.bioAr : spec.bioEn}
                  </p>

                  {/* Verified Credentials List (no nested rounded box clutter; hairline divider) */}
                  <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 space-y-1.5">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {lang === 'ar' ? 'المؤهلات المتحقق منها:' : 'Verified Credentials:'}
                    </p>
                    {spec.verifiedDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400"
                      >
                        <span className="truncate">
                          {lang === 'ar' ? doc.titleAr : doc.titleEn} — {doc.issuingAuthority}
                        </span>
                        <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 shrink-0">
                          {doc.confidenceLevel || 'VERIFIED'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Metrics & Actions */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                      <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                      {spec.avgRating.toFixed(2)}
                    </span>
                    <span>
                      {spec.completedOrdersCount}{' '}
                      {lang === 'ar' ? 'طلب مكتمل' : 'completed'}
                    </span>
                    {convertedPrice !== null && primaryService && (
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {lang === 'ar' ? 'يبدأ من' : 'From'} {formatMoney(convertedPrice, currency)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onInspectQr(spec.credentialRefCode)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{spec.credentialRefCode}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestSpecialist(spec)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg whitespace-nowrap"
                    >
                      {lang === 'ar' ? 'طلب خدمة' : 'Request Service'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
