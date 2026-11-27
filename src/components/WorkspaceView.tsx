import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Lock,
  MessageSquare,
  Send,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import type { Lang } from '../i18n/translations';
import {
  formatMoney,
  FX_FROM_USD,
  getDocStatusLabel,
  getOrderStatusLabel,
  getVerificationStatusLabel,
} from '../i18n/translations';
import type {
  CategoryRecord,
  DisputeRecord,
  DocumentType,
  OrderAgreement,
  OrderDeliverable,
  OrderMessage,
  OrderOffer,
  OrderRecord,
  PaymentIntentRecord,
  PayoutRequest,
  ReviewRecord,
  SpecialistProfile,
  SpecialistService,
  SupportedCurrency,
  VerificationDocument,
} from '../shared/types';
import type { AuthUserSession } from './AuthModal';
import { QrCodeCanvas } from './QrCodeCanvas';

export interface EnrichedOrder extends OrderRecord {
  offers: OrderOffer[];
  agreement: OrderAgreement | null;
  deliverables: OrderDeliverable[];
  messages: OrderMessage[];
  paymentIntents: PaymentIntentRecord[];
  dispute: DisputeRecord | null;
  review: ReviewRecord | null;
}

interface WorkspaceViewProps {
  lang: Lang;
  currency: SupportedCurrency;
  currentUser: AuthUserSession | null;
  categories: CategoryRecord[];
  preselectedSpecialistId?: string | null;
  onOpenAuth: () => void;
  onDataChanged: () => void;
}

export function WorkspaceView({
  lang,
  currency,
  currentUser,
  categories,
  preselectedSpecialistId,
  onOpenAuth,
  onDataChanged,
}: WorkspaceViewProps) {
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Specialist data
  const [specProfile, setSpecProfile] = useState<SpecialistProfile | null>(null);
  const [specDocs, setSpecDocs] = useState<VerificationDocument[]>([]);
  const [specServices, setSpecServices] = useState<SpecialistService[]>([]);
  const [specPayouts, setSpecPayouts] = useState<PayoutRequest[]>([]);
  const [specBalances, setSpecBalances] = useState<Record<SupportedCurrency, number>>({
    SAR: 0,
    USD: 0,
    USDT: 0,
  });

  // Client Create Request form
  const [reqTitle, setReqTitle] = useState('');
  const [reqCategory, setReqCategory] = useState(categories[0]?.id || 'cat-stats');
  const [reqDescription, setReqDescription] = useState('');
  const [reqDeliverables, setReqDeliverables] = useState('');
  const [reqBudgetMin, setReqBudgetMin] = useState('400');
  const [reqBudgetMax, setReqBudgetMax] = useState('900');
  const [reqIntegrity, setReqIntegrity] = useState(false);

  // Specialist Upload Doc form
  const [docType, setDocType] = useState<DocumentType>('DEGREE');
  const [docTitle, setDocTitle] = useState('');
  const [docIssuer, setDocIssuer] = useState('');
  const [docRef, setDocRef] = useState('');
  const [docFile, setDocFile] = useState('');

  // Specialist Submit Offer form
  const [offerAmount, setOfferAmount] = useState('650');
  const [offerDays, setOfferDays] = useState('4');
  const [offerProposal, setOfferProposal] = useState('');

  // Order Room interactions
  const [chatText, setChatText] = useState('');
  const [payProvider, setPayProvider] = useState<'PSP_CARD_MADA' | 'PSP_BANK_TRANSFER' | 'USDT_TRC20'>('PSP_CARD_MADA');
  const [payCurrency, setPayCurrency] = useState<SupportedCurrency>('SAR');
  const [usdtTxHash, setUsdtTxHash] = useState('');
  const [usdtConfirmations, setUsdtConfirmations] = useState('22');
  const [delNotes, setDelNotes] = useState('');
  const [delFile, setDelFile] = useState('');
  const [revReason, setRevReason] = useState('');
  const [disputeReason, setDisputeReason] = useState('DELIVERABLE_MISMATCH');
  const [disputeStatement, setDisputeStatement] = useState('');
  const [reviewScore, setReviewScore] = useState('5');
  const [reviewComment, setReviewComment] = useState('');

  // Specialist Payout form
  const [payoutAmt, setPayoutAmt] = useState('');
  const [payoutCurr, setPayoutCurr] = useState<SupportedCurrency>('SAR');
  const [payoutDest, setPayoutDest] = useState('');

  const loadWorkspace = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const ordRes = await apiRequest<{ orders: EnrichedOrder[] }>('/api/orders');
      setOrders(ordRes.orders);
      if (ordRes.orders.length > 0 && !selectedOrderId) {
        setSelectedOrderId(ordRes.orders[0].id);
      }
      if (currentUser.role === 'SPECIALIST') {
        const sp = await apiRequest<{
          specialist: SpecialistProfile;
          documents: VerificationDocument[];
          services: SpecialistService[];
          payouts: PayoutRequest[];
          availableBalances: Record<SupportedCurrency, number>;
        }>('/api/specialist/me');
        setSpecProfile(sp.specialist);
        setSpecDocs(sp.documents);
        setSpecServices(sp.services);
        setSpecPayouts(sp.payouts);
        setSpecBalances(sp.availableBalances);
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to load workspace',
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser, selectedOrderId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  if (!currentUser) {
    return (
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-10 space-y-4">
          <Lock className="w-8 h-8 text-blue-700 dark:text-blue-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {lang === 'ar' ? 'مساحة العمل محمية' : 'Protected Workspace'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {lang === 'ar'
              ? 'سجل الدخول أو أنشئ حساب عميل أو مختص لنشر الطلبات، رفع وثائق التوثيق، توقيع الاتفاقيات، وإدارة المدفوعات.'
              : 'Sign in or register as a Client or Specialist to post requests, submit verification credentials, lock agreements, and manage payments.'}
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
          >
            {lang === 'ar' ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Register'}
          </button>
        </div>
      </section>
    );
  }

  const activeOrder = orders.find((o) => o.id === selectedOrderId) || orders[0] || null;
  const selectedCatObj = categories.find((c) => c.id === reqCategory);

  const handleAction = async (fn: () => Promise<void>, okMessage: string) => {
    setFeedback(null);
    try {
      await fn();
      setFeedback({ type: 'ok', text: okMessage });
      await loadWorkspace();
      onDataChanged();
    } catch (err: unknown) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Action failed',
      });
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {currentUser.role === 'SPECIALIST'
              ? lang === 'ar'
                ? 'مساحة عمل المختص والتوثيق'
                : 'Specialist Workspace & Verification'
              : lang === 'ar'
                ? 'مساحة عمل العميل والطلبات'
                : 'Client Workspace & Orders'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {currentUser.name} · {currentUser.role}
          </p>
        </div>
        {loading && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {lang === 'ar' ? 'جارٍ التحديث...' : 'Syncing...'}
          </span>
        )}
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

      {/* SPECIALIST VERIFICATION & EARNINGS PANEL */}
      {currentUser.role === 'SPECIALIST' && specProfile && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Mandatory Verification Center */}
          <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'نظام التوثيق الإلزامي' : 'Mandatory Verification Gate'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {getVerificationStatusLabel(specProfile.verificationStatus, lang)} ·{' '}
                  <span className="font-mono">{specProfile.credentialRefCode}</span>
                </p>
              </div>
              <QrCodeCanvas
                value={`${window.location.origin}/?verify=${specProfile.credentialRefCode}`}
                size={68}
                alt={specProfile.credentialRefCode}
              />
            </div>

            {specProfile.verificationStatus !== 'VERIFIED' && (
              <div className="p-3.5 border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {lang === 'ar'
                    ? 'حسابك قيد التوثيق: لا يُسمح بتقديم العروض أو نشر الخدمات حتى يعتمد المشرف إثبات الهوية ومؤهلاً واحداً على الأقل.'
                    : 'Your account is pending verification: submitting offers and publishing services are blocked until a Moderator verifies your ID and at least one qualification.'}
                </span>
              </div>
            )}

            {/* Existing Docs Table */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'ar' ? 'المستندات المرفوعة وحالتها:' : 'Submitted Documents:'}
              </p>
              {specDocs.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'ar'
                    ? 'لم ترفع أي مستندات بعد. ارفع الهوية والشهادة العلمية أدناه.'
                    : 'No documents uploaded yet. Submit your ID and degree below.'}
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {specDocs.map((d) => (
                    <div key={d.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {d.titleAr} ({d.docType})
                        </p>
                        <p className="text-slate-500 dark:text-slate-400">
                          {d.issuingAuthority} · {d.referenceNumber}
                        </p>
                        {d.rejectionReason && (
                          <p className="text-red-600 dark:text-red-400 mt-0.5">{d.rejectionReason}</p>
                        )}
                      </div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                        {getDocStatusLabel(d.status, lang)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upload New Credential Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAction(async () => {
                  await apiRequest('/api/specialist/documents', {
                    method: 'POST',
                    body: JSON.stringify({
                      docType,
                      titleAr: docTitle,
                      issuingAuthority: docIssuer,
                      referenceNumber: docRef,
                      fileName: docFile || 'credential_scan.pdf',
                    }),
                  });
                  setDocTitle('');
                  setDocIssuer('');
                  setDocRef('');
                  setDocFile('');
                }, lang === 'ar' ? 'تم رفع المستند بنجاح وهو بانتظار المراجعة الإدارية.' : 'Document uploaded and queued for review.');
              }}
              className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"
            >
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
              >
                <option value="NATIONAL_ID">{lang === 'ar' ? 'إثبات الهوية' : 'National ID'}</option>
                <option value="DEGREE">{lang === 'ar' ? 'شهادة جامعية' : 'University Degree'}</option>
                <option value="PRO_CERT">{lang === 'ar' ? 'شهادة مهنية' : 'Professional Cert'}</option>
                <option value="EXPERIENCE">{lang === 'ar' ? 'خبرة عملية' : 'Experience Letter'}</option>
              </select>
              <input
                type="text"
                required
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder={lang === 'ar' ? 'عنوان المؤهل أو الوثيقة' : 'Credential Title'}
                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
              />
              <input
                type="text"
                required
                value={docIssuer}
                onChange={(e) => setDocIssuer(e.target.value)}
                placeholder={lang === 'ar' ? 'الجهة المانحة / الجامعة' : 'Issuing Authority'}
                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
              />
              <input
                type="text"
                value={docRef}
                onChange={(e) => setDocRef(e.target.value)}
                placeholder={lang === 'ar' ? 'رقم الشهادة / الترخيص للتحقق' : 'Verification Ref / License No.'}
                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
              />
              <input
                type="text"
                required
                value={docFile}
                onChange={(e) => setDocFile(e.target.value)}
                placeholder={lang === 'ar' ? 'اسم الملف المرفق (مثل degree.pdf)' : 'File name (e.g., degree.pdf)'}
                className="sm:col-span-2 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
              />
              <button
                type="submit"
                className="sm:col-span-2 py-2 font-semibold text-white bg-slate-900 dark:bg-blue-600 rounded-lg hover:bg-slate-800"
              >
                {lang === 'ar' ? 'رفع مستند للتدقيق الإداري' : 'Upload Credential for Verification'}
              </button>
            </form>
          </div>

          {/* Specialist Financial Dues & Payout Request */}
          <div className="lg:col-span-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'مستحقاتي القابلة للتسوية (حساب 2030)' : 'Payable Dues (Account 2030)'}
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {(['SAR', 'USD', 'USDT'] as SupportedCurrency[]).map((c) => (
                <div
                  key={c}
                  className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-stone-50 dark:bg-slate-950"
                >
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{c}</p>
                  <p className="mt-1 text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {specBalances[c].toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAction(async () => {
                  await apiRequest('/api/specialist/payouts', {
                    method: 'POST',
                    body: JSON.stringify({
                      amount: Number(payoutAmt),
                      currency: payoutCurr,
                      destinationType: payoutCurr === 'USDT' ? 'USDT_TRC20_WALLET' : 'BANK_IBAN',
                      destinationValue: payoutDest,
                    }),
                  });
                  setPayoutAmt('');
                  setPayoutDest('');
                }, lang === 'ar' ? 'تم تسجيل طلب التسوية وبانتظار موافقة الإدارة المالية.' : 'Payout request submitted for admin approval.');
              }}
              className="space-y-3 text-xs pt-3 border-t border-slate-200 dark:border-slate-800"
            >
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payoutAmt}
                  onChange={(e) => setPayoutAmt(e.target.value)}
                  placeholder={lang === 'ar' ? 'المبلغ' : 'Amount'}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                />
                <select
                  value={payoutCurr}
                  onChange={(e) => setPayoutCurr(e.target.value as SupportedCurrency)}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                >
                  <option value="SAR">SAR</option>
                  <option value="USD">USD</option>
                  <option value="USDT">USDT</option>
                </select>
              </div>
              <input
                type="text"
                required
                value={payoutDest}
                onChange={(e) => setPayoutDest(e.target.value)}
                placeholder={
                  payoutCurr === 'USDT'
                    ? lang === 'ar'
                      ? 'عنوان محفظة TRC-20'
                      : 'TRC-20 Wallet Address'
                    : lang === 'ar'
                      ? 'رقم الآيبان (IBAN)'
                      : 'Bank IBAN'
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
              />
              <button
                type="submit"
                className="w-full py-2 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
              >
                {lang === 'ar' ? 'طلب سحب مستحقات' : 'Request Payout'}
              </button>
            </form>

            {specPayouts.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                {specPayouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between font-mono">
                    <span>
                      {p.amount} {p.currency} ({p.destinationMasked})
                    </span>
                    <span className="font-semibold">{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CLIENT NEW ORDER FORM */}
      {currentUser.role === 'CLIENT' && (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {lang === 'ar' ? 'إنشاء طلب خدمة جديد' : 'Create New Service Request'}
          </h3>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleAction(async () => {
                await apiRequest('/api/orders', {
                  method: 'POST',
                  body: JSON.stringify({
                    categoryId: reqCategory,
                    targetSpecialistId: preselectedSpecialistId || undefined,
                    title: reqTitle,
                    description: reqDescription,
                    deliverablesSpec: reqDeliverables,
                    displayCurrency: currency,
                    budgetMin: Number(reqBudgetMin),
                    budgetMax: Number(reqBudgetMax),
                    academicIntegrityAccepted: reqIntegrity,
                  }),
                });
                setReqTitle('');
                setReqDescription('');
                setReqDeliverables('');
              }, lang === 'ar' ? 'تم نشر الطلب بنجاح.' : 'Order published successfully.');
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"
          >
            <input
              type="text"
              required
              value={reqTitle}
              onChange={(e) => setReqTitle(e.target.value)}
              placeholder={lang === 'ar' ? 'عنوان الطلب بوضوح' : 'Clear Request Title'}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
            />
            <select
              value={reqCategory}
              onChange={(e) => setReqCategory(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {lang === 'ar' ? c.nameAr : c.nameEn}
                </option>
              ))}
            </select>
            <textarea
              required
              rows={2}
              value={reqDescription}
              onChange={(e) => setReqDescription(e.target.value)}
              placeholder={lang === 'ar' ? 'وصف تفصيلي للمطلوب والمنهجية' : 'Detailed scope and methodology'}
              className="md:col-span-2 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
            />
            <input
              type="text"
              required
              value={reqDeliverables}
              onChange={(e) => setReqDeliverables(e.target.value)}
              placeholder={lang === 'ar' ? 'المخرجات النهائية المتوقعة (PDF, SPSS, Code...)' : 'Expected final deliverables'}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                required
                value={reqBudgetMin}
                onChange={(e) => setReqBudgetMin(e.target.value)}
                placeholder={`${lang === 'ar' ? 'أقل ميزانية' : 'Min'} (${currency})`}
                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
              />
              <input
                type="number"
                required
                value={reqBudgetMax}
                onChange={(e) => setReqBudgetMax(e.target.value)}
                placeholder={`${lang === 'ar' ? 'أعلى ميزانية' : 'Max'} (${currency})`}
                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
              />
            </div>

            {selectedCatObj && (
              <p className="md:col-span-2 text-xs text-amber-800 dark:text-amber-300">
                {lang === 'ar' ? selectedCatObj.integrityNoticeAr : selectedCatObj.integrityNoticeEn}
              </p>
            )}

            <label className="md:col-span-2 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={reqIntegrity}
                onChange={(e) => setReqIntegrity(e.target.checked)}
                required
              />
              <span>
                {lang === 'ar'
                  ? 'أقر بالتزام هذا الطلب بسياسة النزاهة الأكاديمية والمهنية وعدم استخدامه في الغش أو الانتحال.'
                  : 'I affirm this request complies with the Academic & Professional Integrity Policy.'}
              </span>
            </label>

            <button
              type="submit"
              className="md:col-span-2 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
            >
              {lang === 'ar' ? 'نشر الطلب واستقبال عروض المختصين الموثقين' : 'Publish Request'}
            </button>
          </form>
        </div>
      )}

      {/* ORDERS LIST + INTERACTIVE ORDER ROOM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {lang === 'ar' ? `الطلبات (${orders.length})` : `Orders (${orders.length})`}
          </h3>
          {orders.length === 0 ? (
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 text-xs text-slate-500">
              {lang === 'ar' ? 'لا توجد طلبات مرتبطة بحسابك حالياً.' : 'No orders found.'}
            </div>
          ) : (
            orders.map((ord) => (
              <button
                key={ord.id}
                type="button"
                onClick={() => setSelectedOrderId(ord.id)}
                className={`w-full text-start border rounded-xl p-4 transition-colors space-y-1.5 ${
                  activeOrder?.id === ord.id
                    ? 'border-blue-700 bg-blue-50/40 dark:bg-blue-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span>{ord.orderNumber}</span>
                  <span className="font-sans font-semibold text-blue-700 dark:text-blue-400">
                    {getOrderStatusLabel(ord.status, lang)}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                  {ord.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {ord.budgetMin}–{ord.budgetMax} {ord.displayCurrency} · {ord.offers.length}{' '}
                  {lang === 'ar' ? 'عروض' : 'offers'}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Right Order Room */}
        <div className="lg:col-span-8">
          {activeOrder ? (
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {activeOrder.orderNumber} · {getOrderStatusLabel(activeOrder.status, lang)}
                  </p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {activeOrder.title}
                  </h3>
                </div>
                {activeOrder.assignedSpecialistName && (
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'ar' ? 'المختص المعيّن: ' : 'Assigned: '}
                    {activeOrder.assignedSpecialistName}
                  </p>
                )}
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeOrder.description}
              </p>

              {/* OFFERS SECTION */}
              {(activeOrder.status === 'OPEN_FOR_OFFERS' ||
                activeOrder.status === 'OFFERS_RECEIVED') && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'عروض الأسعار المقدمة' : 'Submitted Offers'}
                  </h4>

                  {activeOrder.offers.length > 0 && (
                    <div className="space-y-3">
                      {activeOrder.offers.map((off) => (
                        <div
                          key={off.id}
                          className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {off.specialistName}{' '}
                              <span className="font-mono text-xs text-slate-500">
                                ({off.specialistRefCode})
                              </span>
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              {off.proposalText}
                            </p>
                            <p className="text-xs font-mono text-slate-500">
                              {formatMoney(off.amount, off.currency)} · {off.deliveryDays}d ·{' '}
                              {off.revisionsIncluded} {lang === 'ar' ? 'تعديلات' : 'revisions'}
                            </p>
                          </div>
                          {currentUser.role === 'CLIENT' &&
                            activeOrder.clientId === currentUser.id && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleAction(async () => {
                                    await apiRequest(`/api/orders/${activeOrder.id}/select-offer`, {
                                      method: 'POST',
                                      body: JSON.stringify({ offerId: off.id }),
                                    });
                                  }, lang === 'ar' ? 'تم اختيار العرض وتوثيق الاتفاقية الرقمية.' : 'Offer accepted & agreement locked.')
                                }
                                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap"
                              >
                                {lang === 'ar' ? 'اعتماد العرض والاتفاقية' : 'Accept & Lock Agreement'}
                              </button>
                            )}
                        </div>
                      ))}
                    </div>
                  )}

                  {currentUser.role === 'SPECIALIST' && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleAction(async () => {
                          await apiRequest(`/api/orders/${activeOrder.id}/offers`, {
                            method: 'POST',
                            body: JSON.stringify({
                              amount: Number(offerAmount),
                              currency: activeOrder.displayCurrency,
                              deliveryDays: Number(offerDays),
                              revisionsIncluded: 2,
                              proposalText: offerProposal,
                            }),
                          });
                          setOfferProposal('');
                        }, lang === 'ar' ? 'تم إرسال عرض السعر بنجاح.' : 'Offer submitted.');
                      }}
                      className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3 text-xs"
                    >
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {lang === 'ar' ? 'تقديم عرض سعر (متاح للمختصين الموثقين فقط)' : 'Submit Offer'}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          required
                          value={offerAmount}
                          onChange={(e) => setOfferAmount(e.target.value)}
                          placeholder={`${lang === 'ar' ? 'السعر' : 'Amount'} (${activeOrder.displayCurrency})`}
                          className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                        />
                        <input
                          type="number"
                          required
                          value={offerDays}
                          onChange={(e) => setOfferDays(e.target.value)}
                          placeholder={lang === 'ar' ? 'مدة التنفيذ (أيام)' : 'Delivery days'}
                          className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                        />
                      </div>
                      <textarea
                        required
                        rows={2}
                        value={offerProposal}
                        onChange={(e) => setOfferProposal(e.target.value)}
                        placeholder={lang === 'ar' ? 'خطة التنفيذ والمنهجية' : 'Execution plan'}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 font-semibold text-white bg-slate-900 dark:bg-blue-600 rounded-lg"
                      >
                        {lang === 'ar' ? 'إرسال العرض' : 'Submit Offer'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* AGREEMENT SNAPSHOT & PAYMENT FUNDING */}
              {activeOrder.agreement && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-stone-50 dark:bg-slate-950 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
                      <span className="inline-flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                        {lang === 'ar' ? 'وثيقة الاتفاقية الرقمية المثبتة' : 'Immutable Digital Agreement'}
                      </span>
                      <span className="font-mono">{activeOrder.agreement.agreementHash}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      {activeOrder.agreement.scopeSummary}
                    </p>
                    <p className="font-mono text-slate-700 dark:text-slate-200">
                      {formatMoney(activeOrder.agreement.agreedAmount, activeOrder.agreement.agreedCurrency)} · FX Lock: {activeOrder.agreement.lockedFxRate}
                    </p>
                  </div>

                  {activeOrder.status === 'AWAITING_PAYMENT' &&
                    currentUser.role === 'CLIENT' &&
                    activeOrder.clientId === currentUser.id && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleAction(async () => {
                            await apiRequest(`/api/orders/${activeOrder.id}/fund`, {
                              method: 'POST',
                              body: JSON.stringify({
                                provider: payProvider,
                                paymentCurrency: payCurrency,
                                txHash: payProvider === 'USDT_TRC20' ? usdtTxHash : undefined,
                                confirmationsCount:
                                  payProvider === 'USDT_TRC20' ? Number(usdtConfirmations) : undefined,
                              }),
                            });
                          }, lang === 'ar' ? 'تم تأكيد الدفع وقيد حجز المبلغ في السجل المزدوج (1010 -> 2020).' : 'Payment confirmed and held in double-entry ledger.');
                        }}
                        className="p-4 border border-blue-200 dark:border-blue-900 rounded-lg space-y-3 text-xs"
                      >
                        <p className="font-bold text-slate-900 dark:text-white">
                          {lang === 'ar' ? 'تمويل الطلب وحجز المبلغ عبر مزود الدفع' : 'Fund Order via Payment Provider'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            value={payProvider}
                            onChange={(e) => {
                              const next = e.target.value as 'PSP_CARD_MADA' | 'PSP_BANK_TRANSFER' | 'USDT_TRC20';
                              setPayProvider(next);
                              if (next === 'USDT_TRC20') setPayCurrency('USDT');
                            }}
                            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                          >
                            <option value="PSP_CARD_MADA">بطاقة مدى / ائتمان (PSP مرخص)</option>
                            <option value="PSP_BANK_TRANSFER">حوالة بنكية مرخصة (SAR / USD)</option>
                            <option value="USDT_TRC20">USDT (شبكة TRON TRC-20 فقط)</option>
                          </select>
                          <select
                            value={payCurrency}
                            disabled={payProvider === 'USDT_TRC20'}
                            onChange={(e) => setPayCurrency(e.target.value as SupportedCurrency)}
                            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                          >
                            <option value="SAR">SAR</option>
                            <option value="USD">USD</option>
                            <option value="USDT">USDT</option>
                          </select>
                        </div>

                        <p className="font-mono text-slate-600 dark:text-slate-300">
                          {lang === 'ar' ? 'المبلغ المطلوب بعملة التسوية: ' : 'Settlement Amount: '}
                          {(
                            (activeOrder.agreement.agreedAmount /
                              (FX_FROM_USD[activeOrder.agreement.agreedCurrency] || 1)) *
                            (FX_FROM_USD[payCurrency] || 1)
                          ).toFixed(2)}{' '}
                          {payCurrency}
                        </p>

                        {payProvider === 'USDT_TRC20' && (
                          <div className="space-y-2 p-3 border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/20 rounded-lg">
                            <p className="text-amber-900 dark:text-amber-200">
                              {lang === 'ar'
                                ? 'تحذير الشبكة: يُقبل الإيداع عبر شبكة TRON (TRC-20) فقط ويتطلب 20 تأكيد كتلة على الأقل. الإرسال لشبكة خاطئة قد يؤدي لفقدان الأصول.'
                                : 'Network Warning: Only TRON (TRC-20) is supported; minimum 20 block confirmations required.'}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                required
                                value={usdtTxHash}
                                onChange={(e) => setUsdtTxHash(e.target.value)}
                                placeholder="TX Hash (12+ chars)"
                                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 font-mono"
                              />
                              <input
                                type="number"
                                required
                                value={usdtConfirmations}
                                onChange={(e) => setUsdtConfirmations(e.target.value)}
                                placeholder="Confirmations (>= 20)"
                                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 font-mono"
                              />
                            </div>
                          </div>
                        )}

                        <button
                          type="submit"
                          className="px-4 py-2 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                        >
                          {lang === 'ar' ? 'تأكيد الدفع وحجز المبلغ' : 'Confirm Payment & Hold Funds'}
                        </button>
                      </form>
                    )}
                </div>
              )}

              {/* DELIVERABLES & COMPLETION WORKFLOW */}
              {['FUNDED_HELD', 'IN_PROGRESS', 'REVISION_REQUESTED', 'PENDING_CLIENT_REVIEW', 'COMPLETED'].includes(
                activeOrder.status,
              ) && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'التسليمات والمراجعة' : 'Deliverables & Review'}
                  </h4>

                  {activeOrder.deliverables.map((del) => (
                    <div
                      key={del.id}
                      className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1"
                    >
                      <div className="flex justify-between font-semibold">
                        <span>
                          v{del.versionNo} — {del.attachmentName}
                        </span>
                        <span>{del.status}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">{del.notes}</p>
                    </div>
                  ))}

                  {currentUser.role === 'SPECIALIST' &&
                    activeOrder.status === 'FUNDED_HELD' && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleAction(async () => {
                            await apiRequest(`/api/orders/${activeOrder.id}/start`, {
                              method: 'POST',
                            });
                          }, lang === 'ar' ? 'تم بدء التنفيذ.' : 'Execution started.')
                        }
                        className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 rounded-lg"
                      >
                        {lang === 'ar' ? 'بدء التنفيذ الآن' : 'Mark In Progress'}
                      </button>
                    )}

                  {currentUser.role === 'SPECIALIST' &&
                    ['FUNDED_HELD', 'IN_PROGRESS', 'REVISION_REQUESTED'].includes(
                      activeOrder.status,
                    ) && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleAction(async () => {
                            await apiRequest(`/api/orders/${activeOrder.id}/deliver`, {
                              method: 'POST',
                              body: JSON.stringify({
                                notes: delNotes,
                                attachmentName: delFile || 'final_deliverable.pdf',
                              }),
                            });
                            setDelNotes('');
                            setDelFile('');
                          }, lang === 'ar' ? 'تم رفع التسليم الرسمي وبدء مهلة مراجعة العميل.' : 'Deliverable submitted.');
                        }}
                        className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 text-xs"
                      >
                        <input
                          type="text"
                          required
                          value={delFile}
                          onChange={(e) => setDelFile(e.target.value)}
                          placeholder={lang === 'ar' ? 'اسم ملف التسليم النهائي' : 'Deliverable filename'}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                        />
                        <textarea
                          required
                          rows={2}
                          value={delNotes}
                          onChange={(e) => setDelNotes(e.target.value)}
                          placeholder={lang === 'ar' ? 'ملاحظات التسليم الرسمي' : 'Delivery notes'}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                        >
                          {lang === 'ar' ? 'رفع التسليم الرسمي' : 'Submit Official Delivery'}
                        </button>
                      </form>
                    )}

                  {currentUser.role === 'CLIENT' &&
                    activeOrder.status === 'PENDING_CLIENT_REVIEW' && (
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            void handleAction(async () => {
                              await apiRequest(`/api/orders/${activeOrder.id}/complete`, {
                                method: 'POST',
                              });
                            }, lang === 'ar' ? 'تم اعتماد الإنجاز وتحرير المستحقات (2020 -> 2030 + 4010).' : 'Completion confirmed and funds released.')
                          }
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{lang === 'ar' ? 'اعتماد الإنجاز وتحرير المستحقات' : 'Confirm & Release Funds'}</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={revReason}
                            onChange={(e) => setRevReason(e.target.value)}
                            placeholder={lang === 'ar' ? 'ملاحظة التعديل' : 'Revision note'}
                            className="px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              void handleAction(async () => {
                                await apiRequest(`/api/orders/${activeOrder.id}/request-revision`, {
                                  method: 'POST',
                                  body: JSON.stringify({ reason: revReason }),
                                });
                                setRevReason('');
                              }, lang === 'ar' ? 'تم إرسال طلب التعديل.' : 'Revision requested.')
                            }
                            className="px-3 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg"
                          >
                            {lang === 'ar' ? 'طلب تعديل' : 'Request Revision'}
                          </button>
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* DISPUTE OPENING (Freezes Funds) */}
              {['FUNDED_HELD', 'IN_PROGRESS', 'PENDING_CLIENT_REVIEW', 'REVISION_REQUESTED'].includes(
                activeOrder.status,
              ) && (
                <details className="pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <summary className="cursor-pointer font-semibold text-red-700 dark:text-red-400">
                    {lang === 'ar' ? 'فتح شكوى / نزاع (يجمّد تحرير الأموال فوراً)' : 'Open Dispute (Freezes Funds)'}
                  </summary>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleAction(async () => {
                        await apiRequest(`/api/orders/${activeOrder.id}/dispute`, {
                          method: 'POST',
                          body: JSON.stringify({
                            reasonCode: disputeReason,
                            statement: disputeStatement,
                          }),
                        });
                        setDisputeStatement('');
                      }, lang === 'ar' ? 'تم فتح النزاع وتجميد المبلغ المحجوز لإحالته للتحكيم.' : 'Dispute opened and funds frozen.');
                    }}
                    className="mt-3 space-y-2"
                  >
                    <select
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                    >
                      <option value="DELIVERABLE_MISMATCH">عدم مطابقة المخرجات للاتفاقية</option>
                      <option value="MISSED_DEADLINE">تجاوز الموعد النهائي دون تسليم</option>
                      <option value="INTEGRITY_CONCERN">مخالفة ضوابط النزاهة أو السرية</option>
                    </select>
                    <textarea
                      required
                      rows={2}
                      value={disputeStatement}
                      onChange={(e) => setDisputeStatement(e.target.value)}
                      placeholder={lang === 'ar' ? 'اشرح سبب النزاع والأدلة الموثقة' : 'Dispute statement'}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg"
                    >
                      {lang === 'ar' ? 'تثبيت النزاع وتجميد الأموال' : 'Submit Dispute'}
                    </button>
                  </form>
                </details>
              )}

              {/* COMPLETED REVIEW */}
              {activeOrder.status === 'COMPLETED' &&
                currentUser.role === 'CLIENT' &&
                !activeOrder.review && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleAction(async () => {
                        await apiRequest(`/api/orders/${activeOrder.id}/review`, {
                          method: 'POST',
                          body: JSON.stringify({
                            ratingOverall: Number(reviewScore),
                            comment: reviewComment,
                          }),
                        });
                        setReviewComment('');
                      }, lang === 'ar' ? 'تم نشر التقييم الموثق.' : 'Review posted.');
                    }}
                    className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                  >
                    <p className="font-bold text-slate-900 dark:text-white">
                      {lang === 'ar' ? 'تقييم المختص بعد الإنجاز' : 'Rate Completed Service'}
                    </p>
                    <div className="flex gap-2">
                      <select
                        value={reviewScore}
                        onChange={(e) => setReviewScore(e.target.value)}
                        className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                      >
                        <option value="5">5 / 5</option>
                        <option value="4">4 / 5</option>
                        <option value="3">3 / 5</option>
                        <option value="2">2 / 5</option>
                        <option value="1">1 / 5</option>
                      </select>
                      <input
                        type="text"
                        required
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder={lang === 'ar' ? 'تعليق موضوعي حول الجودة والالتزام' : 'Objective review comment'}
                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 font-semibold text-white bg-blue-700 rounded-lg"
                      >
                        {lang === 'ar' ? 'إرسال' : 'Post'}
                      </button>
                    </div>
                  </form>
                )}

              {/* ORDER CHAT WITH ANTI-LEAKAGE FILTER */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <MessageSquare className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                    {lang === 'ar' ? 'المحادثة الموثقة للطلب' : 'Order Conversation'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {lang === 'ar'
                      ? 'حماية منع التسرب: تُحجب بيانات التواصل قبل التمويل'
                      : 'Anti-leakage: External contacts masked before funding'}
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-stone-50 dark:bg-slate-950">
                  {activeOrder.messages.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      {lang === 'ar' ? 'لا توجد رسائل بعد.' : 'No messages yet.'}
                    </p>
                  ) : (
                    activeOrder.messages.map((m) => (
                      <div key={m.id} className="text-xs space-y-0.5">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {m.senderName}
                          </span>
                          <span>·</span>
                          <span className="font-mono text-[11px]">{m.createdAt.slice(11, 16)}</span>
                          {m.hasBlockedPii && (
                            <span className="text-amber-700 dark:text-amber-400">
                              [{lang === 'ar' ? 'تم حجب تواصل خارجي' : 'PII Masked'}]
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">{m.body}</p>
                      </div>
                    ))
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!chatText.trim()) return;
                    void handleAction(async () => {
                      await apiRequest(`/api/orders/${activeOrder.id}/messages`, {
                        method: 'POST',
                        body: JSON.stringify({ body: chatText }),
                      });
                      setChatText('');
                    }, lang === 'ar' ? 'تم إرسال الرسالة.' : 'Message sent.');
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    placeholder={
                      lang === 'ar'
                        ? 'اكتب رسالتك هنا (تُحجب الأرقام والروابط قبل تمويل الطلب)...'
                        : 'Write a message (external contacts masked prior to funding)...'
                    }
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'إرسال' : 'Send'}</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-10 text-center text-sm text-slate-500">
              {lang === 'ar'
                ? 'اختر طلباً من القائمة لعرض تفاصيله وإدارته.'
                : 'Select an order from the list to manage it.'}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
