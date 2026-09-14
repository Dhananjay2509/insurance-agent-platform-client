import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { customerApi, policyApi, quotationApi } from '../services';
import { useAsync } from '../hooks/useAsync';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Column,
  DataTable,
  DetailList,
  EmptyState,
  LoadingPanel,
  PolicyStatusBadge,
  QuotationStatusBadge,
} from '../components/ui';
import { EligibleProducts } from '../features/eligibility/EligibleProducts';
import { calculateAge, formatDate, formatMoney, formatMoneyCompact, humaniseEnum } from '../utils/format';
import { cn } from '../utils/cn';
import type { Policy, Quotation } from '../types/api';

type Tab = 'eligibility' | 'profile' | 'journey';

const TABS: { id: Tab; label: string }[] = [
  { id: 'eligibility', label: 'Applicable products' },
  { id: 'journey', label: 'Quotations & policies' },
  { id: 'profile', label: 'Profile' },
];

export function CustomerDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('eligibility');

  const customerState = useAsync((signal) => customerApi.get(id, signal), [id]);
  const eligibilityState = useAsync((signal) => customerApi.eligibleProducts(id, signal), [id]);
  const quotationState = useAsync((signal) => quotationApi.listForCustomer(id, signal), [id]);
  const policyState = useAsync((signal) => policyApi.list({ customerId: id }, signal), [id]);

  if (customerState.loading) return <LoadingPanel label="Loading customer…" />;

  if (customerState.error || !customerState.data) {
    return (
      <Alert tone="error" title="Could not load this customer">
        {customerState.error ?? 'The customer could not be found.'}{' '}
        <Link to="/customers" className="font-medium underline">
          Back to customers
        </Link>
      </Alert>
    );
  }

  const customer = customerState.data.customer;
  const fullName = `${customer.firstName} ${customer.lastName}`;

  const quotationColumns: Column<Quotation>[] = [
    {
      key: 'reference',
      header: 'Quotation',
      render: (quotation) => (
        <div>
          <p className="font-medium text-slate-900">{quotation.reference}</p>
          <p className="text-xs text-slate-500">{quotation.productSnapshot.name}</p>
        </div>
      ),
    },
    {
      key: 'premium',
      header: 'Premium',
      render: (quotation) => formatMoney(quotation.premiumAmount, quotation.currency),
    },
    {
      key: 'cover',
      header: 'Cover',
      render: (quotation) => formatMoneyCompact(quotation.coverageAmount, quotation.currency),
    },
    {
      key: 'status',
      header: 'Status',
      render: (quotation) => <QuotationStatusBadge status={quotation.status} />,
    },
    { key: 'created', header: 'Raised', render: (quotation) => formatDate(quotation.createdAt) },
  ];

  const policyColumns: Column<Policy>[] = [
    {
      key: 'policy',
      header: 'Policy',
      render: (policy) => (
        <div>
          <p className="font-medium text-slate-900">{policy.policyNumber}</p>
          <p className="text-xs text-slate-500">{policy.productName}</p>
        </div>
      ),
    },
    {
      key: 'premium',
      header: 'Premium paid',
      render: (policy) => formatMoney(policy.premiumAmount, policy.currency),
    },
    {
      key: 'term',
      header: 'Cover period',
      render: (policy) => `${formatDate(policy.startDate)} – ${formatDate(policy.endDate)}`,
    },
    { key: 'status', header: 'Status', render: (policy) => <PolicyStatusBadge status={policy.status} /> },
  ];

  return (
    <>
      <PageHeader
        title={fullName}
        breadcrumbs={[{ label: 'Customers', to: '/customers' }, { label: fullName }]}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{customer.email}</span>
            <span aria-hidden="true" className="text-slate-300">
              •
            </span>
            <span>{customer.phone}</span>
            <span aria-hidden="true" className="text-slate-300">
              •
            </span>
            <span>
              {calculateAge(customer.dateOfBirth)} years · {customer.city}, {customer.state}
            </span>
          </span>
        }
        actions={
          <Button
            variant="secondary"
            onClick={() => navigate(`/customers/${id}/edit`, { state: { from: `/customers/${id}` } })}
          >
            Edit details
          </Button>
        }
      />

      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === item.id
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'eligibility' ? (
        eligibilityState.loading ? (
          <LoadingPanel label="Evaluating eligibility…" />
        ) : eligibilityState.error || !eligibilityState.data ? (
          <Alert tone="error" title="Could not evaluate eligibility">
            {eligibilityState.error}{' '}
            <button type="button" onClick={eligibilityState.reload} className="font-medium underline">
              Try again
            </button>
          </Alert>
        ) : (
          <EligibleProducts
            customerId={id}
            data={eligibilityState.data}
            onQuoted={quotationState.reload}
          />
        )
      ) : null}

      {tab === 'journey' ? (
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Quotations"
              description="Each quotation freezes the premium and the customer details it was priced from."
            />
            {quotationState.loading ? (
              <LoadingPanel label="Loading quotations…" />
            ) : (
              <DataTable
                columns={quotationColumns}
                rows={quotationState.data?.quotations ?? []}
                rowKey={(quotation) => quotation.id}
                onRowClick={(quotation) => navigate(`/quotations/${quotation.id}`)}
                empty={
                  <EmptyState
                    title="No quotations yet"
                    description="Pick a product from the Applicable products tab to raise one."
                    action={<Button onClick={() => setTab('eligibility')}>See applicable products</Button>}
                  />
                }
              />
            )}
          </Card>

          <Card>
            <CardHeader title="Policies" description="Cover that started after a confirmed payment." />
            {policyState.loading ? (
              <LoadingPanel label="Loading policies…" />
            ) : (
              <DataTable
                columns={policyColumns}
                rows={policyState.data?.data.policies ?? []}
                rowKey={(policy) => policy.id}
                empty={
                  <EmptyState
                    title="No active policies"
                    description="A policy is created automatically once Stripe confirms the customer's payment."
                  />
                }
              />
            )}
          </Card>
        </div>
      ) : null}

      {tab === 'profile' ? (
        <div className="space-y-5">
          <Card>
            <CardHeader title="Personal details" />
            <CardBody>
              <DetailList
                columns={3}
                items={[
                  { label: 'Full name', value: fullName },
                  { label: 'Date of birth', value: formatDate(customer.dateOfBirth) },
                  { label: 'Age', value: `${calculateAge(customer.dateOfBirth)} years` },
                  { label: 'Gender', value: humaniseEnum(customer.gender) },
                  { label: 'Email', value: customer.email },
                  { label: 'Phone', value: customer.phone },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Work and location" />
            <CardBody>
              <DetailList
                columns={3}
                items={[
                  { label: 'Occupation', value: customer.occupation },
                  { label: 'Annual income', value: formatMoney(customer.annualIncome) },
                  { label: 'City', value: customer.city },
                  { label: 'State', value: customer.state },
                  { label: 'Postal code', value: customer.postalCode },
                  { label: 'Customer since', value: formatDate(customer.createdAt) },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Vehicle and declarations" />
            <CardBody>
              <DetailList
                columns={3}
                items={[
                  {
                    label: 'Owns a vehicle',
                    value: customer.vehicle.owns ? (
                      <Badge tone="info">Yes</Badge>
                    ) : (
                      <Badge>No</Badge>
                    ),
                  },
                  {
                    label: 'Vehicle type',
                    value: customer.vehicle.type ? humaniseEnum(customer.vehicle.type) : '—',
                  },
                  {
                    label: 'Declared value',
                    value: customer.vehicle.value ? formatMoney(customer.vehicle.value) : '—',
                  },
                  {
                    label: 'Registration year',
                    value: customer.vehicle.registrationYear ?? '—',
                  },
                  {
                    label: 'Smoker',
                    value: customer.health.smoker ? (
                      <Badge tone="warning">Yes</Badge>
                    ) : (
                      <Badge>No</Badge>
                    ),
                  },
                  {
                    label: 'Pre-existing conditions',
                    value: customer.health.preExistingConditions ? (
                      <Badge tone="warning">Declared</Badge>
                    ) : (
                      <Badge>None declared</Badge>
                    ),
                  },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      ) : null}
    </>
  );
}
