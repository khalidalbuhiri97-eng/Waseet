import { useEffect, useState } from 'react';
import { CheckCircle2, Lock, Search, ShieldAlert } from 'lucide-react';
import { apiRequest } from '../lib/api';
import type { Lang } from '../i18n/translations';
import { TEXT } from '../i18n/translations';
import { QrCodeCanvas } from './QrCodeCanvas';

interface VerifiedLookupResult {
  credentialRefCode: string;
  displayName: string;
  headlineAr: string;
  headlineEn: string;
  categoryNameAr: string;
  categoryNameEn: string;
  verificationStatus: string;
  isInternalTeam: boolean;
  revokedAt: string | null;
  credentials: Array<{
    id: string;
    docType: string;
    titleAr: string;
    titleEn: string;
    issuingAuthority: string;
    status: string;
    verificationMethod?: string;
    verificationSource?: string;
    confidenceLevel?: string;
    verifiedAt?: string;
    expiresAt?: string;
  }>;
  privacyNotice: string;
}

interface QrVerifyViewProps {
  lang: Lang;
  initialRefCode?: string;
}

export function QrVerifyView({ lang, initialRefCode }: QrVerifyViewProps) {
  const t = TEXT[lang];
  const [refInput, setRefInput] = useState(initialRefCode || 'WST-CR-94821');
  const [result, setResult] = useState<VerifiedLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (codeToCheck: string) => {
    const clean = codeToCheck.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<VerifiedLookupResult>(`/api/verify/${encodeURIComponent(clean)}`);
      setResult(data);
    } catch (err: unknown) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRefCode) {
      setRefInput(initialRefCode);
      void handleVerify(initialRefCode);
    } else {
      void handleVerify('WST-CR-94821');
    }
  }, [initialRefCode]);

  const qrVerifyUrl =
    typeof window !== 'undefined' && result
      ? `${window.location.origin}/?verify=${result.credentialRefCode}`
      : `https://wseet.app/verify/${refInput}`;

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.qrVerifyTitle}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t.qrPrivacyNote}</p>
      </div>

      {/* Lookup Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleVerify(refInput);
        }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
          <input
            type="text"
            value={refInput}
            onChange={(e) => setRefInput(e.target.value)}
            placeholder="WST-CR-94821"
            className="w-full ps-9 pe-3 py-2.5 text-sm font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap shrink-0"
        >
          {loading
            ? lang === 'ar'
              ? 'جارٍ التحقق...'
              : 'Verifying...'
            : lang === 'ar'
              ? 'فحص الرقم المرجعي'
              : 'Verify Reference'}
        </button>
      </form>

      {/* Quick test reference buttons */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>{lang === 'ar' ? 'رموز مرجعية سريعة:' : 'Sample Reference IDs:'}</span>
        {['WST-CR-94821', 'WST-CR-73109', 'WST-CR-61240', 'WST-CR-50814'].map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => {
              setRefInput(code);
              void handleVerify(code);
            }}
            className="font-mono underline hover:text-blue-700 dark:hover:text-blue-400"
          >
            {code}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                <span>{result.credentialRefCode}</span>
                <span>·</span>
                <span>{lang === 'ar' ? result.categoryNameAr : result.categoryNameEn}</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {result.displayName}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {lang === 'ar' ? result.headlineAr : result.headlineEn}
              </p>

              <div className="pt-2 flex items-center gap-2 text-sm font-semibold">
                {result.verificationStatus === 'REVOKED' ? (
                  <span className="inline-flex items-center gap-1.5 text-red-700 dark:text-red-400">
                    <ShieldAlert className="w-4 h-4" />
                    {lang === 'ar'
                      ? 'تحذير: تم إبطال هذا الاعتماد'
                      : 'REVOKED: This credential has been revoked'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    {lang === 'ar'
                      ? 'اعتماد ساري وموثق'
                      : 'Active Verified Credential'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 shrink-0">
              <QrCodeCanvas
                value={qrVerifyUrl}
                size={132}
                alt={`QR ${result.credentialRefCode}`}
              />
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {result.credentialRefCode}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              {lang === 'ar'
                ? 'سجل المؤهلات ووسيلة ومصدر التحقق'
                : 'Verified Qualifications, Method & Source'}
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2 pe-4 font-semibold text-start">
                      {lang === 'ar' ? 'المؤهل' : 'Qualification'}
                    </th>
                    <th className="py-2 pe-4 font-semibold text-start">
                      {lang === 'ar' ? 'جهة الإصدار' : 'Issuer'}
                    </th>
                    <th className="py-2 pe-4 font-semibold text-start">
                      {lang === 'ar' ? 'وسيلة ومصدر التحقق' : 'Method & Source'}
                    </th>
                    <th className="py-2 pe-4 font-semibold text-start">
                      {lang === 'ar' ? 'درجة الموثوقية' : 'Confidence'}
                    </th>
                    <th className="py-2 font-semibold text-start">
                      {lang === 'ar' ? 'الحالة' : 'Status'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.credentials.map((cred) => (
                    <tr
                      key={cred.id}
                      className="border-b border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300"
                    >
                      <td className="py-3 pe-4 font-medium">
                        {lang === 'ar' ? cred.titleAr : cred.titleEn}
                      </td>
                      <td className="py-3 pe-4">{cred.issuingAuthority}</td>
                      <td className="py-3 pe-4">
                        {cred.verificationMethod} — {cred.verificationSource}
                      </td>
                      <td className="py-3 pe-4 font-mono">{cred.confidenceLevel || 'HIGH'}</td>
                      <td
                        className={`py-3 font-semibold ${
                          cred.status === 'REVOKED'
                            ? 'text-red-700 dark:text-red-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {cred.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>{result.privacyNotice}</span>
          </div>
        </div>
      )}
    </section>
  );
}
