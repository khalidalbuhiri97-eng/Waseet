import crypto from 'node:crypto';
import type {
  LedgerAccount,
  LedgerAccountType,
  LedgerBucketCategory,
  LedgerJournalEntry,
  LedgerLine,
  SupportedCurrency,
} from '../src/shared/types.ts';
import type { DatabaseState } from './store.ts';

export const MICROS_PER_UNIT = 1_000_000;

export function toMicros(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Ledger line amount must be a positive finite number');
  }
  return Math.round(amount * MICROS_PER_UNIT);
}

export function fromMicros(micros: number): number {
  return Number((micros / MICROS_PER_UNIT).toFixed(6));
}

const ACCOUNT_META: Record<
  string,
  {
    nameAr: string;
    nameEn: string;
    accountType: LedgerAccountType;
    bucketCategory: LedgerBucketCategory;
  }
> = {
  '1010': {
    nameAr: 'النقدية لدى مزود الدفع المرخص (PSP Clearing)',
    nameEn: 'PSP Clearing / Settlement Asset',
    accountType: 'ASSET',
    bucketCategory: 'PSP_CLEARING',
  },
  '2010': {
    nameAr: 'الأموال المملوكة للعملاء (Client Funds)',
    nameEn: 'Client-Owned Funds Liability',
    accountType: 'LIABILITY',
    bucketCategory: 'CLIENT_FUNDS',
  },
  '2020': {
    nameAr: 'الأموال المحجوزة للطلبات (Held Order Funds)',
    nameEn: 'Held Order Funds Liability',
    accountType: 'LIABILITY',
    bucketCategory: 'HELD_ORDER',
  },
  '2030': {
    nameAr: 'مستحقات المختصين القابلة للتسوية (Specialist Payables)',
    nameEn: 'Specialist Payables Liability',
    accountType: 'LIABILITY',
    bucketCategory: 'SPECIALIST_DUE',
  },
  '2040': {
    nameAr: 'التزامات المبالغ المستردة (Refunds Payable)',
    nameEn: 'Refunds Payable Liability',
    accountType: 'LIABILITY',
    bucketCategory: 'REFUND_PAYABLE',
  },
  '4010': {
    nameAr: 'إيرادات عمولات المنصة (Platform Commission)',
    nameEn: 'Platform Commission Revenue',
    accountType: 'REVENUE',
    bucketCategory: 'PLATFORM_COMMISSION',
  },
  '5010': {
    nameAr: 'مصروفات بوابات الدفع وفرق الصرف',
    nameEn: 'PSP Fees & FX Variance Expense',
    accountType: 'EXPENSE',
    bucketCategory: 'PSP_FEES',
  },
};

export function ensureLedgerAccount(
  state: DatabaseState,
  accountCode: string,
  currency: SupportedCurrency,
  ownerUserId: string | null = null,
): LedgerAccount {
  const existing = state.ledgerAccounts.find(
    (acc) =>
      acc.accountCode === accountCode &&
      acc.currency === currency &&
      acc.ownerUserId === ownerUserId,
  );
  if (existing) {
    return existing;
  }

  const meta = ACCOUNT_META[accountCode];
  if (!meta) {
    throw new Error(`Unknown chart-of-accounts code: ${accountCode}`);
  }

  const created: LedgerAccount = {
    id: crypto.randomUUID(),
    accountCode,
    nameAr: meta.nameAr,
    nameEn: meta.nameEn,
    ownerUserId,
    accountType: meta.accountType,
    bucketCategory: meta.bucketCategory,
    currency,
  };
  state.ledgerAccounts.push(created);
  return created;
}

export interface PostLineInput {
  accountCode: string;
  ownerUserId?: string | null;
  direction: 'DEBIT' | 'CREDIT';
  amount: number;
}

export interface PostJournalInput {
  referenceType: LedgerJournalEntry['referenceType'];
  referenceId: string;
  description: string;
  currency: SupportedCurrency;
  idempotencyKey: string;
  createdBy: string | null;
  lines: PostLineInput[];
}

export function postJournalEntry(
  state: DatabaseState,
  input: PostJournalInput,
): LedgerJournalEntry {
  const duplicate = state.journalEntries.find(
    (entry) => entry.idempotencyKey === input.idempotencyKey,
  );
  if (duplicate) {
    return duplicate;
  }

  if (input.lines.length < 2) {
    throw new Error('Double-entry journal requires at least 2 lines');
  }

  let debitTotal = 0;
  let creditTotal = 0;
  const now = new Date().toISOString();
  const journalId = crypto.randomUUID();

  const builtLines: LedgerLine[] = input.lines.map((line) => {
    const micros = toMicros(line.amount);
    if (line.direction === 'DEBIT') {
      debitTotal += micros;
    } else {
      creditTotal += micros;
    }
    const account = ensureLedgerAccount(
      state,
      line.accountCode,
      input.currency,
      line.ownerUserId ?? null,
    );
    return {
      id: crypto.randomUUID(),
      journalEntryId: journalId,
      ledgerAccountId: account.id,
      accountCode: account.accountCode,
      direction: line.direction,
      amountMicros: micros,
      currency: input.currency,
      createdAt: now,
    };
  });

  if (debitTotal !== creditTotal) {
    throw new Error(
      `Unbalanced journal entry rejected: DEBIT(${debitTotal}) != CREDIT(${creditTotal})`,
    );
  }

  const entryNumber = `JE-${String(state.journalEntries.length + 1).padStart(6, '0')}`;
  const entry: LedgerJournalEntry = {
    id: journalId,
    entryNumber,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    description: input.description,
    currency: input.currency,
    idempotencyKey: input.idempotencyKey,
    createdBy: input.createdBy,
    createdAt: now,
    lines: builtLines,
  };

  state.journalEntries.push(entry);
  return entry;
}

export interface AccountBalanceRow {
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

export function computeTrialBalance(
  state: DatabaseState,
  ownerUserId?: string | null,
): {
  rows: AccountBalanceRow[];
  totalsByCurrency: Record<
    SupportedCurrency,
    { totalDebits: number; totalCredits: number; isBalanced: boolean }
  >;
} {
  const grouped = new Map<
    string,
    {
      accountCode: string;
      nameAr: string;
      nameEn: string;
      accountType: LedgerAccountType;
      bucketCategory: LedgerBucketCategory;
      currency: SupportedCurrency;
      debitMicros: number;
      creditMicros: number;
    }
  >();

  for (const acc of state.ledgerAccounts) {
    if (ownerUserId !== undefined && acc.ownerUserId !== ownerUserId) {
      continue;
    }
    const key = `${acc.accountCode}:${acc.currency}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        accountCode: acc.accountCode,
        nameAr: acc.nameAr,
        nameEn: acc.nameEn,
        accountType: acc.accountType,
        bucketCategory: acc.bucketCategory,
        currency: acc.currency,
        debitMicros: 0,
        creditMicros: 0,
      });
    }
  }

  const accountLookup = new Map(state.ledgerAccounts.map((a) => [a.id, a]));

  for (const je of state.journalEntries) {
    for (const line of je.lines) {
      const acc = accountLookup.get(line.ledgerAccountId);
      if (!acc) continue;
      if (ownerUserId !== undefined && acc.ownerUserId !== ownerUserId) {
        continue;
      }
      const key = `${acc.accountCode}:${line.currency}`;
      const row = grouped.get(key);
      if (!row) continue;
      if (line.direction === 'DEBIT') {
        row.debitMicros += line.amountMicros;
      } else {
        row.creditMicros += line.amountMicros;
      }
    }
  }

  const totalsMicros: Record<SupportedCurrency, { debit: number; credit: number }> = {
    SAR: { debit: 0, credit: 0 },
    USD: { debit: 0, credit: 0 },
    USDT: { debit: 0, credit: 0 },
  };

  const rows: AccountBalanceRow[] = Array.from(grouped.values())
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode) || a.currency.localeCompare(b.currency))
    .map((item) => {
      totalsMicros[item.currency].debit += item.debitMicros;
      totalsMicros[item.currency].credit += item.creditMicros;
      // Normal balance: ASSET/EXPENSE = Debit - Credit; LIABILITY/REVENUE = Credit - Debit
      const netMicros =
        item.accountType === 'ASSET' || item.accountType === 'EXPENSE'
          ? item.debitMicros - item.creditMicros
          : item.creditMicros - item.debitMicros;

      return {
        accountCode: item.accountCode,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        accountType: item.accountType,
        bucketCategory: item.bucketCategory,
        currency: item.currency,
        debitTotal: fromMicros(item.debitMicros),
        creditTotal: fromMicros(item.creditMicros),
        netBalance: fromMicros(netMicros),
      };
    });

  const totalsByCurrency: Record<
    SupportedCurrency,
    { totalDebits: number; totalCredits: number; isBalanced: boolean }
  > = {
    SAR: {
      totalDebits: fromMicros(totalsMicros.SAR.debit),
      totalCredits: fromMicros(totalsMicros.SAR.credit),
      isBalanced: totalsMicros.SAR.debit === totalsMicros.SAR.credit,
    },
    USD: {
      totalDebits: fromMicros(totalsMicros.USD.debit),
      totalCredits: fromMicros(totalsMicros.USD.credit),
      isBalanced: totalsMicros.USD.debit === totalsMicros.USD.credit,
    },
    USDT: {
      totalDebits: fromMicros(totalsMicros.USDT.debit),
      totalCredits: fromMicros(totalsMicros.USDT.credit),
      isBalanced: totalsMicros.USDT.debit === totalsMicros.USDT.credit,
    },
  };

  return { rows, totalsByCurrency };
}

export function getSpecialistAvailableDue(
  state: DatabaseState,
  specialistUserId: string,
  currency: SupportedCurrency,
): number {
  const { rows } = computeTrialBalance(state, specialistUserId);
  const dueRow = rows.find((r) => r.accountCode === '2030' && r.currency === currency);
  return dueRow ? dueRow.netBalance : 0;
}
