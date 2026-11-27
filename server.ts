import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import type {
  ConfidenceLevel,
  DocumentStatus,
  DocumentType,
  OrderRecord,
  SupportedCurrency,
  UserRole,
} from './src/shared/types.ts';
import { getState, withTransaction } from './server/store.ts';
import { createInitialSeedState } from './server/seed.ts';
import {
  hashPassword,
  optionalAuth,
  requireAuth,
  requireRole,
  signSessionToken,
  verifyPassword,
  type AuthRequest,
} from './server/auth.ts';
import {
  computeTrialBalance,
  getSpecialistAvailableDue,
  postJournalEntry,
} from './server/ledger.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const initFn = createInitialSeedState;

const INTEGRITY_BLOCKED_KEYWORDS = [
  'حل اختبار مباشر',
  'انتحال شخصية',
  'تزوير شهادة',
  'شهادة مزورة',
  'exam cheating',
  'take my exam',
  'forge degree',
  'plagiarism bypass',
];

function containsIntegrityViolation(text: string): boolean {
  const lower = text.toLowerCase();
  return INTEGRITY_BLOCKED_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

function maskPiiForPreFundedChat(raw: string): { sanitized: string; masked: boolean } {
  let masked = false;
  let output = raw;

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  if (emailRegex.test(output)) {
    masked = true;
    output = output.replace(emailRegex, '[تم حجب البريد قبل التعاقد]');
  }

  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|t\.me\/[^\s]+|wa\.me\/[^\s]+)/gi;
  if (urlRegex.test(output)) {
    masked = true;
    output = output.replace(urlRegex, '[تم حجب الرابط قبل التعاقد]');
  }

  const phoneRegex = /(\+?\d[\d\s-]{7,}\d)/g;
  if (phoneRegex.test(output)) {
    masked = true;
    output = output.replace(phoneRegex, '[تم حجب رقم التواصل قبل التعاقد]');
  }

  return { sanitized: output, masked };
}

function appendAudit(
  draft: ReturnType<typeof initFn>,
  actorId: string,
  actorRole: UserRole | 'SYSTEM',
  actionCode: string,
  entityType: string,
  entityId: string,
  summary: string,
): void {
  draft.auditLogs.unshift({
    id: crypto.randomUUID(),
    actorId,
    actorRole,
    actionCode,
    entityType,
    entityId,
    summary,
    createdAt: new Date().toISOString(),
  });
}


/**
 * One-time, idempotent cleanup for the demo records shipped in earlier builds.
 * It deliberately targets only the fixed demo IDs; real customer records remain untouched.
 */
async function removeLegacyDemoData(): Promise<void> {
  const demoUserIds = new Set(['usr-client-01', 'usr-spec-01', 'usr-spec-02', 'usr-spec-03', 'usr-spec-04']);
  const demoSpecialistIds = new Set(['spec-01', 'spec-02', 'spec-03', 'spec-04']);
  const demoOrderIds = new Set(['ord-01', 'ord-02']);
  const demoIds = {
    documents: new Set(['doc-01', 'doc-02', 'doc-03', 'doc-04', 'doc-05']),
    services: new Set(['srv-01', 'srv-02', 'srv-03', 'srv-04']),
    offers: new Set(['off-01']),
    agreements: new Set(['agr-01']),
    deliverables: new Set(['del-01']),
    messages: new Set(['msg-01', 'msg-02']),
    payments: new Set(['pay-01']),
    reviews: new Set(['rev-01']),
  };

  await withTransaction(initFn, (draft) => {
    draft.users = draft.users.filter((item) => !demoUserIds.has(item.id));
    draft.specialists = draft.specialists.filter((item) => !demoSpecialistIds.has(item.id));
    draft.documents = draft.documents.filter((item) => !demoIds.documents.has(item.id) && !demoSpecialistIds.has(item.specialistId));
    draft.services = draft.services.filter((item) => !demoIds.services.has(item.id) && !demoSpecialistIds.has(item.specialistId));
    draft.orders = draft.orders.filter((item) => !demoOrderIds.has(item.id) && !demoUserIds.has(item.clientId) && !(item.assignedSpecialistId && demoSpecialistIds.has(item.assignedSpecialistId)));
    draft.offers = draft.offers.filter((item) => !demoIds.offers.has(item.id) && !demoOrderIds.has(item.orderId) && !demoSpecialistIds.has(item.specialistId));
    draft.agreements = draft.agreements.filter((item) => !demoIds.agreements.has(item.id) && !demoOrderIds.has(item.orderId));
    draft.deliverables = draft.deliverables.filter((item) => !demoIds.deliverables.has(item.id) && !demoOrderIds.has(item.orderId));
    draft.messages = draft.messages.filter((item) => !demoIds.messages.has(item.id) && !demoOrderIds.has(item.orderId) && !demoUserIds.has(item.senderId));
    draft.paymentIntents = draft.paymentIntents.filter((item) => !demoIds.payments.has(item.id) && !demoOrderIds.has(item.orderId) && !demoUserIds.has(item.payerId));
    draft.reviews = draft.reviews.filter((item) => !demoIds.reviews.has(item.id) && !demoOrderIds.has(item.orderId) && !demoSpecialistIds.has(item.specialistId));
    draft.disputes = draft.disputes.filter((item) => !demoOrderIds.has(item.orderId));
    draft.payouts = draft.payouts.filter((item) => !demoSpecialistIds.has(item.specialistId));
    draft.journalEntries = draft.journalEntries.filter((entry) => !demoOrderIds.has(entry.referenceId) && !entry.idempotencyKey.startsWith('seed-je-'));
    const usedAccountIds = new Set(draft.journalEntries.flatMap((entry) => entry.lines.map((line) => line.ledgerAccountId)));
    draft.ledgerAccounts = draft.ledgerAccounts.filter((account) => usedAccountIds.has(account.id));
    draft.auditLogs = draft.auditLogs.filter((entry) => entry.id !== 'aud-01' && !demoUserIds.has(entry.actorId) && !demoOrderIds.has(entry.entityId));
  });
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Initialize store on boot cleanly
  getState(initFn);
  await removeLegacyDemoData();

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'wseet' });
  });

  // ---------------------------------------------------------------------------
  // AUTH & FIRST-RUN ADMIN CLAIM
  // ---------------------------------------------------------------------------
  app.get('/api/auth/admin-status', (_req, res) => {
    const state = getState(initFn);
    const envConfigured = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0);
    const claimed = Boolean(state.adminCredentialHash);
    res.json({
      needsSetup: !envConfigured && !claimed,
      envConfigured,
      claimed,
    });
  });

  app.post('/api/auth/claim-admin', async (req, res) => {
    const { passcode, name, email } = req.body as {
      passcode?: string;
      name?: string;
      email?: string;
    };

    if (!passcode || typeof passcode !== 'string' || passcode.trim().length < 8) {
      res.status(400).json({ error: 'Admin passcode must be at least 8 characters' });
      return;
    }

    try {
      const result = await withTransaction(initFn, (draft) => {
        const envConfigured = Boolean(
          process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0,
        );
        if (envConfigured || draft.adminCredentialHash) {
          throw new Error('ALREADY_CLAIMED');
        }
        draft.adminCredentialHash = hashPassword(passcode.trim());

        const adminEmail = (email || 'admin@wseet.local').trim().toLowerCase();
        const adminName = (name || 'المدير العام').trim();
        let adminUser = draft.users.find((u) => u.role === 'SUPER_ADMIN');
        if (!adminUser) {
          adminUser = {
            id: 'usr-super-admin',
            name: adminName,
            email: adminEmail,
            phone: '',
            role: 'SUPER_ADMIN',
            passwordHash: draft.adminCredentialHash,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          };
          draft.users.push(adminUser);
        }
        appendAudit(
          draft,
          adminUser.id,
          'SUPER_ADMIN',
          'ADMIN_CREDENTIAL_CLAIMED',
          'USER',
          adminUser.id,
          'تفعيل اعتماد المدير العام لأول مرة',
        );
        return adminUser;
      });

      const token = signSessionToken(result);
      res.json({
        token,
        user: { id: result.id, name: result.name, email: result.email, role: result.role },
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'ALREADY_CLAIMED') {
        res.status(409).json({ error: 'Admin credential is already configured' });
        return;
      }
      res.status(500).json({ error: 'Failed to initialize admin credential' });
    }
  });

  app.post('/api/auth/admin-login', (req, res) => {
    const { passcode, role } = req.body as { passcode?: string; role?: 'SUPER_ADMIN' | 'MODERATOR' };
    if (!passcode || typeof passcode !== 'string') {
      res.status(400).json({ error: 'Passcode is required' });
      return;
    }

    const state = getState(initFn);
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();

    let authenticated = false;
    if (envPasscode && envPasscode.length > 0) {
      const a = Buffer.from(passcode.trim(), 'utf8');
      const b = Buffer.from(envPasscode, 'utf8');
      authenticated = a.length === b.length && crypto.timingSafeEqual(a, b);
    } else if (state.adminCredentialHash) {
      authenticated = verifyPassword(passcode.trim(), state.adminCredentialHash);
    }

    if (!authenticated) {
      res.status(401).json({ error: 'Invalid administrator credentials' });
      return;
    }

    const targetRole: UserRole = role === 'MODERATOR' ? 'MODERATOR' : 'SUPER_ADMIN';
    const existingAdmin = state.users.find((u) => u.role === 'SUPER_ADMIN');
    const sessionUser = {
      id: targetRole === 'MODERATOR' ? 'usr-moderator-01' : existingAdmin?.id || 'usr-super-admin',
      name: targetRole === 'MODERATOR' ? 'مشرف التحقق والتحكيم' : existingAdmin?.name || 'المدير العام',
      email: existingAdmin?.email || 'admin@wseet.local',
      role: targetRole,
    };

    const token = signSessionToken(sessionUser);
    res.json({ token, user: sessionUser });
  });

  app.post('/api/auth/register', async (req, res) => {
    const { name, email, phone, password, accountType, primaryCategoryId, highestDegree, headlineAr } =
      req.body as {
        name?: string;
        email?: string;
        phone?: string;
        password?: string;
        accountType?: 'CLIENT' | 'SPECIALIST';
        primaryCategoryId?: string;
        highestDegree?: 'PHD' | 'MASTERS' | 'BACHELORS' | 'PRO_LICENSE';
        headlineAr?: string;
      };

    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      res.status(400).json({ error: 'Name, valid email, and password (min 6 chars) are required' });
      return;
    }

    const role: UserRole = accountType === 'SPECIALIST' ? 'SPECIALIST' : 'CLIENT';
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const created = await withTransaction(initFn, (draft) => {
        if (draft.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
          throw new Error('EMAIL_EXISTS');
        }
        const userId = `usr-${crypto.randomUUID().slice(0, 8)}`;
        const now = new Date().toISOString();
        const user = {
          id: userId,
          name: name.trim(),
          email: normalizedEmail,
          phone: (phone || '').trim(),
          role,
          passwordHash: hashPassword(password),
          status: 'ACTIVE' as const,
          createdAt: now,
        };
        draft.users.push(user);

        let specialistId: string | null = null;
        if (role === 'SPECIALIST') {
          specialistId = `spec-${crypto.randomUUID().slice(0, 8)}`;
          const refCode = `WST-CR-${Math.floor(10000 + Math.random() * 89999)}`;
          draft.specialists.push({
            id: specialistId,
            userId,
            displayName: name.trim(),
            headlineAr: headlineAr?.trim() || 'مختص قيد استكمال إجراءات التوثيق',
            headlineEn: 'Specialist Pending Credential Verification',
            bioAr: 'ملف مهني مسجل في منصة wseet وبانتظار إتمام التحقق من الهوية والمؤهلات.',
            bioEn: 'Registered specialist profile awaiting mandatory identity and degree verification.',
            avatarUrl: '',
            primaryCategoryId: primaryCategoryId || 'cat-research',
            highestDegree: highestDegree || 'MASTERS',
            languages: ['AR', 'EN'],
            verificationStatus: 'PENDING_VERIFICATION',
            isInternalTeam: false,
            isAvailable: true,
            credentialRefCode: refCode,
            avgRating: 0,
            weightedScore: 0,
            completedOrdersCount: 0,
            onTimeRate: 100,
            responseTimeHours: 4,
          });
        }

        appendAudit(
          draft,
          userId,
          role,
          'USER_REGISTERED',
          'USER',
          userId,
          `تسجيل حساب جديد بدور ${role}`,
        );
        return { user, specialistId };
      });

      const token = signSessionToken(created.user);
      res.status(201).json({
        token,
        user: {
          id: created.user.id,
          name: created.user.name,
          email: created.user.email,
          role: created.user.role,
          specialistId: created.specialistId,
        },
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'EMAIL_EXISTS') {
        res.status(409).json({ error: 'Email is already registered' });
        return;
      }
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const state = getState(initFn);
    const user = state.users.find(
      (u) =>
        u.email.toLowerCase() === email.trim().toLowerCase() &&
        (u.role === 'CLIENT' || u.role === 'SPECIALIST'),
    );

    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ error: 'Account is suspended' });
      return;
    }

    const spec = state.specialists.find((s) => s.userId === user.id);
    const token = signSessionToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialistId: spec?.id || null,
      },
    });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
    const state = getState(initFn);
    const auth = req.authUser!;
    const spec = state.specialists.find((s) => s.userId === auth.userId) || null;
    res.json({
      user: {
        id: auth.userId,
        name: auth.name,
        email: auth.email,
        role: auth.role,
        specialistId: spec?.id || null,
      },
      specialist: spec,
    });
  });

  // ---------------------------------------------------------------------------
  // PUBLIC MARKETPLACE & QR CREDENTIAL VERIFICATION (NO PII LEAK)
  // ---------------------------------------------------------------------------
  app.get('/api/marketplace', optionalAuth, (req: AuthRequest, res) => {
    const state = getState(initFn);
    const verifiedSpecialists = state.specialists.map((spec) => {
      const docs = state.documents
        .filter((d) => d.specialistId === spec.id && d.status === 'VERIFIED')
        .map((d) => ({
          id: d.id,
          docType: d.docType,
          titleAr: d.titleAr,
          titleEn: d.titleEn,
          issuingAuthority: d.issuingAuthority,
          status: d.status,
          verificationMethod: d.verificationMethod,
          verificationSource: d.verificationSource,
          confidenceLevel: d.confidenceLevel,
          verifiedAt: d.verifiedAt,
        }));
      const services = state.services.filter((s) => s.specialistId === spec.id && s.isActive);
      const reviews = state.reviews.filter((r) => r.specialistId === spec.id);
      return {
        ...spec,
        verifiedDocuments: docs,
        services,
        reviews,
      };
    });

    const publicOpenOrders = state.orders
      .filter((o) => o.status === 'OPEN_FOR_OFFERS' || o.status === 'OFFERS_RECEIVED')
      .map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        categoryId: o.categoryId,
        title: o.title,
        description: o.description,
        deliverablesSpec: o.deliverablesSpec,
        status: o.status,
        displayCurrency: o.displayCurrency,
        budgetMin: o.budgetMin,
        budgetMax: o.budgetMax,
        deadlineAt: o.deadlineAt,
        offersCount: state.offers.filter((off) => off.orderId === o.id).length,
        createdAt: o.createdAt,
      }));

    res.json({
      categories: state.categories.filter((c) => c.isActive),
      specialists: verifiedSpecialists.filter((s) => s.verificationStatus === 'VERIFIED'),
      openOrders: publicOpenOrders,
      settings: state.settings,
    });
  });

  // Strict PII-isolated public QR verification endpoint
  app.get('/api/verify/:refCode', (req, res) => {
    const state = getState(initFn);
    const refCode = req.params.refCode.trim().toUpperCase();
    const spec = state.specialists.find((s) => s.credentialRefCode.toUpperCase() === refCode);
    if (!spec) {
      res.status(404).json({ error: 'Credential reference not found' });
      return;
    }

    const docs = state.documents
      .filter((d) => d.specialistId === spec.id && (d.status === 'VERIFIED' || d.status === 'REVOKED'))
      .map((d) => ({
        id: d.id,
        docType: d.docType,
        titleAr: d.titleAr,
        titleEn: d.titleEn,
        issuingAuthority: d.issuingAuthority,
        status: d.status,
        verificationMethod: d.verificationMethod,
        verificationSource: d.verificationSource,
        confidenceLevel: d.confidenceLevel,
        verifiedAt: d.verifiedAt,
        expiresAt: d.expiresAt,
      }));

    const category = state.categories.find((c) => c.id === spec.primaryCategoryId);

    res.json({
      credentialRefCode: spec.credentialRefCode,
      displayName: spec.displayName,
      headlineAr: spec.headlineAr,
      headlineEn: spec.headlineEn,
      categoryNameAr: category?.nameAr || '',
      categoryNameEn: category?.nameEn || '',
      verificationStatus: spec.verificationStatus,
      isInternalTeam: spec.isInternalTeam,
      revokedAt: spec.revokedAt || null,
      credentials: docs,
      privacyNotice:
        'Protected PII (National ID number, phone, email, and original uploaded files) are strictly masked from public QR verification.',
    });
  });

  // ---------------------------------------------------------------------------
  // SPECIALIST VERIFICATION & SERVICES WORKSPACE
  // ---------------------------------------------------------------------------
  app.get('/api/specialist/me', requireAuth, requireRole('SPECIALIST'), (req: AuthRequest, res) => {
    const state = getState(initFn);
    const spec = state.specialists.find((s) => s.userId === req.authUser!.userId);
    if (!spec) {
      res.status(404).json({ error: 'Specialist profile not found' });
      return;
    }
    const docs = state.documents.filter((d) => d.specialistId === spec.id);
    const services = state.services.filter((s) => s.specialistId === spec.id);
    const payouts = state.payouts.filter((p) => p.specialistId === spec.id);

    const balances: Record<SupportedCurrency, number> = {
      SAR: getSpecialistAvailableDue(state, spec.userId, 'SAR'),
      USD: getSpecialistAvailableDue(state, spec.userId, 'USD'),
      USDT: getSpecialistAvailableDue(state, spec.userId, 'USDT'),
    };

    res.json({
      specialist: spec,
      documents: docs,
      services,
      payouts,
      availableBalances: balances,
    });
  });

  app.post('/api/specialist/documents', requireAuth, requireRole('SPECIALIST'), async (req: AuthRequest, res) => {
    const { docType, titleAr, titleEn, issuingAuthority, referenceNumber, fileName, expiresAt } =
      req.body as {
        docType?: DocumentType;
        titleAr?: string;
        titleEn?: string;
        issuingAuthority?: string;
        referenceNumber?: string;
        fileName?: string;
        expiresAt?: string;
      };

    if (!docType || !titleAr?.trim() || !issuingAuthority?.trim() || !fileName?.trim()) {
      res.status(400).json({ error: 'Document type, title, issuing authority, and file name are required' });
      return;
    }

    const doc = await withTransaction(initFn, (draft) => {
      const spec = draft.specialists.find((s) => s.userId === req.authUser!.userId);
      if (!spec) throw new Error('SPEC_NOT_FOUND');

      const now = new Date().toISOString();
      const fileSha256 = crypto
        .createHash('sha256')
        .update(`${spec.id}:${fileName}:${referenceNumber || ''}:${Date.now()}`)
        .digest('hex');

      const created = {
        id: `doc-${crypto.randomUUID().slice(0, 8)}`,
        specialistId: spec.id,
        docType,
        titleAr: titleAr.trim(),
        titleEn: titleEn?.trim() || titleAr.trim(),
        issuingAuthority: issuingAuthority.trim(),
        referenceNumber: referenceNumber?.trim() || 'PENDING-CHECK',
        fileName: fileName.trim(),
        fileSha256,
        status: 'UPLOADED' as DocumentStatus,
        expiresAt: expiresAt || undefined,
        createdAt: now,
        updatedAt: now,
      };
      draft.documents.push(created);
      appendAudit(
        draft,
        req.authUser!.userId,
        'SPECIALIST',
        'DOCUMENT_UPLOADED',
        'VERIFICATION_DOCUMENT',
        created.id,
        `رفع مستند توثيق (${docType}): ${created.titleAr}`,
      );
      return created;
    });

    res.status(201).json({ document: doc });
  });

  app.post('/api/specialist/services', requireAuth, requireRole('SPECIALIST'), async (req: AuthRequest, res) => {
    const { categoryId, titleAr, descriptionAr, basePrice, baseCurrency, deliveryDays } = req.body as {
      categoryId?: string;
      titleAr?: string;
      descriptionAr?: string;
      basePrice?: number;
      baseCurrency?: SupportedCurrency;
      deliveryDays?: number;
    };

    if (!categoryId || !titleAr?.trim() || !basePrice || basePrice <= 0) {
      res.status(400).json({ error: 'Category, title, and positive base price are required' });
      return;
    }

    try {
      const service = await withTransaction(initFn, (draft) => {
        const spec = draft.specialists.find((s) => s.userId === req.authUser!.userId);
        if (!spec) throw new Error('SPEC_NOT_FOUND');
        if (spec.verificationStatus !== 'VERIFIED') {
          throw new Error('NOT_VERIFIED');
        }
        const created = {
          id: `srv-${crypto.randomUUID().slice(0, 8)}`,
          specialistId: spec.id,
          categoryId,
          titleAr: titleAr.trim(),
          titleEn: titleAr.trim(),
          descriptionAr: descriptionAr?.trim() || '',
          descriptionEn: descriptionAr?.trim() || '',
          basePrice: Number(basePrice),
          baseCurrency: baseCurrency || 'SAR',
          deliveryDays: Number(deliveryDays || 3),
          isActive: true,
        };
        draft.services.push(created);
        return created;
      });
      res.status(201).json({ service });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'NOT_VERIFIED') {
        res.status(403).json({
          error: 'Mandatory verification required before publishing services',
        });
        return;
      }
      res.status(500).json({ error: 'Failed to create service' });
    }
  });

  // ---------------------------------------------------------------------------
  // ORDERS, OFFERS, AGREEMENTS, CHAT, DELIVERABLES, FUNDING & DISPUTES
  // ---------------------------------------------------------------------------
  app.get('/api/orders', requireAuth, (req: AuthRequest, res) => {
    const state = getState(initFn);
    const auth = req.authUser!;

    let visibleOrders: OrderRecord[] = [];
    if (auth.role === 'SUPER_ADMIN' || auth.role === 'MODERATOR') {
      visibleOrders = state.orders;
    } else if (auth.role === 'CLIENT') {
      visibleOrders = state.orders.filter((o) => o.clientId === auth.userId);
    } else if (auth.role === 'SPECIALIST') {
      const spec = state.specialists.find((s) => s.userId === auth.userId);
      visibleOrders = state.orders.filter(
        (o) =>
          o.assignedSpecialistId === spec?.id ||
          o.status === 'OPEN_FOR_OFFERS' ||
          o.status === 'OFFERS_RECEIVED',
      );
    }

    const enriched = visibleOrders.map((o) => ({
      ...o,
      offers: state.offers.filter((off) => off.orderId === o.id),
      agreement: state.agreements.find((a) => a.orderId === o.id) || null,
      deliverables: state.deliverables.filter((d) => d.orderId === o.id),
      messages: state.messages.filter((m) => m.orderId === o.id),
      paymentIntents: state.paymentIntents.filter((p) => p.orderId === o.id),
      dispute: state.disputes.find((d) => d.orderId === o.id) || null,
      review: state.reviews.find((r) => r.orderId === o.id) || null,
    }));

    res.json({ orders: enriched });
  });

  app.post('/api/orders', requireAuth, requireRole('CLIENT'), async (req: AuthRequest, res) => {
    const {
      categoryId,
      serviceId,
      targetSpecialistId,
      title,
      description,
      deliverablesSpec,
      displayCurrency,
      budgetMin,
      budgetMax,
      deadlineAt,
      academicIntegrityAccepted,
    } = req.body as {
      categoryId?: string;
      serviceId?: string;
      targetSpecialistId?: string;
      title?: string;
      description?: string;
      deliverablesSpec?: string;
      displayCurrency?: SupportedCurrency;
      budgetMin?: number;
      budgetMax?: number;
      deadlineAt?: string;
      academicIntegrityAccepted?: boolean;
    };

    if (!academicIntegrityAccepted) {
      res.status(400).json({ error: 'Academic integrity pledge must be accepted' });
      return;
    }
    if (!categoryId || !title?.trim() || !description?.trim()) {
      res.status(400).json({ error: 'Category, title, and description are required' });
      return;
    }

    const integrityFlagged = containsIntegrityViolation(`${title} ${description}`);
    if (integrityFlagged) {
      res.status(422).json({
        error:
          'Request rejected by Academic Integrity Policy: cheating, live exam solving, or credential forgery is strictly prohibited.',
      });
      return;
    }

    const order = await withTransaction(initFn, (draft) => {
      const now = new Date().toISOString();
      const targetSpec = targetSpecialistId
        ? draft.specialists.find((s) => s.id === targetSpecialistId && s.verificationStatus === 'VERIFIED')
        : null;

      const orderNumber = `WST-2026-${String(draft.orders.length + 1).padStart(4, '0')}`;
      const created: OrderRecord = {
        id: `ord-${crypto.randomUUID().slice(0, 8)}`,
        orderNumber,
        clientId: req.authUser!.userId,
        clientName: req.authUser!.name,
        assignedSpecialistId: targetSpec ? targetSpec.id : null,
        assignedSpecialistName: targetSpec?.displayName,
        categoryId,
        serviceId: serviceId || null,
        title: title.trim(),
        description: description.trim(),
        deliverablesSpec: deliverablesSpec?.trim() || 'تسليم المخرجات الموصوفة بصيغة رقمية موثقة',
        status: 'OPEN_FOR_OFFERS',
        displayCurrency: displayCurrency || 'SAR',
        budgetMin: Number(budgetMin || 100),
        budgetMax: Number(budgetMax || 500),
        deadlineAt: deadlineAt || new Date(Date.now() + 7 * 86400000).toISOString(),
        academicIntegrityAcceptedAt: now,
        integrityFlagged: false,
        createdAt: now,
        updatedAt: now,
      };
      draft.orders.unshift(created);
      appendAudit(
        draft,
        req.authUser!.userId,
        'CLIENT',
        'ORDER_CREATED',
        'ORDER',
        created.id,
        `إنشاء طلب جديد ${created.orderNumber}`,
      );
      return created;
    });

    res.status(201).json({ order });
  });

  app.post('/api/orders/:id/offers', requireAuth, requireRole('SPECIALIST'), async (req: AuthRequest, res) => {
    const orderId = req.params.id;
    const { amount, currency, deliveryDays, revisionsIncluded, proposalText } = req.body as {
      amount?: number;
      currency?: SupportedCurrency;
      deliveryDays?: number;
      revisionsIncluded?: number;
      proposalText?: string;
    };

    if (!amount || amount <= 0 || !proposalText?.trim()) {
      res.status(400).json({ error: 'Positive offer amount and proposal text are required' });
      return;
    }

    try {
      const offer = await withTransaction(initFn, (draft) => {
        const spec = draft.specialists.find((s) => s.userId === req.authUser!.userId);
        if (!spec || spec.verificationStatus !== 'VERIFIED') {
          throw new Error('VERIFICATION_REQUIRED');
        }
        const order = draft.orders.find((o) => o.id === orderId);
        if (!order) throw new Error('ORDER_NOT_FOUND');
        if (order.clientId === req.authUser!.userId) {
          throw new Error('SELF_BID_FORBIDDEN');
        }
        if (order.status !== 'OPEN_FOR_OFFERS' && order.status !== 'OFFERS_RECEIVED') {
          throw new Error('ORDER_NOT_OPEN');
        }

        const created = {
          id: `off-${crypto.randomUUID().slice(0, 8)}`,
          orderId,
          specialistId: spec.id,
          specialistName: spec.displayName,
          specialistRefCode: spec.credentialRefCode,
          amount: Number(amount),
          currency: currency || order.displayCurrency,
          deliveryDays: Number(deliveryDays || 3),
          revisionsIncluded: Number(revisionsIncluded ?? 2),
          proposalText: proposalText.trim(),
          status: 'PENDING' as const,
          createdAt: new Date().toISOString(),
        };
        draft.offers.push(created);
        order.status = 'OFFERS_RECEIVED';
        order.updatedAt = new Date().toISOString();
        return created;
      });
      res.status(201).json({ offer });
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'VERIFICATION_REQUIRED') {
        res.status(403).json({ error: 'Specialist verification is mandatory before submitting offers' });
        return;
      }
      if (code === 'SELF_BID_FORBIDDEN') {
        res.status(403).json({ error: 'Cannot submit an offer on your own order' });
        return;
      }
      if (code === 'ORDER_NOT_OPEN') {
        res.status(409).json({ error: 'Order is no longer accepting offers' });
        return;
      }
      res.status(404).json({ error: 'Order not found' });
    }
  });

  app.post('/api/orders/:id/select-offer', requireAuth, requireRole('CLIENT'), async (req: AuthRequest, res) => {
    const orderId = req.params.id;
    const { offerId } = req.body as { offerId?: string };
    if (!offerId) {
      res.status(400).json({ error: 'offerId is required' });
      return;
    }

    try {
      const result = await withTransaction(initFn, (draft) => {
        const order = draft.orders.find((o) => o.id === orderId && o.clientId === req.authUser!.userId);
        if (!order) throw new Error('ORDER_NOT_FOUND');

        const chosen = draft.offers.find((off) => off.id === offerId && off.orderId === orderId);
        if (!chosen) throw new Error('OFFER_NOT_FOUND');

        for (const off of draft.offers.filter((x) => x.orderId === orderId)) {
          off.status = off.id === offerId ? 'ACCEPTED' : 'REJECTED';
        }

        const now = new Date().toISOString();
        order.assignedSpecialistId = chosen.specialistId;
        order.assignedSpecialistName = chosen.specialistName;
        order.status = 'AWAITING_PAYMENT';
        order.updatedAt = now;

        const fxRate = draft.settings.fxRatesFromUsd[chosen.currency] || 1;
        const agreement = {
          id: `agr-${crypto.randomUUID().slice(0, 8)}`,
          orderId: order.id,
          offerId: chosen.id,
          agreedAmount: chosen.amount,
          agreedCurrency: chosen.currency,
          settlementCurrency: chosen.currency,
          lockedFxRate: fxRate,
          fxLockedAt: now,
          scopeSummary: `${order.title} — ${order.deliverablesSpec}`,
          revisionsIncluded: chosen.revisionsIncluded,
          deliveryDays: chosen.deliveryDays,
          clientAcceptedAt: now,
          specialistAcceptedAt: now,
          agreementHash: crypto
            .createHash('sha256')
            .update(`${order.id}:${chosen.id}:${chosen.amount}:${chosen.currency}:${now}`)
            .digest('hex')
            .slice(0, 24)
            .toUpperCase(),
        };
        draft.agreements.push(agreement);

        appendAudit(
          draft,
          req.authUser!.userId,
          'CLIENT',
          'AGREEMENT_LOCKED',
          'ORDER',
          order.id,
          `اعتماد العرض وتوثيق الاتفاقية الرقمية للطلب ${order.orderNumber}`,
        );
        return { order, agreement };
      });
      res.json(result);
    } catch {
      res.status(400).json({ error: 'Unable to select offer and lock agreement' });
    }
  });

  app.post('/api/orders/:id/fund', requireAuth, requireRole('CLIENT'), async (req: AuthRequest, res) => {
    const orderId = req.params.id;
    const { provider, paymentCurrency, txHash, confirmationsCount, idempotencyKey } = req.body as {
      provider?: 'PSP_CARD_MADA' | 'PSP_BANK_TRANSFER' | 'USDT_TRC20';
      paymentCurrency?: SupportedCurrency;
      txHash?: string;
      confirmationsCount?: number;
      idempotencyKey?: string;
    };

    try {
      const result = await withTransaction(initFn, (draft) => {
        const order = draft.orders.find((o) => o.id === orderId && o.clientId === req.authUser!.userId);
        if (!order) throw new Error('ORDER_NOT_FOUND');
        if (order.status !== 'AWAITING_PAYMENT') {
          throw new Error('INVALID_STATE');
        }
        const agreement = draft.agreements.find((a) => a.orderId === order.id);
        if (!agreement) throw new Error('NO_AGREEMENT');

        const selectedProvider = provider || 'PSP_CARD_MADA';
        const targetCurrency: SupportedCurrency =
          selectedProvider === 'USDT_TRC20' ? 'USDT' : paymentCurrency || agreement.agreedCurrency;

        if (selectedProvider === 'USDT_TRC20') {
          const conf = Number(confirmationsCount || 0);
          if (!txHash || txHash.trim().length < 12) {
            throw new Error('USDT_TX_HASH_REQUIRED');
          }
          if (conf < draft.settings.usdtMinConfirmations) {
            throw new Error('USDT_CONFIRMATIONS_INSUFFICIENT');
          }
        }

        // Convert agreed amount into settlement payment currency using locked FX rates
        const agreedRate = draft.settings.fxRatesFromUsd[agreement.agreedCurrency] || 1;
        const payRate = draft.settings.fxRatesFromUsd[targetCurrency] || 1;
        const amountInUsd = agreement.agreedAmount / agreedRate;
        const expectedAmount = Number((amountInUsd * payRate).toFixed(2));

        const key = idempotencyKey || `fund-${order.id}-${agreement.id}`;
        const existingIntent = draft.paymentIntents.find((p) => p.idempotencyKey === key);
        if (existingIntent) {
          return { order, paymentIntent: existingIntent };
        }

        const intent = {
          id: `pay-${crypto.randomUUID().slice(0, 8)}`,
          orderId: order.id,
          payerId: req.authUser!.userId,
          provider: selectedProvider,
          providerRef:
            selectedProvider === 'USDT_TRC20'
              ? txHash!.trim()
              : `${selectedProvider}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          expectedAmount,
          paymentCurrency: targetCurrency,
          lockedFxRate: Number((payRate / agreedRate).toFixed(6)),
          cryptoNetwork: selectedProvider === 'USDT_TRC20' ? draft.settings.usdtNetwork : undefined,
          depositAddress:
            selectedProvider === 'USDT_TRC20'
              ? `T${crypto.createHash('sha256').update(order.id).digest('hex').slice(0, 33).toUpperCase()}`
              : undefined,
          txHash: selectedProvider === 'USDT_TRC20' ? txHash?.trim() : undefined,
          confirmationsCount:
            selectedProvider === 'USDT_TRC20' ? Number(confirmationsCount) : undefined,
          status: 'CONFIRMED' as const,
          idempotencyKey: key,
          createdAt: new Date().toISOString(),
        };
        draft.paymentIntents.push(intent);

        // Update agreement settlement currency & rate
        agreement.settlementCurrency = targetCurrency;
        agreement.lockedFxRate = intent.lockedFxRate;

        // Post balanced Double-Entry Ledger entry: DR 1010 PSP Clearing / CR 2020 Held Order Funds
        postJournalEntry(draft, {
          referenceType: 'PAYMENT',
          referenceId: order.id,
          description: `تأكيد دفع وتمويل الطلب ${order.orderNumber} عبر ${selectedProvider}`,
          currency: targetCurrency,
          idempotencyKey: `je-${key}`,
          createdBy: req.authUser!.userId,
          lines: [
            { accountCode: '1010', ownerUserId: null, direction: 'DEBIT', amount: expectedAmount },
            { accountCode: '2020', ownerUserId: null, direction: 'CREDIT', amount: expectedAmount },
          ],
        });

        order.status = 'FUNDED_HELD';
        order.updatedAt = new Date().toISOString();
        appendAudit(
          draft,
          req.authUser!.userId,
          'CLIENT',
          'ORDER_FUNDED_HELD',
          'ORDER',
          order.id,
          `حجز مبلغ ${expectedAmount} ${targetCurrency} للطلب ${order.orderNumber}`,
        );
        return { order, paymentIntent: intent };
      });
      res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Funding failed';
      if (msg === 'USDT_TX_HASH_REQUIRED') {
        res.status(400).json({ error: 'Valid TRC-20 transaction hash is required for USDT' });
        return;
      }
      if (msg === 'USDT_CONFIRMATIONS_INSUFFICIENT') {
        res.status(400).json({
          error: 'At least 20 blockchain confirmations are required before confirming USDT payment',
        });
        return;
      }
      res.status(400).json({ error: msg });
    }
  });

  app.post('/api/orders/:id/start', requireAuth, requireRole('SPECIALIST'), async (req: AuthRequest, res) => {
    const orderId = req.params.id;
    try {
      const order = await withTransaction(initFn, (draft) => {
        const spec = draft.specialists.find((s) => s.userId === req.authUser!.userId);
        const ord = draft.orders.find((o) => o.id === orderId && o.assignedSpecialistId === spec?.id);
        if (!ord || ord.status !== 'FUNDED_HELD') throw new Error('INVALID_STATE');
        ord.status = 'IN_PROGRESS';
        ord.updatedAt = new Date().toISOString();
        return ord;
      });
      res.json({ order });
    } catch {
      res.status(400).json({ error: 'Order must be FUNDED_HELD by assigned specialist' });
    }
  });

  app.post('/api/orders/:id/deliver', requireAuth, requireRole('SPECIALIST'), async (req: AuthRequest, res) => {
    const orderId = req.params.id;
    const { notes, attachmentName } = req.body as { notes?: string; attachmentName?: string };
    if (!notes?.trim() || !attachmentName?.trim()) {
      res.status(400).json({ error: 'Delivery notes and attachment name are required' });
      return;
    }

    try {
      const result = await withTransaction(initFn, (draft) => {
        const spec = draft.specialists.find((s) => s.userId === req.authUser!.userId);
        const ord = draft.orders.find((o) => o.id === orderId && o.assignedSpecialistId === spec?.id);
        if (
          !ord ||
          !['FUNDED_HELD', 'IN_PROGRESS', 'REVISION_REQUESTED'].includes(ord.status)
        ) {
          throw new Error('INVALID_STATE');
        }

        const existingCount = draft.deliverables.filter((d) => d.orderId === ord.id).length;
        const now = new Date().toISOString();
        const deliverable = {
          id: `del-${crypto.randomUUID().slice(0, 8)}`,
          orderId: ord.id,
          submittedBy: req.authUser!.userId,
          versionNo: existingCount + 1,
          notes: notes.trim(),
          attachmentName: attachmentName.trim(),
          status: 'SUBMITTED' as const,
          reviewDeadlineAt: new Date(
            Date.now() + draft.settings.reviewWindowHours * 3600000,
          ).toISOString(),
          createdAt: now,
        };
        draft.deliverables.push(deliverable);
        ord.status = 'PENDING_CLIENT_REVIEW';
        ord.updatedAt = now;
        return { order: ord, deliverable };
      });
      res.status(201).json(result);
    } catch {
      res.status(400).json({ error: 'Cannot submit deliverable in current state' });
    }
  });

  app.post('/api/orders/:id/request-revision', requireAuth, requireRole('CLIENT'), async (req: AuthRequest, res) => {
    const orderId = req.params.id;
    const { reason } = req.body as { reason?: string };

    try {
      const order = await withTransaction(initFn, (draft) => {
        const ord = draft.orders.find((o) => o.id === orderId && o.clientId === req.authUser!.userId);
        if (!ord || ord.status !== 'PENDING_CLIENT_REVIEW') throw new Error('INVALID_STATE');
        const latestDel = draft.deliverables.filter((d) => d.orderId === ord.id).at(-1);
        if (latestDel) {
          latestDel.status = 'REVISION_REQUESTED';
        }
        ord.status = 'REVISION_REQUESTED';
        ord.updatedAt = new Date().toISOString();
        if (reason?.trim()) {
          draft.messages.push({
            id: `msg-${crypto.randomUUID().slice(0, 8)}`,
            orderId: ord.id,
            senderId: req.authUser!.userId,
            senderName: req.authUser!.name,
            senderRole: 'CLIENT',
            body: `طلب تعديل ضمن الاتفاقية: ${reason.trim()}`,
            hasBlockedPii: false,
            createdAt: new Date().toISOString(),
          });
        }
        return ord;
      });
      res.json({ order });
    } catch {
      res.status(400).json({ error: 'Revision can only be requested during client review' });
    }
  });

  app.post('/api/orders/:id/complete', requireAuth, requireRole('CLIENT'), async (req: AuthRequest, res) => {
    const orderId = req.params.id;
    try {
      const result = await withTransaction(initFn, (draft) => {
        const ord = draft.orders.find((o) => o.id === orderId && o.clientId === req.authUser!.userId);
        if (!ord || !['PENDING_CLIENT_REVIEW', 'DELIVERED'].includes(ord.status)) {
          throw new Error('INVALID_STATE');
        }
        const payment = draft.paymentIntents.find(
          (p) => p.orderId === ord.id && p.status === 'CONFIRMED',
        );
        if (!payment) throw new Error('NO_CONFIRMED_PAYMENT');
        const spec = draft.specialists.find((s) => s.id === ord.assignedSpecialistId);
        if (!spec) throw new Error('NO_SPECIALIST');

        const latestDel = draft.deliverables.filter((d) => d.orderId === ord.id).at(-1);
        if (latestDel) latestDel.status = 'ACCEPTED';

        const total = payment.expectedAmount;
        const commission = Number(
          ((total * draft.settings.commissionRatePct) / 100).toFixed(2),
        );
        const specialistShare = Number((total - commission).toFixed(2));

        postJournalEntry(draft, {
          referenceType: 'RELEASE',
          referenceId: ord.id,
          description: `إتمام الطلب ${ord.orderNumber} وتحرير مستحقات المختص وعمولة المنصة`,
          currency: payment.paymentCurrency,
          idempotencyKey: `je-complete-${ord.id}`,
          createdBy: req.authUser!.userId,
          lines: [
            { accountCode: '2020', ownerUserId: null, direction: 'DEBIT', amount: total },
            {
              accountCode: '2030',
              ownerUserId: spec.userId,
              direction: 'CREDIT',
              amount: specialistShare,
            },
            { accountCode: '4010', ownerUserId: null, direction: 'CREDIT', amount: commission },
          ],
        });

        ord.status = 'COMPLETED';
        ord.updatedAt = new Date().toISOString();
        spec.completedOrdersCount += 1;

        appendAudit(
          draft,
          req.authUser!.userId,
          'CLIENT',
          'ORDER_COMPLETED_RELEASED',
          'ORDER',
          ord.id,
          `اعتماد الإنجاز وتحرير ${specialistShare} ${payment.paymentCurrency} للمختص`,
        );

        return { order: ord };
      });
      res.json(result);
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Cannot complete order' });
    }
  });

  app.post('/api/orders/:id/messages', requireAuth, async (req: AuthRequest, res) => {
    const orderId = req.params.id;
    const { body, attachmentName } = req.body as { body?: string; attachmentName?: string };
    if (!body?.trim() && !attachmentName?.trim()) {
      res.status(400).json({ error: 'Message body or attachment is required' });
      return;
    }

    try {
      const msg = await withTransaction(initFn, (draft) => {
        const ord = draft.orders.find((o) => o.id === orderId);
        if (!ord) throw new Error('ORDER_NOT_FOUND');

        const auth = req.authUser!;
        const spec = draft.specialists.find((s) => s.userId === auth.userId);
        const isParticipant =
          ord.clientId === auth.userId ||
          (spec && ord.assignedSpecialistId === spec.id) ||
          (spec && (ord.status === 'OPEN_FOR_OFFERS' || ord.status === 'OFFERS_RECEIVED')) ||
          auth.role === 'MODERATOR' ||
          auth.role === 'SUPER_ADMIN';

        if (!isParticipant) throw new Error('FORBIDDEN');

        const isFunded = ![
          'NEW',
          'OPEN_FOR_OFFERS',
          'OFFERS_RECEIVED',
          'SPECIALIST_SELECTED',
          'AWAITING_PAYMENT',
        ].includes(ord.status);

        const rawText = (body || '').trim();
        const { sanitized, masked } = isFunded
          ? { sanitized: rawText, masked: false }
          : maskPiiForPreFundedChat(rawText);

        const created = {
          id: `msg-${crypto.randomUUID().slice(0, 8)}`,
          orderId: ord.id,
          senderId: auth.userId,
          senderName: auth.name,
          senderRole: auth.role,
          body: sanitized,
          hasBlockedPii: masked,
          attachmentName: attachmentName?.trim() || undefined,
          attachmentScanStatus: attachmentName?.trim() ? ('CLEAN' as const) : undefined,
          createdAt: new Date().toISOString(),
        };
        draft.messages.push(created);
        return created;
      });
      res.status(201).json({ message: msg });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'FORBIDDEN') {
        res.status(403).json({ error: 'Not authorized to message on this order' });
        return;
      }
      res.status(404).json({ error: 'Order not found' });
    }
  });

  app.post('/api/orders/:id/dispute', requireAuth, async (req: AuthRequest, res) => {
    const orderId = req.params.id;
    const { reasonCode, statement } = req.body as { reasonCode?: string; statement?: string };
    if (!reasonCode?.trim() || !statement?.trim()) {
      res.status(400).json({ error: 'Reason and detailed statement are required' });
      return;
    }

    try {
      const dispute = await withTransaction(initFn, (draft) => {
        const ord = draft.orders.find((o) => o.id === orderId);
        if (!ord) throw new Error('ORDER_NOT_FOUND');

        const auth = req.authUser!;
        const spec = draft.specialists.find((s) => s.userId === auth.userId);
        const isParty = ord.clientId === auth.userId || (spec && ord.assignedSpecialistId === spec.id);
        if (!isParty) throw new Error('FORBIDDEN');

        if (!['FUNDED_HELD', 'IN_PROGRESS', 'DELIVERED', 'PENDING_CLIENT_REVIEW', 'REVISION_REQUESTED'].includes(ord.status)) {
          throw new Error('INVALID_STATE');
        }

        const now = new Date().toISOString();
        ord.status = 'DISPUTED';
        ord.updatedAt = now;

        const created = {
          id: `dsp-${crypto.randomUUID().slice(0, 8)}`,
          orderId: ord.id,
          openedBy: auth.userId,
          openedByRole: auth.role,
          reasonCode: reasonCode.trim(),
          statement: statement.trim(),
          status: 'UNDER_ARBITRATION' as const,
          createdAt: now,
          updatedAt: now,
        };
        draft.disputes.push(created);

        appendAudit(
          draft,
          auth.userId,
          auth.role,
          'DISPUTE_OPENED_FUNDS_FROZEN',
          'DISPUTE',
          created.id,
          `فتح نزاع على الطلب ${ord.orderNumber} وتجميد تحرير الأموال تلقائياً`,
        );
        return created;
      });
      res.status(201).json({ dispute });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to open dispute' });
    }
  });

  app.post('/api/orders/:id/review', requireAuth, requireRole('CLIENT'), async (req: AuthRequest, res) => {
    const orderId = req.params.id;
    const { ratingOverall, ratingQuality, ratingTimeliness, ratingCommunication, comment } =
      req.body as {
        ratingOverall?: number;
        ratingQuality?: number;
        ratingTimeliness?: number;
        ratingCommunication?: number;
        comment?: string;
      };

    if (!ratingOverall || ratingOverall < 1 || ratingOverall > 5 || !comment?.trim()) {
      res.status(400).json({ error: 'Valid rating (1-5) and comment are required' });
      return;
    }

    try {
      const review = await withTransaction(initFn, (draft) => {
        const ord = draft.orders.find((o) => o.id === orderId && o.clientId === req.authUser!.userId);
        if (!ord || ord.status !== 'COMPLETED') throw new Error('ONLY_COMPLETED_ALLOWED');
        if (draft.reviews.some((r) => r.orderId === ord.id)) throw new Error('ALREADY_REVIEWED');
        const spec = draft.specialists.find((s) => s.id === ord.assignedSpecialistId);
        if (!spec) throw new Error('NO_SPEC');

        const created = {
          id: `rev-${crypto.randomUUID().slice(0, 8)}`,
          orderId: ord.id,
          reviewerId: req.authUser!.userId,
          reviewerName: req.authUser!.name,
          specialistId: spec.id,
          ratingOverall: Number(ratingOverall),
          ratingQuality: Number(ratingQuality || ratingOverall),
          ratingTimeliness: Number(ratingTimeliness || ratingOverall),
          ratingCommunication: Number(ratingCommunication || ratingOverall),
          comment: comment.trim(),
          createdAt: new Date().toISOString(),
        };
        draft.reviews.push(created);

        const specReviews = draft.reviews.filter((r) => r.specialistId === spec.id);
        const avg =
          specReviews.reduce((acc, r) => acc + r.ratingOverall, 0) / specReviews.length;
        spec.avgRating = Number(avg.toFixed(2));
        return created;
      });
      res.status(201).json({ review });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to post review' });
    }
  });

  // Specialist payout request
  app.post('/api/specialist/payouts', requireAuth, requireRole('SPECIALIST'), async (req: AuthRequest, res) => {
    const { amount, currency, destinationType, destinationValue } = req.body as {
      amount?: number;
      currency?: SupportedCurrency;
      destinationType?: 'BANK_IBAN' | 'USDT_TRC20_WALLET';
      destinationValue?: string;
    };

    if (!amount || amount <= 0 || !currency || !destinationValue?.trim()) {
      res.status(400).json({ error: 'Valid amount, currency, and destination are required' });
      return;
    }

    try {
      const payout = await withTransaction(initFn, (draft) => {
        const spec = draft.specialists.find((s) => s.userId === req.authUser!.userId);
        if (!spec || spec.verificationStatus !== 'VERIFIED') {
          throw new Error('SPEC_NOT_VERIFIED');
        }
        const available = getSpecialistAvailableDue(draft, spec.userId, currency);
        if (amount > available) {
          throw new Error('INSUFFICIENT_DUE_BALANCE');
        }
        const rawDest = destinationValue.trim();
        const masked =
          rawDest.length > 8
            ? `${rawDest.slice(0, 4)}••••${rawDest.slice(-4)}`
            : '••••';

        const created = {
          id: `pyt-${crypto.randomUUID().slice(0, 8)}`,
          specialistId: spec.id,
          specialistName: spec.displayName,
          amount: Number(amount),
          currency,
          destinationType: destinationType || 'BANK_IBAN',
          destinationMasked: masked,
          status: 'REQUESTED' as const,
          createdAt: new Date().toISOString(),
        };
        draft.payouts.unshift(created);
        return created;
      });
      res.status(201).json({ payout });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Payout request failed' });
    }
  });

  // ---------------------------------------------------------------------------
  // ADMIN & MODERATOR OPERATIONS CONSOLE
  // ---------------------------------------------------------------------------
  app.get(
    '/api/admin/overview',
    requireAuth,
    requireRole('MODERATOR', 'SUPER_ADMIN'),
    (_req, res) => {
      const state = getState(initFn);
      const trialBalance = computeTrialBalance(state);
      res.json({
        specialists: state.specialists,
        documents: state.documents,
        disputes: state.disputes,
        orders: state.orders,
        payouts: state.payouts,
        categories: state.categories,
        journalEntries: state.journalEntries.slice().reverse(),
        trialBalance,
        auditLogs: state.auditLogs.slice(0, 50),
        settings: state.settings,
      });
    },
  );

  app.post(
    '/api/admin/documents/:id/review',
    requireAuth,
    requireRole('MODERATOR', 'SUPER_ADMIN'),
    async (req: AuthRequest, res) => {
      const docId = req.params.id;
      const { status, verificationMethod, verificationSource, confidenceLevel, rejectionReason } =
        req.body as {
          status?: DocumentStatus;
          verificationMethod?: string;
          verificationSource?: string;
          confidenceLevel?: ConfidenceLevel;
          rejectionReason?: string;
        };

      if (!status) {
        res.status(400).json({ error: 'Target status is required' });
        return;
      }

      try {
        const result = await withTransaction(initFn, (draft) => {
          const doc = draft.documents.find((d) => d.id === docId);
          if (!doc) throw new Error('DOC_NOT_FOUND');
          const spec = draft.specialists.find((s) => s.id === doc.specialistId);
          if (!spec) throw new Error('SPEC_NOT_FOUND');

          const now = new Date().toISOString();
          doc.status = status;
          doc.updatedAt = now;
          doc.verifiedBy = req.authUser!.userId;

          if (status === 'VERIFIED') {
            doc.verificationMethod = verificationMethod?.trim() || 'مراجعة رسمية للمصدر';
            doc.verificationSource = verificationSource?.trim() || doc.issuingAuthority;
            doc.confidenceLevel = confidenceLevel || 'SOURCE_VERIFIED';
            doc.verifiedAt = now;
            doc.rejectionReason = undefined;
          } else if (status === 'REJECTED' || status === 'NEEDS_UPDATE' || status === 'REVOKED') {
            doc.rejectionReason = rejectionReason?.trim() || 'لم يطابق معايير التحقق المعتمدة';
          }

          // Re-evaluate specialist status
          const specDocs = draft.documents.filter((d) => d.specialistId === spec.id);
          if (status === 'REVOKED') {
            spec.verificationStatus = 'REVOKED';
            spec.revokedAt = now;
          } else if (specDocs.some((d) => d.status === 'VERIFIED')) {
            if (spec.verificationStatus !== 'REVOKED') {
              spec.verificationStatus = 'VERIFIED';
            }
          }

          appendAudit(
            draft,
            req.authUser!.userId,
            req.authUser!.role,
            `DOCUMENT_${status}`,
            'VERIFICATION_DOCUMENT',
            doc.id,
            `تحديث حالة المستند ${doc.titleAr} إلى ${status}`,
          );
          return { document: doc, specialist: spec };
        });
        res.json(result);
      } catch {
        res.status(404).json({ error: 'Document not found' });
      }
    },
  );

  app.post(
    '/api/admin/disputes/:id/resolve',
    requireAuth,
    requireRole('MODERATOR', 'SUPER_ADMIN'),
    async (req: AuthRequest, res) => {
      const disputeId = req.params.id;
      const { resolutionType, specialistSharePct, decisionSummary } = req.body as {
        resolutionType?: 'FULL_SPECIALIST' | 'FULL_REFUND' | 'PARTIAL_SPLIT';
        specialistSharePct?: number;
        decisionSummary?: string;
      };

      if (!resolutionType || !decisionSummary?.trim()) {
        res.status(400).json({ error: 'Resolution type and decision summary are required' });
        return;
      }

      try {
        const result = await withTransaction(initFn, (draft) => {
          const dispute = draft.disputes.find((d) => d.id === disputeId);
          if (!dispute || dispute.status === 'CLOSED') throw new Error('DISPUTE_NOT_OPEN');
          const ord = draft.orders.find((o) => o.id === dispute.orderId);
          if (!ord) throw new Error('ORDER_NOT_FOUND');
          const payment = draft.paymentIntents.find(
            (p) => p.orderId === ord.id && p.status === 'CONFIRMED',
          );
          if (!payment) throw new Error('PAYMENT_NOT_FOUND');
          const spec = draft.specialists.find((s) => s.id === ord.assignedSpecialistId);
          if (!spec) throw new Error('SPEC_NOT_FOUND');

          const total = payment.expectedAmount;
          const pct =
            resolutionType === 'FULL_SPECIALIST'
              ? 100
              : resolutionType === 'FULL_REFUND'
                ? 0
                : Math.min(99, Math.max(1, Number(specialistSharePct || 50)));
          const refundPct = 100 - pct;

          const lines: Array<{
            accountCode: string;
            ownerUserId?: string | null;
            direction: 'DEBIT' | 'CREDIT';
            amount: number;
          }> = [{ accountCode: '2020', ownerUserId: null, direction: 'DEBIT', amount: total }];

          const specialistGross = Number(((total * pct) / 100).toFixed(2));
          const refundAmount = Number((total - specialistGross).toFixed(2));

          if (specialistGross > 0) {
            const commission = Number(
              ((specialistGross * draft.settings.commissionRatePct) / 100).toFixed(2),
            );
            const specialistNet = Number((specialistGross - commission).toFixed(2));
            if (specialistNet > 0) {
              lines.push({
                accountCode: '2030',
                ownerUserId: spec.userId,
                direction: 'CREDIT',
                amount: specialistNet,
              });
            }
            if (commission > 0) {
              lines.push({
                accountCode: '4010',
                ownerUserId: null,
                direction: 'CREDIT',
                amount: commission,
              });
            }
          }
          if (refundAmount > 0) {
            lines.push({
              accountCode: '2040',
              ownerUserId: ord.clientId,
              direction: 'CREDIT',
              amount: refundAmount,
            });
          }

          postJournalEntry(draft, {
            referenceType: resolutionType === 'FULL_REFUND' ? 'REFUND' : 'DISPUTE_SPLIT',
            referenceId: ord.id,
            description: `قرار تحكيم النزاع للطلب ${ord.orderNumber} (${resolutionType})`,
            currency: payment.paymentCurrency,
            idempotencyKey: `je-dispute-${dispute.id}`,
            createdBy: req.authUser!.userId,
            lines,
          });

          const now = new Date().toISOString();
          dispute.status = 'CLOSED';
          dispute.resolutionType = resolutionType;
          dispute.specialistSharePct = pct;
          dispute.clientRefundPct = refundPct;
          dispute.decisionSummary = decisionSummary.trim();
          dispute.resolvedBy = req.authUser!.userId;
          dispute.updatedAt = now;

          ord.status = resolutionType === 'FULL_REFUND' ? 'REFUNDED' : 'COMPLETED';
          ord.updatedAt = now;

          appendAudit(
            draft,
            req.authUser!.userId,
            req.authUser!.role,
            'DISPUTE_RESOLVED',
            'DISPUTE',
            dispute.id,
            `إغلاق النزاع للطلب ${ord.orderNumber}: ${pct}% للمختص / ${refundPct}% استرداد للعميل`,
          );

          return { dispute, order: ord };
        });
        res.json(result);
      } catch (err: unknown) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to resolve dispute' });
      }
    },
  );

  app.post(
    '/api/admin/payouts/:id/approve',
    requireAuth,
    requireRole('SUPER_ADMIN'),
    async (req: AuthRequest, res) => {
      const payoutId = req.params.id;
      try {
        const payout = await withTransaction(initFn, (draft) => {
          const pyt = draft.payouts.find((p) => p.id === payoutId);
          if (!pyt || pyt.status !== 'REQUESTED') throw new Error('INVALID_PAYOUT');
          const spec = draft.specialists.find((s) => s.id === pyt.specialistId);
          if (!spec) throw new Error('SPEC_NOT_FOUND');

          const available = getSpecialistAvailableDue(draft, spec.userId, pyt.currency);
          if (pyt.amount > available) throw new Error('INSUFFICIENT_DUE');

          const je = postJournalEntry(draft, {
            referenceType: 'PAYOUT',
            referenceId: pyt.id,
            description: `صرف مستحقات المختص ${pyt.specialistName} (${pyt.destinationMasked})`,
            currency: pyt.currency,
            idempotencyKey: `je-payout-${pyt.id}`,
            createdBy: req.authUser!.userId,
            lines: [
              { accountCode: '2030', ownerUserId: spec.userId, direction: 'DEBIT', amount: pyt.amount },
              { accountCode: '1010', ownerUserId: null, direction: 'CREDIT', amount: pyt.amount },
            ],
          });

          pyt.status = 'PAID';
          pyt.approvedBy = req.authUser!.userId;
          pyt.ledgerEntryId = je.id;

          appendAudit(
            draft,
            req.authUser!.userId,
            'SUPER_ADMIN',
            'PAYOUT_APPROVED',
            'PAYOUT',
            pyt.id,
            `صرف ${pyt.amount} ${pyt.currency} للمختص ${pyt.specialistName}`,
          );
          return pyt;
        });
        res.json({ payout });
      } catch (err: unknown) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to approve payout' });
      }
    },
  );

  app.post(
    '/api/admin/categories',
    requireAuth,
    requireRole('SUPER_ADMIN'),
    async (req: AuthRequest, res) => {
      const { nameAr, nameEn, requiresVerifiedDegree, integrityNoticeAr } = req.body as {
        nameAr?: string;
        nameEn?: string;
        requiresVerifiedDegree?: boolean;
        integrityNoticeAr?: string;
      };
      if (!nameAr?.trim() || !nameEn?.trim()) {
        res.status(400).json({ error: 'Arabic and English category names are required' });
        return;
      }

      const category = await withTransaction(initFn, (draft) => {
        const created = {
          id: `cat-${crypto.randomUUID().slice(0, 6)}`,
          parentId: null,
          slug: nameEn.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          nameAr: nameAr.trim(),
          nameEn: nameEn.trim(),
          requiresVerifiedDegree: Boolean(requiresVerifiedDegree),
          integrityNoticeAr:
            integrityNoticeAr?.trim() || 'الالتزام بضوابط النزاهة المهنية والأكاديمية.',
          integrityNoticeEn: 'Strict professional and academic integrity required.',
          isActive: true,
        };
        draft.categories.push(created);
        appendAudit(
          draft,
          req.authUser!.userId,
          'SUPER_ADMIN',
          'CATEGORY_ADDED',
          'CATEGORY',
          created.id,
          `إضافة تصنيف خدمة جديد: ${created.nameAr}`,
        );
        return created;
      });
      res.status(201).json({ category });
    },
  );

  // Vite or production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`wseet server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start wseet server:', err);
  process.exit(1);
});
