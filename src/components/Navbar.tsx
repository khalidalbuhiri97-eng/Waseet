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

export function Navbar({
  lang,
  activeSection,
  onNavigate,
  currentUser,
  onOpenAuth,
}: NavbarProps) {
  const t = TEXT[lang];

  const navItems: Array<{ id: AppSection; label: string }> = [
    { id: 'specialists', label: t.navSpecialists },
    { id: 'requests', label: t.navRequests },
    { id: 'verify', label: t.navVerify },
    { id: 'workspace', label: t.navWorkspace },
    { id: 'admin', label: t.navAdmin },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/90 dark:border-slate-800/90 bg-white/90 dark:bg-[#0B0F17]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element brand wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('specialists')}
          className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-700 rounded"
        >
          {t.brand}
        </button>

        {/* Zone 2: 5 concise single-line text nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {navItems.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors duration-150 ${
                  active
                    ? 'border-blue-700 text-slate-950 dark:text-white dark:border-blue-400 font-semibold'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-950 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            {currentUser ? currentUser.name : t.signInCta}
          </button>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <div className="md:hidden border-t border-stone-200 dark:border-slate-800 px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-medium">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={`whitespace-nowrap shrink-0 pb-1 border-b-2 ${
              activeSection === item.id
                ? 'border-blue-700 text-slate-950 dark:text-white font-semibold'
                : 'border-transparent text-slate-600 dark:text-slate-400'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
}
