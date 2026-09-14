import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { documentApi, paymentApi, policyApi, quotationApi } from '../services';
import { ApiError } from '../services/apiClient';
import { useAsync } from '../hooks/useAsync';
import { usePolling } from '../hooks/usePolling';
import { useToast } from '../hooks/useToast';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DetailList,
  LoadingPanel,
  PaymentStatusBadge,
  PolicyStatusBadge,
  QuotationStatusBadge,
  Spinner,
} from '../components/ui';
import { JourneyStepper, type JourneyStep } from '../features/quotations/JourneyStepper';
import { WhatsAppShare } from '../features/quotations/WhatsAppShare';
import { categoryLabel, formatDate, formatDateTime, formatMoney, humaniseEnum } from '../utils/format';
import type { DocumentShareResponse, PaymentLinkResponse } from '../types/api';

/**
 * While a payment is outstanding the webhook may land at any moment, so the page
 * checks in the background rather than leaving the agent looking at a stale
 * status. These are background refreshes — the content on screen is never
 * replaced by a loading state — and they stop after roughly ten minutes so an
 * abandoned tab does not poll forever.
 */
const POLL_INTERVAL_MS = 6000;
const MAX_POLL_ATTEMPTS = 100;

export function QuotationDetailPage() {
  const { id = '' } = useParams();
  const { toast } = useToast();

  const quotationState = useAsync((signal) => quotationApi.get(id, signal), [id]);
  const paymentsState = useAsync((signal) => paymentApi.listForQuotation(id, signal), [id]);
  const policyState = useAsync(
    (signal) =>
      quotationState.data
        ? policyApi.list({ customerId: quotationState.data.quotation.customerId }, signal)
        : Promise.resolve({ data: { policies: [] }, meta: undefined }),
    [id, quotationState.data?.quotation.customerId],
  );

  const [document, setDocument] = useState<DocumentShareResponse | null>(null);
  const [documentLoading, setDocumentLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [paymentLink, setPaymentLink] = useState<PaymentLinkResponse | null>(null);
  const [creatingLink, setCreatingLink] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // An existing document may already have been generated on a previous visit —
  // fetch it so the share link survives a page refresh.
  useEffect(() => {
    let cancelled = false;
    setDocumentLoading(true);

    documentApi
      .get(id)
      .then((result) => {
        if (!cancelled) setDocument(result);
      })
      .catch(() => {
        if (!cancelled) setDocument(null);
      })
      .finally(() => {
        if (!cancelled) setDocumentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const payments = paymentsState.data?.payments ?? [];
  const latestPayment = payments[0] ?? null;
  const succeededPayment = payments.find((payment) => payment.status === 'SUCCEEDED') ?? null;
  const policy =
    policyState.data?.data.policies.find((item) => item.quotationId === id) ?? null;

  const awaitingPayment =
    Boolean(latestPayment) && ['CREATED', 'PENDING'].includes(latestPayment?.status ?? '');

  const reloadPaymentState = paymentsState.reload;
  const reloadPolicyState = policyState.reload;
  const reloadQuotationState = quotationState.reload;

  const refreshAll = useCallback(() => {
    reloadPaymentState();
    reloadPolicyState();
    reloadQuotationState();
  }, [reloadPaymentState, reloadPolicyState, reloadQuotationState]);

  // Only while there is actually something to wait for.
  const { exhausted: pollingStopped } = usePolling(awaitingPayment, refreshAll, {
    intervalMs: POLL_INTERVAL_MS,
    maxAttempts: MAX_POLL_ATTEMPTS,
  });

  const backgroundRefreshing =
    quotationState.refreshing || paymentsState.refreshing || policyState.refreshing;

  if (quotationState.loading) return <LoadingPanel label="Loading quotation…" />;

  if (quotationState.error || !quotationState.data) {
    return (
      <Alert tone="error" title="Could not load this quotation">
        {quotationState.error ?? 'The quotation could not be found.'}{' '}
        <Link to="/customers" className="font-medium underline">
          Back to customers
        </Link>
      </Alert>
    );
  }

  const quotation = quotationState.data.quotation;
  const expired = new Date(quotation.expiresAt).getTime() < Date.now();

  const handleGenerateDocument = async () => {
    setGenerating(true);
    setActionError(null);
    try {
      const result = await documentApi.generate(id);
      setDocument(result);
      quotationState.reload();
      toast('Quotation PDF generated.', 'success');
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Could not generate the document.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreatePaymentLink = async () => {
    setCreatingLink(true);
    setActionError(null);
    try {
      const result = await paymentApi.createLink(id);
      setPaymentLink(result);
      paymentsState.reload();
      quotationState.reload();
      toast(
        result.reused
          ? 'Reused the existing payment link — one link per quotation.'
          : 'Payment link created.',
        'success',
      );
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Could not create the payment link.');
    } finally {
      setCreatingLink(false);
    }
  };

  const steps: JourneyStep[] = [
    { label: 'Quotation raised', state: 'done' },
    {
      label: 'PDF generated',
      state: document ? 'done' : 'current',
      hint: 'Creates the personalised quotation document.',
    },
    {
      label: 'Shared with customer',
      state: document ? (latestPayment ? 'done' : 'current') : 'todo',
      hint: 'Opens WhatsApp with the document link pre-filled.',
    },
    {
      label: 'Payment link sent',
      state: latestPayment ? (succeededPayment ? 'done' : 'current') : 'todo',
    },
    {
      label: 'Payment received',
      state: succeededPayment ? 'done' : latestPayment ? 'current' : 'todo',
    },
    { label: 'Policy active', state: policy ? 'done' : 'todo' },
  ];

  const paymentUrl = paymentLink?.paymentUrl ?? latestPayment?.checkoutUrl ?? '';

  return (
    <>
      <PageHeader
        title={quotation.productSnapshot.name}
        breadcrumbs={[
          { label: 'Customers', to: '/customers' },
          { label: quotation.customerSnapshot.fullName, to: `/customers/${quotation.customerId}` },
          { label: quotation.reference },
        ]}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-xs">{quotation.reference}</span>
            <QuotationStatusBadge status={quotation.status} />
            <Badge>{categoryLabel(quotation.productSnapshot.category)}</Badge>
          </span>
        }
        actions={
          <Button variant="secondary" onClick={refreshAll} loading={backgroundRefreshing}>
            Refresh status
          </Button>
        }
      />

      <Card className="mb-5">
        <CardBody>
          <JourneyStepper steps={steps} />
        </CardBody>
      </Card>

      {actionError ? (
        <Alert tone="error" className="mb-5">
          {actionError}
        </Alert>
      ) : null}

      {expired && !succeededPayment ? (
        <Alert tone="warning" title="This quotation has expired" className="mb-5">
          Premiums are only honoured until the expiry date. Raise a new quotation from the customer's
          profile to collect payment.
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Step 1 · Personalised quotation document" />
            <CardBody className="space-y-4">
              {documentLoading ? (
                <LoadingPanel label="Checking for an existing document…" />
              ) : document ? (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone="success">Generated</Badge>
                    <span className="text-sm text-slate-600">
                      {document.document.reference} · version {document.document.version} ·{' '}
                      {formatDateTime(document.document.generatedAt)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        window.open(documentApi.downloadUrl(id), '_blank', 'noopener,noreferrer')
                      }
                    >
                      Open PDF
                    </Button>
                    <Button variant="ghost" onClick={handleGenerateDocument} loading={generating}>
                      Regenerate
                    </Button>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <p className="mb-3 text-sm font-medium text-slate-800">Step 2 · Share with the customer</p>
                    <WhatsAppShare
                      whatsAppUrl={document.whatsAppUrl}
                      shareUrl={document.shareUrl}
                      label="Share PDF via WhatsApp"
                      helpText={`Opens WhatsApp with the message pre-filled for ${quotation.customerSnapshot.phone}. You press send. The link stops working on ${formatDate(document.expiresAt)}, or immediately if you regenerate the document.`}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600">
                    Generate a PDF containing this customer's details, their cover, the premium and how it
                    was calculated. It is rendered from the quotation each time it is opened — nothing is
                    hardcoded and no file is stored.
                  </p>
                  <Button onClick={handleGenerateDocument} loading={generating}>
                    Generate quotation PDF
                  </Button>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Step 3 · Collect payment"
              description="Stripe Checkout in test mode. The amount comes from this quotation, never from the browser."
            />
            <CardBody className="space-y-4">
              {succeededPayment ? (
                <Alert tone="success" title="Payment received">
                  {formatMoney(succeededPayment.amount, succeededPayment.currency)} confirmed on{' '}
                  {formatDateTime(succeededPayment.paidAt)}.
                </Alert>
              ) : paymentUrl ? (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    {latestPayment ? <PaymentStatusBadge status={latestPayment.status} /> : null}
                    <span className="text-sm text-slate-600">
                      {formatMoney(quotation.premiumAmount, quotation.currency)} · attempt{' '}
                      {latestPayment?.attempt ?? 1}
                    </span>
                  </div>

                  <WhatsAppShare
                    whatsAppUrl={
                      paymentLink?.whatsAppUrl ??
                      `https://wa.me/${quotation.customerSnapshot.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hi ${quotation.customerSnapshot.fullName.split(' ')[0]}, you can complete your insurance payment here: ${paymentUrl}`,
                      )}`
                    }
                    shareUrl={paymentUrl}
                    label="Share payment link via WhatsApp"
                    helpText="The customer pays on Stripe's hosted page. The policy activates from Stripe's webhook, not from this browser — so it is safe to close this page."
                  />

                  {awaitingPayment ? (
                    <Alert tone="info">
                      {pollingStopped ? (
                        <span>
                          Still waiting for Stripe to confirm this payment. Use{' '}
                          <strong>Refresh status</strong> to check again — the policy will activate
                          from the webhook whether or not this page is open.
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Spinner className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                          Waiting for Stripe to confirm the payment. This updates on its own — you can
                          safely leave this page.
                        </span>
                      )}
                    </Alert>
                  ) : null}

                  <Button variant="ghost" size="sm" onClick={handleCreatePaymentLink} loading={creatingLink}>
                    Regenerate payment link
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600">
                    Create a Stripe Checkout link for{' '}
                    <span className="font-semibold text-slate-900">
                      {formatMoney(quotation.premiumAmount, quotation.currency)}
                    </span>
                    . Clicking more than once is safe — the same link is returned.
                  </p>
                  <Button onClick={handleCreatePaymentLink} loading={creatingLink} disabled={expired}>
                    Generate payment link
                  </Button>
                </>
              )}

              {payments.length > 0 ? (
                <div className="border-t border-slate-100 pt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Payment attempts
                  </p>
                  <ul className="space-y-2">
                    {payments.map((payment) => (
                      <li
                        key={payment.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                      >
                        <span className="font-mono text-xs text-slate-500">{payment.idempotencyKey}</span>
                        <span className="flex items-center gap-3">
                          <span className="text-slate-600">
                            {formatMoney(payment.amount, payment.currency)}
                          </span>
                          <PaymentStatusBadge status={payment.status} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardBody>
          </Card>

          {policy ? (
            <Card>
              <CardHeader title="Step 4 · Policy active" />
              <CardBody className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <PolicyStatusBadge status={policy.status} />
                  <span className="font-mono text-sm text-slate-700">{policy.policyNumber}</span>
                </div>
                <DetailList
                  columns={2}
                  items={[
                    { label: 'Cover starts', value: formatDate(policy.startDate) },
                    { label: 'Cover ends', value: formatDate(policy.endDate) },
                    { label: 'Sum assured', value: formatMoney(policy.coverageAmount, policy.currency) },
                    { label: 'Premium paid', value: formatMoney(policy.premiumAmount, policy.currency) },
                  ]}
                />
                <Alert tone="success">
                  A confirmation email was queued to {policy.customerEmail} when the policy activated.
                </Alert>
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Quotation summary" />
            <CardBody className="space-y-4">
              <div className="rounded-lg bg-brand-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Annual premium</p>
                <p className="mt-1 text-2xl font-semibold text-brand-800">
                  {formatMoney(quotation.premiumAmount, quotation.currency)}
                </p>
                <p className="mt-2 text-xs text-brand-700">
                  Sum assured {formatMoney(quotation.coverageAmount, quotation.currency)}
                </p>
              </div>

              <DetailList
                columns={1}
                items={[
                  { label: 'Customer', value: quotation.customerSnapshot.fullName },
                  { label: 'Age at quotation', value: `${quotation.customerSnapshot.age} years` },
                  { label: 'Contact', value: quotation.customerSnapshot.phone },
                  { label: 'Adviser', value: quotation.agentName },
                  { label: 'Raised', value: formatDate(quotation.createdAt) },
                  { label: 'Valid until', value: formatDate(quotation.expiresAt) },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="How this premium was calculated" />
            <CardBody>
              <ul className="space-y-3">
                {quotation.premiumBreakdown.map((step, index) => (
                  <li key={`${step.label}-${index}`} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700">{step.label}</p>
                      {step.detail ? <p className="text-xs text-slate-500">{step.detail}</p> : null}
                    </div>
                    <span
                      className={
                        index === quotation.premiumBreakdown.length - 1
                          ? 'shrink-0 text-sm font-semibold text-slate-900'
                          : 'shrink-0 text-sm text-slate-600'
                      }
                    >
                      {formatMoney(step.amount, quotation.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Eligibility snapshot" description="The facts this quotation was priced from." />
            <CardBody>
              <DetailList
                columns={1}
                items={[
                  { label: 'Age', value: `${quotation.eligibilitySnapshot.age} years` },
                  { label: 'Gender', value: humaniseEnum(quotation.eligibilitySnapshot.gender) },
                  { label: 'Annual income', value: formatMoney(quotation.eligibilitySnapshot.annualIncome) },
                  {
                    label: 'Vehicle',
                    value: quotation.eligibilitySnapshot.ownsVehicle
                      ? `${humaniseEnum(quotation.eligibilitySnapshot.vehicleType ?? '')} · ${formatMoney(quotation.eligibilitySnapshot.vehicleValue ?? 0)}`
                      : 'None',
                  },
                  { label: 'Smoker', value: quotation.eligibilitySnapshot.smoker ? 'Yes' : 'No' },
                  {
                    label: 'Pre-existing conditions',
                    value: quotation.eligibilitySnapshot.preExistingConditions ? 'Declared' : 'None declared',
                  },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
