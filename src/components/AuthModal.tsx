import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiRequest, setAuthToken } from '../lib/api';
import type { Lang } from '../i18n/translations';
import type { CategoryRecord, UserRole } from '../shared/types';

export interface AuthUserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  specialistId?: string | null;
}

interface AuthModalProps {
  open: boolean;
  lang: Lang;
  categories: CategoryRecord[];
  currentUser: AuthUserSession | null;
  onClose: () => void;
  onAuthenticated: (user: AuthUserSession | null) => void;
}

export function AuthModal({
  open,
  lang,
  categories,
  currentUser,
  onClose,
  onAuthenticated,
}: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register' | 'admin'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'CLIENT' | 'SPECIALIST'>('CLIENT');
  const [primaryCategoryId, setPrimaryCategoryId] = useState(categories[0]?.id || 'cat-research');
  const [highestDegree, setHighestDegree] = useState<'PHD' | 'MASTERS' | 'BACHELORS' | 'PRO_LICENSE'>('MASTERS');
  const [headlineAr, setHeadlineAr] = useState('');

  // Admin / First-run setup state
  const [adminNeedsSetup, setAdminNeedsSetup] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminRole, setAdminRole] = useState<'SUPER_ADMIN' | 'MODERATOR'>('SUPER_ADMIN');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiRequest<{ needsSetup: boolean }>('/api/auth/admin-status')
      .then((res) => setAdminNeedsSetup(res.needsSetup))
      .catch(() => undefined);
  }, [open]);

  if (!open) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await apiRequest<{ token: string; user: AuthUserSession }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          accountType,
          primaryCategoryId,
          highestDegree,
          headlineAr,
        }),
      });
      setAuthToken(res.token);
      onAuthenticated(res.user);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await apiRequest<{ token: string; user: AuthUserSession }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAuthToken(res.token);
      onAuthenticated(res.user);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (adminNeedsSetup) {
        const res = await apiRequest<{ token: string; user: AuthUserSession }>(
          '/api/auth/claim-admin',
          {
            method: 'POST',
            body: JSON.stringify({ passcode: adminPasscode, name: name || 'المدير العام' }),
          },
        );
        setAuthToken(res.token);
        onAuthenticated(res.user);
        onClose();
      } else {
        const res = await apiRequest<{ token: string; user: AuthUserSession }>(
          '/api/auth/admin-login',
          {
            method: 'POST',
            body: JSON.stringify({ passcode: adminPasscode, role: adminRole }),
          },
        );
        setAuthToken(res.token);
        onAuthenticated(res.user);
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Admin authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {currentUser
              ? lang === 'ar'
                ? 'حساب الجلسة الحالية'
                : 'Current Session Account'
              : lang === 'ar'
                ? 'الوصول إلى منصة wseet'
                : 'Access wseet Platform'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {currentUser ? (
          <div className="space-y-4">
            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1 text-sm">
              <p className="font-semibold text-slate-900 dark:text-white">{currentUser.name}</p>
              <p className="text-slate-600 dark:text-slate-400">{currentUser.email}</p>
              <p className="font-mono text-xs text-blue-700 dark:text-blue-400">
                Role: {currentUser.role}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAuthToken(null);
                onAuthenticated(null);
                onClose();
              }}
              className="w-full py-2.5 text-sm font-semibold text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/60 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              {lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
              {(
                [
                  { id: 'register', label: lang === 'ar' ? 'حساب جديد' : 'Register' },
                  { id: 'login', label: lang === 'ar' ? 'دخول المستخدم' : 'Sign In' },
                  { id: 'admin', label: lang === 'ar' ? 'بوابة الإدارة' : 'Admin / Mod' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setError('');
                  }}
                  className={`flex-1 py-2 rounded-md transition-colors ${
                    tab === item.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {error && (
              <div className="p-3 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 rounded-lg text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {tab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountType('CLIENT')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold ${
                      accountType === 'CLIENT'
                        ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {lang === 'ar' ? 'حساب عميل' : 'Client Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('SPECIALIST')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold ${
                      accountType === 'SPECIALIST'
                        ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {lang === 'ar' ? 'حساب مختص (يتطلب توثيق)' : 'Specialist (Verification Req.)'}
                  </button>
                </div>

                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={lang === 'ar' ? 'رقم الجوال (اختياري)' : 'Phone (Optional)'}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={lang === 'ar' ? 'كلمة المرور (6 أحرف على الأقل)' : 'Password (min 6 chars)'}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                />

                {accountType === 'SPECIALIST' && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <select
                      value={primaryCategoryId}
                      onChange={(e) => setPrimaryCategoryId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {lang === 'ar' ? c.nameAr : c.nameEn}
                        </option>
                      ))}
                    </select>
                    <select
                      value={highestDegree}
                      onChange={(e) =>
                        setHighestDegree(
                          e.target.value as 'PHD' | 'MASTERS' | 'BACHELORS' | 'PRO_LICENSE',
                        )
                      }
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                    >
                      <option value="PHD">{lang === 'ar' ? 'دكتوراه' : 'PhD'}</option>
                      <option value="MASTERS">{lang === 'ar' ? 'ماجستير' : 'Masters'}</option>
                      <option value="BACHELORS">{lang === 'ar' ? 'بكالوريوس' : 'Bachelors'}</option>
                      <option value="PRO_LICENSE">{lang === 'ar' ? 'ترخيص مهني' : 'Pro License'}</option>
                    </select>
                    <input
                      type="text"
                      value={headlineAr}
                      onChange={(e) => setHeadlineAr(e.target.value)}
                      placeholder={lang === 'ar' ? 'المسمى المهني المختصر' : 'Professional Headline'}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                >
                  {submitting
                    ? lang === 'ar'
                      ? 'جارٍ التسجيل...'
                      : 'Registering...'
                    : lang === 'ar'
                      ? 'إنشاء الحساب'
                      : 'Create Account'}
                </button>
              </form>
            )}

            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-3 text-sm">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={lang === 'ar' ? 'كلمة المرور' : 'Password'}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                >
                  {submitting
                    ? lang === 'ar'
                      ? 'جارٍ الدخول...'
                      : 'Signing In...'
                    : lang === 'ar'
                      ? 'تسجيل الدخول'
                      : 'Sign In'}
                </button>
              </form>
            )}

            {tab === 'admin' && (
              <form onSubmit={handleAdminSubmit} className="space-y-3 text-sm">
                {adminNeedsSetup ? (
                  <div className="p-3 border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-xs text-blue-800 dark:text-blue-300">
                    {lang === 'ar'
                      ? 'الإعداد الأولي للمدير العام: لم يتم تعيين رمز إدارة بعد. اختر كلمة مرور قوية (8 أحرف فأكثر) لتفعيل حساب المدير العام وتأمين البوابة.'
                      : 'First-Run Admin Setup: No admin passcode configured yet. Choose a strong password (8+ chars) to claim the Super Admin role.'}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAdminRole('SUPER_ADMIN')}
                      className={`flex-1 py-2 rounded-lg border text-xs font-semibold ${
                        adminRole === 'SUPER_ADMIN'
                          ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                          : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {lang === 'ar' ? 'المدير العام (SUPER_ADMIN)' : 'Super Admin'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminRole('MODERATOR')}
                      className={`flex-1 py-2 rounded-lg border text-xs font-semibold ${
                        adminRole === 'MODERATOR'
                          ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                          : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {lang === 'ar' ? 'المشرف (MODERATOR)' : 'Moderator'}
                    </button>
                  </div>
                )}

                {adminNeedsSetup && (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={lang === 'ar' ? 'اسم المدير العام' : 'Super Admin Name'}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                  />
                )}

                <input
                  type="password"
                  required
                  minLength={adminNeedsSetup ? 8 : 1}
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  placeholder={
                    adminNeedsSetup
                      ? lang === 'ar'
                        ? 'تعيين رمز الإدارة (8 أحرف على الأقل)'
                        : 'Set Admin Passcode (min 8 chars)'
                      : lang === 'ar'
                        ? 'رمز دخول الإدارة'
                        : 'Admin Passcode'
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950"
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg"
                >
                  {adminNeedsSetup
                    ? lang === 'ar'
                      ? 'تفعيل اعتماد المدير العام'
                      : 'Claim Super Admin'
                    : lang === 'ar'
                      ? 'دخول لوحة الإدارة'
                      : 'Sign In to Admin'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
