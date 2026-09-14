/**
 * API contract types.
 *
 * Hand-written rather than generated: the surface is small, and a hand-written
 * copy documents exactly what the UI depends on. Every monetary field is an
 * integer in minor currency units (paise) — see utils/format.ts for display.
 */

export type ProductCategory = 'TERM' | 'HEALTH' | 'VEHICLE' | 'OTHER';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type VehicleType = 'TWO_WHEELER' | 'CAR' | 'COMMERCIAL';
export type AgentRole = 'AGENT' | 'ADMIN';

export type QuotationStatus =
  | 'DRAFT'
  | 'DOCUMENT_GENERATED'
  | 'PAYMENT_PENDING'
  | 'CONVERTED'
  | 'EXPIRED';
export type PaymentStatus = 'CREATED' | 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED';
export type PolicyStatus = 'ACTIVE' | 'CANCELLED' | 'LAPSED';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AgentRole;
  createdAt: string;
}

export interface EligibilityRules {
  minAge?: number;
  maxAge?: number;
  minAnnualIncome?: number;
  maxAnnualIncome?: number;
  allowedGenders?: Gender[];
  requiresVehicle?: boolean;
  allowedVehicleTypes?: VehicleType[];
  minVehicleValue?: number;
  maxVehicleValue?: number;
  excludeSmokers?: boolean;
  excludePreExistingConditions?: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  basePremium: number;
  coverageAmount: number;
  keyBenefits: string[];
  eligibilityRules: EligibilityRules;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerVehicle {
  owns: boolean;
  type?: VehicleType;
  value?: number;
  registrationYear?: number;
}

export interface CustomerHealth {
  smoker: boolean;
  preExistingConditions: boolean;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender;
  occupation: string;
  annualIncome: number;
  city: string;
  state: string;
  postalCode: string;
  vehicle: CustomerVehicle;
  health: CustomerHealth;
  createdByAgent: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfile {
  age: number;
  gender: Gender;
  annualIncome: number;
  ownsVehicle: boolean;
  vehicleType?: VehicleType;
  vehicleValue?: number;
  smoker: boolean;
  preExistingConditions: boolean;
}

export interface EligibilityFailure {
  rule: string;
  message: string;
}

export interface EligibleProductEntry {
  product: Product;
  eligible: boolean;
  failures: EligibilityFailure[];
  quote?: { premiumAmount: number; coverageAmount: number };
}

export interface EligibleProductsResponse {
  profile: CustomerProfile;
  eligible: EligibleProductEntry[];
  ineligible: EligibleProductEntry[];
}

export interface PremiumStep {
  label: string;
  amount: number;
  detail?: string;
}

export interface Quotation {
  id: string;
  reference: string;
  customerId: string;
  productId: string;
  agentId: string;
  agentName: string;
  premiumAmount: number;
  coverageAmount: number;
  currency: string;
  premiumBreakdown: PremiumStep[];
  customerSnapshot: {
    fullName: string;
    email: string;
    phone: string;
    age: number;
    city: string;
    state: string;
  };
  productSnapshot: {
    name: string;
    category: ProductCategory;
    description: string;
    keyBenefits: string[];
  };
  /** The customer facts this quotation was priced from, frozen at quote time. */
  eligibilitySnapshot: CustomerProfile;
  status: QuotationStatus;
  isOpen: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  reference: string;
  quotationId: string;
  type: 'QUOTATION';
  version: number;
  generatedAt: string;
  expiresAt: string;
}

export interface DocumentShareResponse {
  document: DocumentRecord;
  shareUrl: string;
  whatsAppUrl: string;
  expiresAt: string;
}

export interface Payment {
  id: string;
  idempotencyKey: string;
  quotationId: string;
  quotationReference: string;
  attempt: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripeSessionId?: string;
  checkoutUrl?: string;
  checkoutExpiresAt?: string;
  paidAt?: string;
  failureReason?: string;
  createdAt: string;
}

export interface PaymentLinkResponse {
  payment: Payment;
  paymentUrl: string;
  whatsAppUrl: string;
  reused: boolean;
}

export interface Policy {
  id: string;
  policyNumber: string;
  quotationId: string;
  quotationReference: string;
  paymentId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  productCategory: ProductCategory;
  premiumAmount: number;
  coverageAmount: number;
  currency: string;
  status: PolicyStatus;
  startDate: string;
  endDate: string;
  activatedAt: string;
}

export interface DashboardStats {
  totalCustomers: number;
  activePolicies: number;
  pendingPayments: number;
  availableProducts: number;
  openQuotations: number;
  premiumWritten: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  recentPolicies: Policy[];
  recentCustomers: Customer[];
}

export interface PublicPaymentStatus {
  quotationReference: string;
  productName: string;
  customerFirstName: string;
  amount: number;
  currency: string;
  paymentStatus: PaymentStatus;
  policy: {
    policyNumber: string;
    status: PolicyStatus;
    startDate: string;
    endDate: string;
  } | null;
}

export interface NotificationRecord {
  id: string;
  type: 'POLICY_ACTIVATED';
  to: string;
  subject: string;
  status: NotificationStatus;
  attempts: number;
  provider: string;
  lastError?: string;
  sentAt?: string;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
