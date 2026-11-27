import type { DatabaseState } from './store.ts';

/**
 * Production-safe initial state.
 * Only platform taxonomy and configuration are preloaded. No demo identities,
 * specialists, credentials, orders, payments, reviews, or ledger activity.
 */
export function createInitialSeedState(): DatabaseState {
  return {
    adminCredentialHash: null,
    users: [],
    specialists: [],
    documents: [],
    categories: [
      {
        id: 'cat-stats', parentId: null, slug: 'statistical-analysis',
        nameAr: 'التحليل الإحصائي والبيانات', nameEn: 'Statistical & Data Analysis',
        requiresVerifiedDegree: true,
        integrityNoticeAr: 'يُحظر تلفيق البيانات أو تعديل النتائج الإحصائية قسراً لإثبات فرضية غير حقيقية.',
        integrityNoticeEn: 'Data fabrication or forced result manipulation is strictly prohibited.',
        isActive: true,
      },
      {
        id: 'cat-research', parentId: null, slug: 'scientific-research',
        nameAr: 'الأبحاث والدراسات العلمية', nameEn: 'Scientific Research & Studies',
        requiresVerifiedDegree: true,
        integrityNoticeAr: 'تقتصر الخدمة على الإرشاد المنهجي ومراجعة الأدبيات والدراسات المرجعية دون كتابة رسائل للانتحال.',
        integrityNoticeEn: 'Services are limited to methodological guidance and reference studies; ghostwriting for plagiarism is prohibited.',
        isActive: true,
      },
      {
        id: 'cat-editing', parentId: null, slug: 'proofreading-editing',
        nameAr: 'التدقيق اللغوي والتحرير', nameEn: 'Proofreading & Academic Editing',
        requiresVerifiedDegree: false,
        integrityNoticeAr: 'الحفاظ على أمانة المحتوى العلمي وسرية المخطوطات.',
        integrityNoticeEn: 'Maintain scholarly fidelity and manuscript confidentiality.',
        isActive: true,
      },
      {
        id: 'cat-translation', parentId: null, slug: 'specialized-translation',
        nameAr: 'الترجمة التخصصية', nameEn: 'Specialized Translation',
        requiresVerifiedDegree: true,
        integrityNoticeAr: 'الالتزام بالدقة المصطلحية في الترجمات القانونية والطبية والأكاديمية.',
        integrityNoticeEn: 'Strict terminological precision is required in legal, medical, and academic translations.',
        isActive: true,
      },
      {
        id: 'cat-engineering', parentId: null, slug: 'software-engineering',
        nameAr: 'البرمجة وتطوير الأنظمة', nameEn: 'Software & Systems Engineering',
        requiresVerifiedDegree: false,
        integrityNoticeAr: 'يُمنع تطوير برمجيات اختراق ضارة أو أدوات تجاوز أمني غير مصرح بها.',
        integrityNoticeEn: 'Malicious exploit development or unauthorized security bypass tools are prohibited.',
        isActive: true,
      },
      {
        id: 'cat-consulting', parentId: null, slug: 'specialized-consulting',
        nameAr: 'الاستشارات المتخصصة', nameEn: 'Specialized Consulting',
        requiresVerifiedDegree: true,
        integrityNoticeAr: 'الاستشارة رأي مهني موثق ولا تغني عن التراخيص النظامية الملزمة عند الاقتضاء.',
        integrityNoticeEn: 'Advisory opinions do not replace statutory regulatory filings where mandated.',
        isActive: true,
      },
      {
        id: 'cat-design', parentId: null, slug: 'creative-design',
        nameAr: 'التصميم الإبداعي والعروض', nameEn: 'Creative Design & Presentations',
        requiresVerifiedDegree: false,
        integrityNoticeAr: 'تسليم أصول أصلية خالية من حقوق الغير.',
        integrityNoticeEn: 'Deliver original assets free of third-party copyright infringement.',
        isActive: true,
      },
      {
        id: 'cat-training', parentId: null, slug: 'tutoring-training',
        nameAr: 'الدروس والتدريب العلمي', nameEn: 'Tutoring & Academic Training',
        requiresVerifiedDegree: false,
        integrityNoticeAr: 'يُحظر حل الاختبارات المباشرة أثناء انعقادها أو انتحال شخصية الطالب.',
        integrityNoticeEn: 'Live exam taking or student impersonation is prohibited.',
        isActive: true,
      },
    ],
    services: [],
    orders: [],
    offers: [],
    agreements: [],
    deliverables: [],
    messages: [],
    paymentIntents: [],
    ledgerAccounts: [],
    journalEntries: [],
    payouts: [],
    disputes: [],
    reviews: [],
    auditLogs: [],
    settings: {
      commissionRatePct: 15,
      fxRatesFromUsd: { USD: 1, SAR: 3.75, USDT: 1 },
      reviewWindowHours: 72,
      usdtNetwork: 'TRON (TRC-20)',
      usdtMinConfirmations: 20,
    },
  };
}
