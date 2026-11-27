import { Calendar, ShieldAlert } from 'lucide-react';
import type { Lang } from '../i18n/translations';
import { convertCurrency, formatMoney, getOrderStatusLabel } from '../i18n/translations';
import type { CategoryRecord, OrderStatus, SupportedCurrency } from '../shared/types';

export interface PublicOpenOrder {
  id: string;
  orderNumber: string;
  categoryId: string;
  title: string;
  description: string;
  deliverablesSpec: string;
  status: OrderStatus;
  displayCurrency: SupportedCurrency;
  budgetMin: number;
  budgetMax: number;
  deadlineAt: string;
  offersCount: number;
  createdAt: string;
}

interface OpenRequestsViewProps {
  lang: Lang;
  currency: SupportedCurrency;
  categories: CategoryRecord[];
  openOrders: PublicOpenOrder[];
  onGoToWorkspace: () => void;
}

export function OpenRequestsView({
  lang,
  currency,
  categories,
  openOrders,
  onGoToWorkspace,
}: OpenRequestsViewProps) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {lang === 'ar' ? 'الطلبات المفتوحة للعروض' : 'Open Service Requests'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {lang === 'ar'
              ? 'يُسمح فقط للمختصين الذين اجتازوا التوثيق الإلزامي بتقديم عروض الأسعار.'
              : 'Only specialists who passed mandatory credential verification may submit offers.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToWorkspace}
          className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap shrink-0"
        >
          {lang === 'ar' ? 'نشر طلب أو تقديم عرض' : 'Post Request or Submit Offer'}
        </button>
      </div>

      {openOrders.length === 0 ? (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-10 text-center text-sm text-slate-600 dark:text-slate-400">
          {lang === 'ar' ? 'لا توجد طلبات مفتوحة حالياً.' : 'No open requests available.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {openOrders.map((ord) => {
            const cat = categories.find((c) => c.id === ord.categoryId);
            const minConv = convertCurrency(ord.budgetMin, ord.displayCurrency, currency);
            const maxConv = convertCurrency(ord.budgetMax, ord.displayCurrency, currency);
            return (
              <article
                key={ord.id}
                className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{ord.orderNumber}</span>
                    <span>{getOrderStatusLabel(ord.status, lang)}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{ord.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === 'ar' ? cat?.nameAr : cat?.nameEn} · {ord.offersCount}{' '}
                    {lang === 'ar' ? 'عروض مستلمة' : 'offers'}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {ord.description}
                  </p>
                  <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {lang === 'ar' ? 'المخرجات المطلوبة: ' : 'Deliverables: '}
                    </span>
                    {ord.deliverablesSpec}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="text-xs font-mono tabular-nums text-slate-700 dark:text-slate-200">
                    <span className="font-semibold">
                      {formatMoney(minConv, currency)} – {formatMoney(maxConv, currency)}
                    </span>
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{ord.deadlineAt.slice(0, 10)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onGoToWorkspace}
                    className="px-3.5 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    {lang === 'ar' ? 'تقديم عرض في مساحة العمل' : 'Offer in Workspace'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          {lang === 'ar'
            ? 'ضابط النزاهة الأكاديمية: يُمنع منعاً باتاً نشر طلبات لحل اختبارات مباشرة، أو كتابة رسائل علمية للانتحال، أو تزوير الشهادات؛ تُرفض الطلبات المخالفة تلقائياً.'
            : 'Academic Integrity Policy: Live exam cheating, ghostwriting for plagiarism, and credential forgery are strictly blocked.'}
        </p>
      </div>
    </section>
  );
}
