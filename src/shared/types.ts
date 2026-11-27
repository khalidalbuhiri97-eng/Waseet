export type UserRole = 'CLIENT' | 'SPECIALIST' | 'MODERATOR' | 'SUPER_ADMIN';

export type SupportedCurrency = 'SAR' | 'USD' | 'USDT';

export type DocumentType =
  | 'NATIONAL_ID'
  | 'DEGREE'
  | 'PRO_CERT'
  | 'EXPERIENCE'
  | 'PORTFOLIO';

export type DocumentStatus =
  | 'UPLOADED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'NEEDS_UPDATE'
  | 'REVOKED';

export type ConfidenceLevel = 'SOURCE_VERIFIED' | 'DOCUMENT_VERIFIED' | 'HIGH' | 'STANDARD';

export type SpecialistVerificationStatus =
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'SUSPENDED'
  | 'REVOKED';

export type OrderStatus =
  | 'NEW'
  | 'OPEN_FOR_OFFERS'
  | 'OFFERS_RECEIVED'
  | 'SPECIALIST_SELECTED'
  | 'AWAITING_PAYMENT'
  | 'FUNDED_HELD'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'PENDING_CLIENT_REVIEW'
  | 'REVISION_REQUESTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED'
  | 'REFUNDED';

export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export type LedgerAccountType = 'ASSET' | 'LIABILITY' | 'REVENUE' | 'EXPENSE';

export type LedgerBucketCategory =
  | 'PSP_CLEARING'
  | 'CLIENT_FUNDS'
  | 'HELD_ORDER'
  | 'SPECIALIST_DUE'
  | 'REFUND_PAYABLE'
  | 'PLATFORM_COMMISSION'
  | 'PSP_FEES';

export type DisputeStatus =
  | 'OPENED'
  | 'NEGOTIATION'
  | 'UNDER_ARBITRATION'
  | 'DECISION_ISSUED'
  | 'APPEALED'
  | 'CLOSED';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  passwordHash: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface SpecialistProfile {
  id: string;
  userId: string;
  displayName: string;
  headlineAr: string;
  headlineEn: string;
  bioAr: string;
  bioEn: string;
  avatarUrl: string;
  primaryCategoryId: string;
  highestDegree: 'PHD' | 'MASTERS' | 'BACHELORS' | 'PRO_LICENSE';
  languages: string[];
  verificationStatus: SpecialistVerificationStatus;
  isInternalTeam: boolean;
  isAvailable: boolean;
  credentialRefCode: string;
  avgRating: number;
  weightedScore: number;
  completedOrdersCount: number;
  onTimeRate: number;
  responseTimeHours: number;
  revokedAt?: string;
}

export interface VerificationDocument {
  id: string;
  specialistId: string;
  docType: DocumentType;
  titleAr: string;
  titleEn: string;
  issuingAuthority: string;
  referenceNumber: string;
  fileName: string;
  fileSha256: string;
  status: DocumentStatus;
  verificationMethod?: string;
  verificationSource?: string;
  confidenceLevel?: ConfidenceLevel;
  rejectionReason?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRecord {
  id: string;
  parentId: string | null;
  slug: string;
  nameAr: string;
  nameEn: string;
  requiresVerifiedDegree: boolean;
  integrityNoticeAr: string;
  integrityNoticeEn: string;
  isActive: boolean;
}

export interface SpecialistService {
  id: string;
  specialistId: string;
  categoryId: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  basePrice: number;
  baseCurrency: SupportedCurrency;
  deliveryDays: number;
  isActive: boolean;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  assignedSpecialistId: string | null;
  assignedSpecialistName?: string;
  categoryId: string;
  serviceId: string | null;
  title: string;
  description: string;
  deliverablesSpec: string;
  status: OrderStatus;
  displayCurrency: SupportedCurrency;
  budgetMin: number;
  budgetMax: number;
  deadlineAt: string;
  academicIntegrityAcceptedAt: string;
  integrityFlagged: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderOffer {
  id: string;
  orderId: string;
  specialistId: string;
  specialistName: string;
  specialistRefCode: string;
  amount: number;
  currency: SupportedCurrency;
  deliveryDays: number;
  revisionsIncluded: number;
  proposalText: string;
  status: OfferStatus;
  createdAt: string;
}

export interface OrderAgreement {
  id: string;
  orderId: string;
  offerId: string;
  agreedAmount: number;
  agreedCurrency: SupportedCurrency;
  settlementCurrency: SupportedCurrency;
  lockedFxRate: number;
  fxLockedAt: string;
  scopeSummary: string;
  revisionsIncluded: number;
  deliveryDays: number;
  clientAcceptedAt: string | null;
  specialistAcceptedAt: string | null;
  agreementHash: string;
}

export interface OrderDeliverable {
  id: string;
  orderId: string;
  submittedBy: string;
  versionNo: number;
  notes: string;
  attachmentName: string;
  status: 'SUBMITTED' | 'REVISION_REQUESTED' | 'ACCEPTED';
  reviewDeadlineAt: string;
  createdAt: string;
}

export interface OrderMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  body: string;
  hasBlockedPii: boolean;
  attachmentName?: string;
  attachmentScanStatus?: 'CLEAN' | 'PENDING';
  createdAt: string;
}

export interface PaymentIntentRecord {
  id: string;
  orderId: string;
  payerId: string;
  provider: 'PSP_CARD_MADA' | 'PSP_BANK_TRANSFER' | 'USDT_TRC20';
  providerRef: string;
  expectedAmount: number;
  paymentCurrency: SupportedCurrency;
  lockedFxRate: number;
  cryptoNetwork?: string;
  depositAddress?: string;
  txHash?: string;
  confirmationsCount?: number;
  status: 'INITIATED' | 'CONFIRMED' | 'FAILED';
  idempotencyKey: string;
  createdAt: string;
}

export interface LedgerAccount {
  id: string;
  accountCode: string;
  nameAr: string;
  nameEn: string;
  ownerUserId: string | null;
  accountType: LedgerAccountType;
  bucketCategory: LedgerBucketCategory;
  currency: SupportedCurrency;
}

export interface LedgerLine {
  id: string;
  journalEntryId: string;
  ledgerAccountId: string;
  accountCode: string;
  direction: 'DEBIT' | 'CREDIT';
  amountMicros: number;
  currency: SupportedCurrency;
  createdAt: string;
}

export interface LedgerJournalEntry {
  id: string;
  entryNumber: string;
  referenceType: 'PAYMENT' | 'RELEASE' | 'REFUND' | 'PAYOUT' | 'DISPUTE_SPLIT';
  referenceId: string;
  description: string;
  currency: SupportedCurrency;
  idempotencyKey: string;
  createdBy: string | null;
  createdAt: string;
  lines: LedgerLine[];
}

export interface PayoutRequest {
  id: string;
  specialistId: string;
  specialistName: string;
  amount: number;
  currency: SupportedCurrency;
  destinationType: 'BANK_IBAN' | 'USDT_TRC20_WALLET';
  destinationMasked: string;
  status: 'REQUESTED' | 'PAID' | 'REJECTED';
  ledgerEntryId?: string;
  approvedBy?: string;
  createdAt: string;
}

export interface DisputeRecord {
  id: string;
  orderId: string;
  openedBy: string;
  openedByRole: UserRole;
  reasonCode: string;
  statement: string;
  status: DisputeStatus;
  resolutionType?: 'FULL_SPECIALIST' | 'FULL_REFUND' | 'PARTIAL_SPLIT';
  specialistSharePct?: number;
  clientRefundPct?: number;
  decisionSummary?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRecord {
  id: string;
  orderId: string;
  reviewerId: string;
  reviewerName: string;
  specialistId: string;
  ratingOverall: number;
  ratingQuality: number;
  ratingTimeliness: number;
  ratingCommunication: number;
  comment: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorId: string;
  actorRole: UserRole | 'SYSTEM';
  actionCode: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
}

export interface PlatformSettings {
  commissionRatePct: number;
  fxRatesFromUsd: Record<SupportedCurrency, number>;
  reviewWindowHours: number;
  usdtNetwork: string;
  usdtMinConfirmations: number;
}
