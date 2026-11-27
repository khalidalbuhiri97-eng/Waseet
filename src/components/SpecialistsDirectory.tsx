import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Clock, QrCode, Search, ShieldCheck, Star, X } from 'lucide-react';
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
  externalQuery?: string;
  onInspectQr: (refCode: string) => void;
  onRequestSpecialist: (specialist: EnrichedSpecialist) => void;
}

export function SpecialistsDirectory({
  lang,
  currency,
  categories,
  specialists,
  externalQuery,
  onInspectQr,
  onRequestSpecialist,
}: SpecialistsDirectoryProps) {
  const t = TEXT[lang];
  const [query, setQuery] = useState(externalQuery || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDegree, setSelectedDegree] = useState<string>('ALL');
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});
  const [activeProfile, setActiveProfile] = useState<EnrichedSpecialist | null>(null);

  useEffect(() => {
    if (externalQuery !== undefined) {
      setQuery(externalQuery);
    }
  }, [externalQuery]);

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
    <section id="directory" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
            {lang === 'ar' ? 'نخبة الكفاءات المفحوصة' : 'Audited Expertise'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white mt-1">
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
              className="w-full ps-9 pe-3 py-2 text-sm border border-stone-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
            />
          </div>

          <select
            value={selectedDegree}
            onChange={(e) => setSelectedDegree(e.target.value)}
            aria-label={t.allDegrees}
            className="px-3 py-2 text-sm border border-stone-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
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
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            selectedCategory === 'ALL'
              ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
              : 'bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
          }`}
        >
          {t.allCategories}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === cat.id
                ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                : 'bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
            }`}
          >
            {lang === 'ar' ? cat.nameAr : cat.nameEn}
          </button>
        ))}
      </div>

      {/* Specialists Grid */}
      {filtered.length === 0 ? (
        <div className="border border-stone-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#0D121B] p-12 text-center space-y-3">
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
            className="px-4 py-2 text-xs font-semibold border border-stone-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800"
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
              <motion.article
                key={spec.id}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="border border-stone-200 dark:border-slate-800 hover:border-stone-300 dark:hover:border-slate-700 bg-white dark:bg-[#0D121B] rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-5 transition-colors"
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    {spec.avatarUrl && !failedAvatars[spec.id] ? (
                      <img
                        src={spec.avatarUrl}
                        alt={spec.displayName}
                        referrerPolicy="no-referrer"
                        onError={() => setFailedAvatars((prev) => ({ ...prev, [spec.id]: true }))}
                        className="w-20 h-20 rounded-xl object-cover border border-stone-200 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xl text-slate-700 dark:text-slate-200 shrink-0">
                        {spec.displayName.slice(0, 2)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveProfile(spec)}
                        className="text-start text-lg font-bold text-slate-950 dark:text-white hover:text-blue-700 dark:hover:text-blue-400 transition-colors truncate block w-full"
                      >
                        {spec.displayName}
                      </button>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                        {lang === 'ar' ? spec.headlineAr : spec.headlineEn}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{lang === 'ar' ? category?.nameAr : category?.nameEn}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {t.verifiedCredentialLabel}
                        </span>
                        {spec.isInternalTeam && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-blue-700 dark:text-blue-400 font-semibold">
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

                  {/* Verified Credentials */}
                  <div className="pt-3.5 border-t border-stone-200/80 dark:border-slate-800 space-y-1.5">
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
                <div className="pt-4 border-t border-stone-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                    <span className="inline-flex items-center gap-1 font-bold text-slate-950 dark:text-white">
                      <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                      {spec.avgRating.toFixed(2)}
                    </span>
                    <span className="text-stone-300 dark:text-slate-700" aria-hidden="true">·</span>
                    <span>
                      {spec.completedOrdersCount}{' '}
                      {lang === 'ar' ? 'طلب' : 'orders'}
                    </span>
                    {convertedPrice !== null && primaryService && (
                      <>
                        <span className="text-stone-300 dark:text-slate-700" aria-hidden="true">·</span>
                        <span className="font-bold text-slate-950 dark:text-white">
                          {formatMoney(convertedPrice, currency)}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveProfile(spec)}
                      className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white underline underline-offset-4 whitespace-nowrap"
                    >
                      {lang === 'ar' ? 'الملف والخدمات' : 'Profile'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onInspectQr(spec.credentialRefCode)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-stone-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 whitespace-nowrap"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{spec.credentialRefCode}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestSpecialist(spec)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg whitespace-nowrap transition-colors"
                    >
                      {lang === 'ar' ? 'طلب خدمة' : 'Request Service'}
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Interactive Specialist Profile Modal */}
      {activeProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#0D121B] rounded-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {activeProfile.avatarUrl && !failedAvatars[activeProfile.id] ? (
                  <img
                    src={activeProfile.avatarUrl}
                    alt={activeProfile.displayName}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl object-cover border border-stone-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-stone-100 dark:bg-slate-800 flex items-center justify-center font-bold text-lg">
                    {activeProfile.displayName.slice(0, 2)}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-slate-950 dark:text-white">
                    {activeProfile.displayName}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {lang === 'ar' ? activeProfile.headlineAr : activeProfile.headlineEn}
                  </p>
                  <p className="text-xs font-mono text-slate-500 mt-1">
                    {activeProfile.credentialRefCode} · {activeProfile.onTimeRate}%{' '}
                    {lang === 'ar' ? 'التزام بالموعد' : 'on-time'} ·{' '}
                    {activeProfile.responseTimeHours}h {lang === 'ar' ? 'استجابة' : 'response'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveProfile(null)}
                aria-label="Close"
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {lang === 'ar' ? activeProfile.bioAr : activeProfile.bioEn}
            </p>

            {/* Services Offered */}
            <div className="space-y-3 border-t border-stone-200 dark:border-slate-800 pt-4">
              <h4 className="text-sm font-bold text-slate-950 dark:text-white">
                {lang === 'ar' ? 'الباقات والخدمات الجاهزة' : 'Ready Service Offerings'}
              </h4>
              {activeProfile.services.map((srv) => {
                const price = convertCurrency(srv.basePrice, srv.baseCurrency, currency);
                return (
                  <div
                    key={srv.id}
                    className="p-4 border border-stone-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {lang === 'ar' ? srv.titleAr : srv.titleEn}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {lang === 'ar' ? srv.descriptionAr : srv.descriptionEn}
                      </p>
                    </div>
                    <div className="text-end shrink-0 space-y-1">
                      <p className="text-sm font-bold font-mono tabular-nums text-slate-950 dark:text-white">
                        {formatMoney(price, currency)}
                      </p>
                      <p className="text-xs text-slate-500 inline-flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {srv.deliveryDays}d
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Verified Reviews */}
            {activeProfile.reviews.length > 0 && (
              <div className="space-y-3 border-t border-stone-200 dark:border-slate-800 pt-4">
                <h4 className="text-sm font-bold text-slate-950 dark:text-white">
                  {lang === 'ar' ? 'تقييمات العملاء الموثقة' : 'Verified Client Reviews'}
                </h4>
                {activeProfile.reviews.map((rev) => (
                  <div key={rev.id} className="text-xs space-y-1 pb-2">
                    <div className="flex items-center justify-between font-semibold">
                      <span>{rev.reviewerName}</span>
                      <span className="font-mono text-amber-600">{rev.ratingOverall} / 5</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-stone-200 dark:border-slate-800 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  const code = activeProfile.credentialRefCode;
                  setActiveProfile(null);
                  onInspectQr(code);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-stone-300 dark:border-slate-700 rounded-lg"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'فحص شهادة QR' : 'Verify QR Credential'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = activeProfile;
                  setActiveProfile(null);
                  onRequestSpecialist(target);
                }}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
              >
                {lang === 'ar' ? 'بدء طلب مع هذا المختص' : 'Request This Specialist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
