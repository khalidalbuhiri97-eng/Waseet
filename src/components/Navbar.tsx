import { useState } from 'react';
import { Menu, X, ShieldCheck, UserRound, ChevronDown, Home, BriefcaseBusiness, QrCode, LayoutDashboard, LogIn } from 'lucide-react';
import type { Lang } from '../i18n/translations';
import { TEXT } from '../i18n/translations';
import type { UserRole } from '../shared/types';

export type AppSection = 'specialists' | 'requests' | 'verify' | 'workspace' | 'admin';

interface NavbarProps {
  lang: Lang;
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
  currentUser: { name: string; role: UserRole } | null;
  onOpenAuth: () => void;
}

export function Navbar({ lang, activeSection, onNavigate, currentUser, onOpenAuth }: NavbarProps) {
  const t = TEXT[lang];
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAr = lang === 'ar';
  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MODERATOR';
  const navItems = [
    { id: 'specialists' as const, label: isAr ? 'الرئيسية' : 'Home', icon: Home },
    { id: 'requests' as const, label: t.navRequests, icon: BriefcaseBusiness },
    { id: 'verify' as const, label: t.navVerify, icon: QrCode },
    { id: 'workspace' as const, label: t.navWorkspace, icon: LayoutDashboard },
    ...(isAdmin ? [{ id: 'admin' as const, label: t.navAdmin, icon: ShieldCheck }] : []),
  ];

  const go = (section: AppSection) => {
    onNavigate(section);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-[#0B1220]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[70px] flex items-center justify-between gap-4">
        <button type="button" onClick={() => go('specialists')} aria-label={isAr ? 'العودة للرئيسية' : 'Go to home'} className="group flex items-center gap-3 shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-blue-600">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-blue-700 to-cyan-500 text-xl font-black text-white shadow-lg shadow-blue-900/20">و</span>
          <span className="text-start leading-tight"><span className="block text-lg font-black tracking-[0.08em] text-slate-950 dark:text-white">WASEET</span><span className="block text-[10px] font-medium tracking-wide text-slate-500 dark:text-slate-400">{isAr ? 'منصة الخبرات' : 'EXPERTISE PLATFORM'}</span></span>
        </button>

        <nav aria-label={isAr ? 'التنقل الرئيسي' : 'Main navigation'} className="hidden lg:flex items-center gap-1 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-1.5">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id;
            return <button key={id} type="button" onClick={() => go(id)} aria-current={active ? 'page' : undefined} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${active ? 'bg-blue-700 text-white shadow-md shadow-blue-900/15' : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-300'}`}><Icon className="h-4 w-4" />{label}</button>;
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button type="button" onClick={onOpenAuth} className="hidden sm:inline-flex max-w-[190px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition">
            {currentUser ? <><UserRound className="h-4 w-4 shrink-0" /><span className="truncate">{currentUser.name}</span><ChevronDown className="h-3 w-3 shrink-0" /></> : <><LogIn className="h-4 w-4" />{t.signInCta}</>}
          </button>
          <button type="button" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? (isAr ? 'إغلاق القائمة' : 'Close menu') : (isAr ? 'فتح القائمة' : 'Open menu')} aria-expanded={mobileOpen} aria-controls="waseet-mobile-navigation" className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-blue-400">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && <div id="waseet-mobile-navigation" className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] px-4 py-3 shadow-xl">
        <nav aria-label={isAr ? 'قائمة الهاتف' : 'Mobile navigation'} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {navItems.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => go(id)} aria-current={activeSection === id ? 'page' : undefined} className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-start text-xs font-bold transition ${activeSection === id ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200'}`}><Icon className="h-4 w-4 shrink-0" />{label}</button>)}
        </nav>
        <button type="button" onClick={() => { setMobileOpen(false); onOpenAuth(); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 dark:bg-blue-700 px-4 py-3 text-xs font-bold text-white"><UserRound className="h-4 w-4" />{currentUser ? currentUser.name : t.signInCta}</button>
      </div>}
    </header>
  );
}
