import { type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync';
import { usePolling } from '../hooks/usePolling';
import { paymentApi } from '../services';
import { Alert, Badge, Card, CardBody, LoadingPanel, PaymentStatusBadge } from '../components/ui';
import { formatDate, formatMoney } from '../utils/format';

/**
 * Public page the CUSTOMER lands on after Stripe Checkout — not part of the
 * agent dashboard and deliberately unauthenticated.
 *
 * Reaching this page does NOT mean the payment succeeded: Stripe's redirect is
 * a browser navigation and can be faked or arrive before the webhook. The page
 * therefore reads the authoritative status from the API and polls until the
 * webhook has been processed.
 */
const POLL_INTERVAL_MS = 3000;
/** ~2 minutes. Past that the customer is better served by a clear message than
 *  by an indicator that never resolves. */
const MAX_POLLS = 40;

export function PaymentReturnPage({ outcome }: { outcome: 'success' | 'cancelled' }) {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('ref') ?? '';

  const { data, loading, error, reload } = useAsync(
    (signal) =>
      reference ? paymentApi.publicStatus(reference, signal) : Promise.reject(new Error('missing')),
    [reference],
  );

  const settled = data?.paymentStatus === 'SUCCEEDED' || Boolean(data?.policy);
  const { exhausted: checksStopped } = usePolling(
    !settled && outcome === 'success' && Boolean(reference),
    reload,
    { intervalMs: POLL_INTERVAL_MS, maxAttempts: MAX_POLLS },
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M12 3l7 2.6v6.3c0 4.4-3 8-7 9.1-4-1.1-7-4.7-7-9.1V5.6L12 3z" fill="currentColor" opacity=".35" />
              <path d="M9 12.3l2.1 2.1 4-4.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-base font-semibold text-slate-900">Insurance Agent Platform</span>
        </div>

        <Card>
          <CardBody className="space-y-5 py-8 text-center">
            {!reference ? (
              <Alert tone="error" title="Missing reference">
                This link is incomplete. Please use the payment link your agent sent you.
              </Alert>
            ) : loading && !data ? (
              <LoadingPanel label="Checking your payment…" />
            ) : error ? (
              <Alert tone="error" title="We could not find this payment">
                Please check the link your agent sent you, or contact them directly.
              </Alert>
            ) : data ? (
              <>
                {outcome === 'cancelled' && !settled ? (
                  <>
                    <StatusIcon tone="neutral" />
                    <div>
                      <h1 className="text-lg font-semibold text-slate-900">Payment cancelled</h1>
                      <p className="mt-1 text-sm text-slate-600">
                        No money has been taken. Your quotation is still valid — reopen the payment link
                        whenever you are ready.
                      </p>
                    </div>
                  </>
                ) : settled ? (
                  <>
                    <StatusIcon tone="success" />
                    <div>
                      <h1 className="text-lg font-semibold text-slate-900">
                        Thank you{data.customerFirstName ? `, ${data.customerFirstName}` : ''} — your cover has started
                      </h1>
                      <p className="mt-1 text-sm text-slate-600">
                        We have emailed your confirmation. Keep your policy number for your records.
                      </p>
                    </div>
                  </>
                ) : checksStopped ? (
                  <>
                    <StatusIcon tone="pending" />
                    <div>
                      <h1 className="text-lg font-semibold text-slate-900">
                        This is taking longer than usual
                      </h1>
                      <p className="mt-1 text-sm text-slate-600">
                        Your payment is still being confirmed. You do not need to do anything — we will
                        email your policy details as soon as it completes. Contact your agent if you have
                        not heard from us shortly.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <StatusIcon tone="pending" />
                    <div>
                      <h1 className="text-lg font-semibold text-slate-900">Confirming your payment</h1>
                      <p className="mt-1 text-sm text-slate-600">
                        This usually takes a few seconds, and updates on its own. You can safely leave
                        this page — your policy is activated by our payment provider, not by this
                        browser.
                      </p>
                    </div>
                  </>
                )}

                <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-left">
                  <Row label="Product" value={data.productName} />
                  <Row label="Reference" value={<span className="font-mono text-xs">{data.quotationReference}</span>} />
                  <Row label="Amount" value={formatMoney(data.amount, data.currency)} />
                  <Row label="Payment status" value={<PaymentStatusBadge status={data.paymentStatus} />} />
                  {data.policy ? (
                    <>
                      <Row
                        label="Policy number"
                        value={<span className="font-mono text-xs">{data.policy.policyNumber}</span>}
                      />
                      <Row
                        label="Cover period"
                        value={`${formatDate(data.policy.startDate)} – ${formatDate(data.policy.endDate)}`}
                      />
                      <Row label="Policy status" value={<Badge tone="success">{data.policy.status}</Badge>} />
                    </>
                  ) : null}
                </dl>
              </>
            ) : null}
          </CardBody>
        </Card>

        <p className="mt-4 text-center text-xs text-slate-400">
          Demonstration environment. Payments run in Stripe test mode and no real money is taken.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function StatusIcon({ tone }: { tone: 'success' | 'pending' | 'neutral' }) {
  const styles = {
    success: 'bg-emerald-100 text-emerald-600',
    pending: 'bg-amber-100 text-amber-600',
    neutral: 'bg-slate-100 text-slate-500',
  }[tone];

  return (
    <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${styles}`}>
      {tone === 'success' ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : tone === 'pending' ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 animate-pulse" aria-hidden="true">
          <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
          <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
}
