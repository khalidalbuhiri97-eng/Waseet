import fs from 'node:fs';
import path from 'node:path';
import type {
  AuditLogRecord,
  CategoryRecord,
  DisputeRecord,
  LedgerAccount,
  LedgerJournalEntry,
  OrderAgreement,
  OrderDeliverable,
  OrderMessage,
  OrderOffer,
  OrderRecord,
  PaymentIntentRecord,
  PayoutRequest,
  PlatformSettings,
  ReviewRecord,
  SpecialistProfile,
  SpecialistService,
  UserRecord,
  VerificationDocument,
} from '../src/shared/types.ts';

export interface DatabaseState {
  adminCredentialHash: string | null;
  users: UserRecord[];
  specialists: SpecialistProfile[];
  documents: VerificationDocument[];
  categories: CategoryRecord[];
  services: SpecialistService[];
  orders: OrderRecord[];
  offers: OrderOffer[];
  agreements: OrderAgreement[];
  deliverables: OrderDeliverable[];
  messages: OrderMessage[];
  paymentIntents: PaymentIntentRecord[];
  ledgerAccounts: LedgerAccount[];
  journalEntries: LedgerJournalEntry[];
  payouts: PayoutRequest[];
  disputes: DisputeRecord[];
  reviews: ReviewRecord[];
  auditLogs: AuditLogRecord[];
  settings: PlatformSettings;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.resolve(DATA_DIR, 'wseet-store.json');

let stateCache: DatabaseState | null = null;
let mutexChain: Promise<unknown> = Promise.resolve();

export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadStateFromDisk(): DatabaseState | null {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    return null;
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(raw) as DatabaseState;
}

export function saveStateAtomic(nextState: DatabaseState): void {
  ensureDataDir();
  const tmpPath = `${DB_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(nextState, null, 2), 'utf8');
  fs.renameSync(tmpPath, DB_PATH);
  stateCache = nextState;
}

export function getState(initializer: () => DatabaseState): DatabaseState {
  if (stateCache) {
    return stateCache;
  }
  const loaded = loadStateFromDisk();
  if (loaded) {
    stateCache = loaded;
    return stateCache;
  }
  const seeded = initializer();
  saveStateAtomic(seeded);
  return seeded;
}

export async function withTransaction<T>(
  initializer: () => DatabaseState,
  fn: (draft: DatabaseState) => T | Promise<T>,
): Promise<T> {
  const run = async (): Promise<T> => {
    const current = getState(initializer);
    const draft = structuredClone(current);
    const result = await fn(draft);
    saveStateAtomic(draft);
    return result;
  };
  const next = mutexChain.then(run, run);
  mutexChain = next.catch(() => undefined);
  return next;
}
