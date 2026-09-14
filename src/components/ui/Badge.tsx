import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import type { PaymentStatus, PolicyStatus, QuotationStatus } from '../../types/api';
import { humaniseEnum } from '../../utils/format';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-brand-50 text-brand-700 ring-brand-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Status badges live here rather than in each page, so a status always looks
 * the same wherever it appears and a new status is added in one place.
 */
const PAYMENT_TONES: Record<PaymentStatus, Tone> = {
  CREATED: 'neutral',
  PENDING: 'warning',
  SUCCEEDED: 'success',
  FAILED: 'danger',
  EXPIRED: 'neutral',
};

export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => (
  <Badge tone={PAYMENT_TONES[status]}>{humaniseEnum(status)}</Badge>
);

const QUOTATION_TONES: Record<QuotationStatus, Tone> = {
  DRAFT: 'neutral',
  DOCUMENT_GENERATED: 'info',
  PAYMENT_PENDING: 'warning',
  CONVERTED: 'success',
  EXPIRED: 'neutral',
};

export const QuotationStatusBadge = ({ status }: { status: QuotationStatus }) => (
  <Badge tone={QUOTATION_TONES[status]}>{humaniseEnum(status)}</Badge>
);

const POLICY_TONES: Record<PolicyStatus, Tone> = {
  ACTIVE: 'success',
  CANCELLED: 'danger',
  LAPSED: 'warning',
};

export const PolicyStatusBadge = ({ status }: { status: PolicyStatus }) => (
  <Badge tone={POLICY_TONES[status]}>{humaniseEnum(status)}</Badge>
);
