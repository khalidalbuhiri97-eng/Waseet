import type {
  DocumentStatus,
  OrderStatus,
  SpecialistVerificationStatus,
  SupportedCurrency,
} from '../shared/types';

export type Lang = 'ar' | 'en';

export const FX_FROM_USD: Record<SupportedCurrency, number> = {
  USD: 1,
  SAR: 3.75,
  USDT: 1,
};

export function convertCurrency(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency,
): number {
  if (from === to) return amount;
  const inUsd = amount / (FX_FROM_USD[from] || 1);
  return Number((inUsd * (FX_FROM_USD[to] || 1)).toFixed(2));
}

export function formatMoney(amount: number, currency: SupportedCurrency): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}

export function getOrderStatusLabel(status: OrderStatus, lang: Lang): string {
  const map: Record<OrderStatus, { ar: string; en: string }> = {
    NEW: { ar: 'جديد', en: 'New' },
    OPEN_FOR_OFFERS: { ar: 'مفتوح للعروض', en: 'Open for Offers' },
    OFFERS_RECEIVED: { ar: 'عروض مستلمة', en: 'Offers Received' },
    SPECIALIST_SELECTED: { ar: 'تم اختيار مختص', en: 'Specialist Selected' },
    AWAITING_PAYMENT: { ar: 'بانتظار الدفع', en: 'Awaiting Payment' },
    FUNDED_HELD: { ar: 'ممول ومحجوز المبلغ', en: 'Funded & Held' },
    IN_PROGRESS: { ar: 'قيد التنفيذ', en: 'In Progress' },
    DELIVERED: { ar: 'تم التسليم', en: 'Delivered' },
    PENDING_CLIENT_REVIEW: { ar: 'بانتظار مراجعة العميل', en: 'Pending Client Review' },
    REVISION_REQUESTED: { ar: 'طلب تعديل', en: 'Revision Requested' },
    COMPLETED: { ar: 'مكتمل', en: 'Completed' },
    CANCELLED: { ar: 'ملغي', en: 'Cancelled' },
    DISPUTED: { ar: 'متنازع عليه (الأموال مجمدة)', en: 'Disputed (Funds Frozen)' },
    REFUNDED: { ar: 'مسترد', en: 'Refunded' },
  };
  return map[status][lang];
}

export function getDocStatusLabel(status: DocumentStatus, lang: Lang): string {
  const map: Record<DocumentStatus, { ar: string; en: string }> = {
    UPLOADED: { ar: 'مستند مرفوع', en: 'Uploaded' },
    UNDER_REVIEW: { ar: 'مستند قيد المراجعة', en: 'Under Review' },
    VERIFIED: { ar: 'مستند تم التحقق منه', en: 'Verified' },
    REJECTED: { ar: 'مستند مرفوض', en: 'Rejected' },
    NEEDS_UPDATE: { ar: 'مستند يحتاج إلى تحديث', en: 'Needs Update' },
    REVOKED: { ar: 'اعتماد مُبطل', en: 'Revoked' },
  };
  return map[status][lang];
}

export function getVerificationStatusLabel(
  status: SpecialistVerificationStatus,
  lang: Lang,
): string {
  const map: Record<SpecialistVerificationStatus, { ar: string; en: string }> = {
    PENDING_VERIFICATION: { ar: 'بانتظار التوثيق الإلزامي', en: 'Pending Verification' },
    VERIFIED: { ar: 'مختص موثق', en: 'Verified Specialist' },
    SUSPENDED: { ar: 'حساب معلق', en: 'Suspended' },
    REVOKED: { ar: 'اعتماد مُبطل', en: 'Credential Revoked' },
  };
  return map[status][lang];
}

export const TEXT = {
  ar: {
    brand: 'wseet',
    navSpecialists: 'المختصون',
    navRequests: 'الطلبات المفتوحة',
    navVerify: 'التحقق QR',
    navWorkspace: 'مساحة العمل',
    navAdmin: 'الإدارة',
    signInCta: 'دخول / حساب جديد',
    accountCta: 'حسابي',
    heroTitle: 'منصة تجمع الخبرة بالفرصة ضمن منظومة توثيق ومالية منضبطة',
    heroSubtitle:
      'سوق رقمي موثوق يربط العملاء بالمختصين المؤهلين لتنفيذ الخدمات الأكاديمية والعلمية والمهنية والتقنية مع تحقق إلزامي من المؤهلات وسجل مالي مزدوج القيد.',
    heroPrimaryAction: 'استعرض المختصين الموثقين',
    heroSecondaryAction: 'تحقق من شهادة برقم مرجعي',
    searchPlaceholder: 'ابحث بالتخصص، اسم المختص، SPSS، ترجمة، حوكمة...',
    allCategories: 'كل التصنيفات',
    allDegrees: 'كل المؤهلات',
    verifiedCredentialLabel: 'موثق المصدر',
    internalTeamLabel: 'فريق المنصة الداخلي',
    qrVerifyTitle: 'التحقق المستقل من الاعتماد والهوية المهنية',
    qrPrivacyNote:
      'الخصوصية محمية: تعرض صفحة التحقق حالة المؤهلات ومصدر التحقق فقط دون كشف رقم الهوية أو الهاتف أو البريد أو الملفات الأصلية.',
    ledgerRuleBanner:
      'تلتزم wseet بفصل الذمم المالية عبر سجل مزدوج القيد (Double-Entry Ledger) ولا تدّعي العمل كبنك؛ تتم المدفوعات عبر مزودي دفع مرخصين أو تأكيدات الشبكة الموثقة.',
    currencyDisplay: 'عملة العرض',
    languageLabel: 'English',
    themeLight: 'نهاري',
    themeDark: 'ليلي',
  },
  en: {
    brand: 'wseet',
    navSpecialists: 'Specialists',
    navRequests: 'Open Requests',
    navVerify: 'Verify QR',
    navWorkspace: 'Workspace',
    navAdmin: 'Admin',
    signInCta: 'Sign In / Register',
    accountCta: 'Account',
    heroTitle: 'Where verified expertise meets opportunity under disciplined financial governance',
    heroSubtitle:
      'A trusted digital marketplace connecting clients with credential-verified specialists across academic, scientific, and technical domains with mandatory verification and a double-entry ledger.',
    heroPrimaryAction: 'Browse Verified Specialists',
    heroSecondaryAction: 'Verify Credential by Ref ID',
    searchPlaceholder: 'Search by specialty, specialist name, SPSS, translation...',
    allCategories: 'All Categories',
    allDegrees: 'All Degrees',
    verifiedCredentialLabel: 'Source Verified',
    internalTeamLabel: 'Internal Team',
    qrVerifyTitle: 'Independent Credential & Qualification Verification',
    qrPrivacyNote:
      'Privacy enforced: Public QR verification displays credential status and source only—National ID, phone, email, and raw documents are strictly masked.',
    ledgerRuleBanner:
      'wseet enforces strict fund segregation via a Double-Entry Ledger and routes settlement through licensed payment providers and verified on-chain confirmations.',
    currencyDisplay: 'Display Currency',
    languageLabel: 'العربية',
    themeLight: 'Light',
    themeDark: 'Dark',
  },
};
