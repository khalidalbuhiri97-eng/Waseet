import { useCallback, useEffect, useState } from 'react';
import { BookOpenCheck, Lock, Scale, ShieldCheck, ShieldX } from 'lucide-react';
import { apiRequest } from '../lib/api';
import type { Lang } from '../i18n/translations';
import { getDocStatusLabel } from '../i18n/translations';
import type {
  AuditLogRecord,
  CategoryRecord,
  ConfidenceLevel,
  DisputeRecord,
  DocumentStatus,
  LedgerAccountType,
  LedgerBucketCategory,
  LedgerJournalEntry,
  OrderRecord,
  PayoutRequest,
  PlatformSettings,
  SpecialistProfile,
  SupportedCurrency,
  VerificationDocument,
} from '../shared/types';
import type { AuthUserSession } from './AuthModal';

interface AccountBalanceRow {
  accountCode: string;
  nameAr: string;
  nameEn: string;
  accountType: LedgerAccountType;
  bucketCategory: LedgerBucketCategory;
  currency: SupportedCurrency;
  debitTotal: number;
  creditTotal: number;
  netBalance: number;
}

interface AdminOverviewResponse {
  specialists: SpecialistProfile[];
  documents: VerificationDocument[];
  disputes: DisputeRecord[];
  orders: OrderRecord[];
  payouts: PayoutRequest[];
  categories: CategoryRecord[];
  journalEntries: LedgerJournalEntry[];
  trialBalance: {
    rows: AccountBalanceRow[];
    totalsByCurrency: Record<
      SupportedCurrency,
      { totalDebits: number; totalCredits: number; isBalanced: boolean }
    >;
  };
  auditLogs: AuditLogRecord[];
  settings: PlatformSettings;
}

interface AdminConsoleViewProps {
  lang: Lang;
  currentUser: AuthUserSession | null;
  onOpenAuth: () => void;
  onDataChanged: () => void;
}

export function AdminConsoleView({
  lang,
  currentUser,
  onOpenAuth,
  onDataChanged,
}: AdminConsoleViewProps) {
  const [tab, setTab] = useState<'verification' | 'ledger' | 'disputes' | 'categories' | 'audit'>(
    'ledger',
  );
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Review inputs
  const [verifyMethod, setVerifyMethod] = useState('التحقق عبر سجل الجهة المانحة');
  const [verifySource, setVerifySource] = useState('البوابة الأكاديمية الرسمية');
  const [confidenceLevel, setConfidenceLevel] = useState<ConfidenceLevel>('SOURCE_VERIFIED');
  const [rejectReason, setRejectReason] = useState('');

  // Dispute resolution inputs
  const [resolutionType, setResolutionType] = useState<'FULL_SPECIALIST' | 'FULL_REFUND' | 'PARTIAL_SPLIT'>('PARTIAL_SPLIT');
  const [splitPct, setSplitPct] = useState('60');
  const [decisionSummary, setDecisionSummary] = useState('');

  // Category creation inputs
  const [catAr, setCatAr] = useState('');
  const [catEn, setCatEn] = useState('');
  const [catReqDeg, setCatReqDeg] = useState(true);
  const [catNotice, setCatNotice] = useState('');

  const isAdminOrMod =
    currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MODERATOR';

  const loadAdmin = useCallback(async () => {
    if (!isAdminOrMod) return;
    try {
      const res = await apiRequest<AdminOverviewResponse>('/api/admin/overview');
      setData(res);
    } catch (err: unknown) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to load admin overview',
      });
    }
  }, [isAdminOrMod]);

  useEffect(() => {
    void loadAdmin();
  }, [loadAdmin]);

  if (!isAdminOrMod) {
    return (
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-10 space-y-4">
          <Lock className="w-8 h-8 text-blue-700 dark:text-blue-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {lang === 'ar'
              ? 'بوابة الإدارة والرقابة المالية'
              : 'Admin & Financial Governance Console'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {lang === 'ar'
              ? 'يتطلب الوصول صلاحية المدير العام أو المشرف. إذا كانت هذه المرة الأولى لتشغيل المنصة، يمكنك تعيين رمز المدير العام مباشرة من بوابة الدخول.'
              : 'Requires Super Admin or Moderator authorization. On first run, you can claim the Super Admin credential directly from the Admin tab.'}
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 dark:bg-blue-600 rounded-lg"
          >
            {lang === 'ar' ? 'فتح بوابة دخول الإدارة' : 'Open Admin Sign-In'}
          </button>
        </div>
      </section>
    );
  }

  const runAdminAction = async (fn: () => Promise<void>, okMsg: string) => {
    setFeedback(null);
    try {
      await fn();
      setFeedback({ type: 'ok', text: okMsg });
      await loadAdmin();
      onDataChanged();
    } catch (err: unknown) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Admin operation failed',
      });
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {lang === 'ar'
              ? 'لوحة الإدارة والرقابة والسجل المالي'
              : 'Admin Governance & Double-Entry Console'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {currentUser?.name} · {currentUser?.role}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold overflow-x-auto">
          {(
            [
              { id: 'ledger', label: lang === 'ar' ? 'السجل المزدوج والميزان' : 'Double-Entry Ledger' },
              { id: 'verification', label: lang === 'ar' ? 'مراجعة التوثيق' : 'Verification Queue' },
              { id: 'disputes', label: lang === 'ar' ? 'التحكيم والنزاعات' : 'Disputes' },
              { id: 'categories', label: lang === 'ar' ? 'التصنيفات' : 'Categories' },
              { id: 'audit', label: lang === 'ar' ? 'سجل التدقيق' : 'Audit Log' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition-colors ${
                tab === item.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs font-medium ${
            feedback.type === 'ok'
              ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
              : 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {!data ? (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-sm text-slate-500">
          {lang === 'ar' ? 'جارٍ تحميل بيانات الرقابة...' : 'Loading governance data...'}
        </div>
      ) : (
        <>
          {/* TAB 1: DOUBLE-ENTRY LEDGER & TRIAL BALANCE */}
          {tab === 'ledger' && (
            <div className="space-y-6">
              {/* Currency Equilibrium Proof Strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['SAR', 'USD', 'USDT'] as SupportedCurrency[]).map((curr) => {
                  const tot = data.trialBalance.totalsByCurrency[curr];
                  return (
                    <div
                      key={curr}
                      className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-slate-900 dark:text-white">{curr}</span>
                        <span
                          className={`font-semibold ${
                            tot.isBalanced
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-red-700 dark:text-red-400'
                          }`}
                        >
                          {tot.isBalanced
                            ? lang === 'ar'
                              ? 'متوازن (DR = CR)'
                              : 'BALANCED (DR = CR)'
                            : 'IMBALANCE'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        <span>DR: {tot.totalDebits.toFixed(2)}</span>
                        <span>CR: {tot.totalCredits.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Segregated Accounts Table */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpenCheck className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {lang === 'ar'
                      ? 'ميزان المراجعة وفصل الذمم الخمس (Double-Entry Trial Balance)'
                      : 'Segregated Double-Entry Trial Balance'}
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-start border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                        <th className="py-2 pe-4 text-start">Code</th>
                        <th className="py-2 pe-4 text-start">
                          {lang === 'ar' ? 'الحساب المحاسبي' : 'Account'}
                        </th>
                        <th className="py-2 pe-4 text-start">Type</th>
                        <th className="py-2 pe-4 text-start">Currency</th>
                        <th className="py-2 pe-4 text-end">Debit (DR)</th>
                        <th className="py-2 pe-4 text-end">Credit (CR)</th>
                        <th className="py-2 text-end">
                          {lang === 'ar' ? 'الرصيد الصافي' : 'Net Balance'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.trialBalance.rows.map((row) => (
                        <tr
                          key={`${row.accountCode}-${row.currency}`}
                          className="border-b border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300"
                        >
                          <td className="py-2.5 pe-4 font-mono font-semibold">{row.accountCode}</td>
                          <td className="py-2.5 pe-4">{lang === 'ar' ? row.nameAr : row.nameEn}</td>
                          <td className="py-2.5 pe-4 font-mono">{row.accountType}</td>
                          <td className="py-2.5 pe-4 font-mono">{row.currency}</td>
                          <td className="py-2.5 pe-4 text-end font-mono tabular-nums">
                            {row.debitTotal.toFixed(2)}
                          </td>
                          <td className="py-2.5 pe-4 text-end font-mono tabular-nums">
                            {row.creditTotal.toFixed(2)}
                          </td>
                          <td className="py-2.5 text-end font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                            {row.netBalance.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payout Requests Approval */}
              {data.payouts.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'طلبات سحب مستحقات المختصين' : 'Specialist Payout Requests'}
                  </h3>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {data.payouts.map((p) => (
                      <div key={p.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {p.specialistName} — <span className="font-mono">{p.amount} {p.currency}</span>
                          </p>
                          <p className="text-slate-500 font-mono">
                            {p.destinationType} · {p.destinationMasked} · {p.status}
                          </p>
                        </div>
                        {p.status === 'REQUESTED' && currentUser?.role === 'SUPER_ADMIN' && (
                          <button
                            type="button"
                            onClick={() =>
                              void runAdminAction(async () => {
                                await apiRequest(`/api/admin/payouts/${p.id}/approve`, {
                                  method: 'POST',
                                });
                              }, lang === 'ar' ? 'تم اعتماد الصرف وقيده في السجل المزدوج (2030 -> 1010).' : 'Payout approved and posted.')
                            }
                            className="px-3.5 py-2 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                          >
                            {lang === 'ar' ? 'اعتماد الصرف المحاسبي' : 'Approve Payout'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Journal Entries History */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'دفتر القيود اليومية (Journal Entries)' : 'Immutable Journal Entries'}
                </h3>
                <div className="space-y-3">
                  {data.journalEntries.map((je) => (
                    <div
                      key={je.id}
                      className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {je.entryNumber} · {je.referenceType} · {je.currency}
                        </span>
                        <span className="font-mono text-slate-500">{je.createdAt.slice(0, 19)}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">{je.description}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 font-mono text-[11px]">
                        {je.lines.map((line) => (
                          <div
                            key={line.id}
                            className="flex justify-between px-2.5 py-1 bg-stone-50 dark:bg-slate-950 rounded"
                          >
                            <span>
                              {line.direction} · Acct {line.accountCode}
                            </span>
                            <span className="tabular-nums">
                              {(line.amountMicros / 1_000_000).toFixed(2)} {line.currency}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VERIFICATION QUEUE */}
          {tab === 'verification' && (
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'طابور التدقيق والتحقق من الوثائق' : 'Credential Verification Queue'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-stone-50 dark:bg-slate-950">
                <input
                  type="text"
                  value={verifyMethod}
                  onChange={(e) => setVerifyMethod(e.target.value)}
                  placeholder={lang === 'ar' ? 'وسيلة التحقق' : 'Verification Method'}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={verifySource}
                  onChange={(e) => setVerifySource(e.target.value)}
                  placeholder={lang === 'ar' ? 'مصدر التحقق' : 'Verification Source'}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                />
                <select
                  value={confidenceLevel}
                  onChange={(e) => setConfidenceLevel(e.target.value as ConfidenceLevel)}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                >
                  <option value="SOURCE_VERIFIED">SOURCE_VERIFIED</option>
                  <option value="DOCUMENT_VERIFIED">DOCUMENT_VERIFIED</option>
                  <option value="HIGH">HIGH</option>
                </select>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={lang === 'ar' ? 'سبب الرفض/التحديث (عند الرفض)' : 'Rejection/Update reason'}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                />
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {data.documents.map((doc) => {
                  const spec = data.specialists.find((s) => s.id === doc.specialistId);
                  const setStatus = (status: DocumentStatus) =>
                    void runAdminAction(async () => {
                      await apiRequest(`/api/admin/documents/${doc.id}/review`, {
                        method: 'POST',
                        body: JSON.stringify({
                          status,
                          verificationMethod: verifyMethod,
                          verificationSource: verifySource,
                          confidenceLevel,
                          rejectionReason: rejectReason,
                        }),
                      });
                    }, lang === 'ar' ? `تم تحديث حالة المستند إلى ${status}.` : `Document updated to ${status}.`);

                  return (
                    <div
                      key={doc.id}
                      className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {spec?.displayName} — {doc.titleAr}
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">
                          {doc.docType} · {doc.issuingAuthority} · Ref: {doc.referenceNumber} · File:{' '}
                          <span className="font-mono">{doc.fileName}</span>
                        </p>
                        <p className="font-semibold text-blue-700 dark:text-blue-400">
                          {getDocStatusLabel(doc.status, lang)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setStatus('UNDER_REVIEW')}
                          className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md"
                        >
                          {lang === 'ar' ? 'قيد المراجعة' : 'Under Review'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus('VERIFIED')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-white bg-emerald-700 hover:bg-emerald-800 rounded-md font-semibold"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'توثيق' : 'Verify'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus('NEEDS_UPDATE')}
                          className="px-2.5 py-1.5 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-md"
                        >
                          {lang === 'ar' ? 'طلب تحديث' : 'Needs Update'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus('REJECTED')}
                          className="px-2.5 py-1.5 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-md"
                        >
                          {lang === 'ar' ? 'رفض' : 'Reject'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus('REVOKED')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-white bg-red-700 hover:bg-red-800 rounded-md font-semibold"
                        >
                          <ShieldX className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'إبطال تزوير' : 'Revoke'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: DISPUTES ARBITRATION */}
          {tab === 'disputes' && (
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'تحكيم الشكاوى والنزاعات المالية' : 'Disputes & Financial Arbitration'}
                </h3>
              </div>

              {data.disputes.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {lang === 'ar' ? 'لا توجد نزاعات مسجلة حالياً.' : 'No active disputes.'}
                </p>
              ) : (
                <div className="space-y-4">
                  {data.disputes.map((dsp) => {
                    const ord = data.orders.find((o) => o.id === dsp.orderId);
                    return (
                      <div
                        key={dsp.id}
                        className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3 text-xs"
                      >
                        <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                          <span>
                            {ord?.orderNumber} — {dsp.reasonCode}
                          </span>
                          <span>{dsp.status}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">{dsp.statement}</p>
                        {dsp.decisionSummary && (
                          <p className="text-emerald-700 dark:text-emerald-400 font-semibold">
                            {dsp.decisionSummary} ({dsp.specialistSharePct}% / {dsp.clientRefundPct}%)
                          </p>
                        )}

                        {dsp.status !== 'CLOSED' && (
                          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <select
                              value={resolutionType}
                              onChange={(e) =>
                                setResolutionType(
                                  e.target.value as 'FULL_SPECIALIST' | 'FULL_REFUND' | 'PARTIAL_SPLIT',
                                )
                              }
                              className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                            >
                              <option value="FULL_SPECIALIST">تحرير كامل للمختص (100%)</option>
                              <option value="FULL_REFUND">استرداد كامل للعميل (100%)</option>
                              <option value="PARTIAL_SPLIT">تسوية نسبية مزدوجة</option>
                            </select>
                            {resolutionType === 'PARTIAL_SPLIT' && (
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={splitPct}
                                onChange={(e) => setSplitPct(e.target.value)}
                                placeholder="% المختص"
                                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                              />
                            )}
                            <input
                              type="text"
                              value={decisionSummary}
                              onChange={(e) => setDecisionSummary(e.target.value)}
                              placeholder={lang === 'ar' ? 'حيثيات قرار التحكيم' : 'Arbitration decision summary'}
                              className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                void runAdminAction(async () => {
                                  await apiRequest(`/api/admin/disputes/${dsp.id}/resolve`, {
                                    method: 'POST',
                                    body: JSON.stringify({
                                      resolutionType,
                                      specialistSharePct: Number(splitPct),
                                      decisionSummary,
                                    }),
                                  });
                                  setDecisionSummary('');
                                }, lang === 'ar' ? 'تم تنفيذ قرار التحكيم وتسوية القيد المزدوج.' : 'Dispute resolved and posted to ledger.')
                              }
                              className="sm:col-span-3 py-2 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                            >
                              {lang === 'ar' ? 'إصدار القرار وتنفيذ القيد المالي' : 'Issue Decision & Post Ledger'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CATEGORIES MANAGEMENT */}
          {tab === 'categories' && (
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'إدارة التصنيفات وضوابط النزاهة' : 'Service Categories & Integrity Rules'}
              </h3>

              {currentUser?.role === 'SUPER_ADMIN' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void runAdminAction(async () => {
                      await apiRequest('/api/admin/categories', {
                        method: 'POST',
                        body: JSON.stringify({
                          nameAr: catAr,
                          nameEn: catEn,
                          requiresVerifiedDegree: catReqDeg,
                          integrityNoticeAr: catNotice,
                        }),
                      });
                      setCatAr('');
                      setCatEn('');
                      setCatNotice('');
                    }, lang === 'ar' ? 'تمت إضافة التصنيف.' : 'Category added.');
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-stone-50 dark:bg-slate-950"
                >
                  <input
                    type="text"
                    required
                    value={catAr}
                    onChange={(e) => setCatAr(e.target.value)}
                    placeholder={lang === 'ar' ? 'اسم التصنيف بالعربية' : 'Arabic Name'}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    required
                    value={catEn}
                    onChange={(e) => setCatEn(e.target.value)}
                    placeholder={lang === 'ar' ? 'اسم التصنيف بالإنجليزية' : 'English Name'}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    value={catNotice}
                    onChange={(e) => setCatNotice(e.target.value)}
                    placeholder={lang === 'ar' ? 'ضابط النزاهة الخاص بالتصنيف' : 'Integrity Notice'}
                    className="sm:col-span-2 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={catReqDeg}
                      onChange={(e) => setCatReqDeg(e.target.checked)}
                    />
                    <span>{lang === 'ar' ? 'يشترط مؤهلاً علمياً موثقاً' : 'Requires Verified Degree'}</span>
                  </label>
                  <button
                    type="submit"
                    className="py-2 font-semibold text-white bg-blue-700 rounded-lg"
                  >
                    {lang === 'ar' ? 'إضافة تصنيف جديد' : 'Add Category'}
                  </button>
                </form>
              )}

              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {data.categories.map((cat) => (
                  <div key={cat.id} className="py-3 flex justify-between gap-4">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {cat.nameAr} / {cat.nameEn}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">{cat.integrityNoticeAr}</p>
                    </div>
                    <span className="font-mono shrink-0">
                      {cat.requiresVerifiedDegree ? 'DEGREE_REQ' : 'OPEN_VERIFIED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: IMMUTABLE AUDIT LOG */}
          {tab === 'audit' && (
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'سجل التدقيق الأمني والمالي (Append-Only)' : 'Immutable Security & Financial Audit Log'}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="py-2 pe-4 text-start">Time</th>
                      <th className="py-2 pe-4 text-start">Role</th>
                      <th className="py-2 pe-4 text-start">Action</th>
                      <th className="py-2 text-start">Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.auditLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300"
                      >
                        <td className="py-2.5 pe-4 font-mono whitespace-nowrap">
                          {log.createdAt.slice(0, 19)}
                        </td>
                        <td className="py-2.5 pe-4 font-mono">{log.actorRole}</td>
                        <td className="py-2.5 pe-4 font-mono">{log.actionCode}</td>
                        <td className="py-2.5">{log.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
