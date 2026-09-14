import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAsync } from '../hooks/useAsync';
import { dashboardApi } from '../services';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Column,
  DataTable,
  EmptyState,
  LoadingPanel,
  PolicyStatusBadge,
  StatCard,
} from '../components/ui';
import { formatDate, formatMoney, formatMoneyCompact } from '../utils/format';
import type { Customer, Policy } from '../types/api';

const icon = (path: string) => (
  <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
    <path d={path} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function DashboardPage() {
  const { agent } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync((signal) => dashboardApi.get(signal));

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
    { key: 'customer', header: 'Customer', render: (policy) => policy.customerName },
    {
      key: 'premium',
      header: 'Premium',
      render: (policy) => formatMoney(policy.premiumAmount, policy.currency),
    },
    { key: 'start', header: 'Cover from', render: (policy) => formatDate(policy.startDate) },
    { key: 'status', header: 'Status', render: (policy) => <PolicyStatusBadge status={policy.status} /> },
  ];

  const customerColumns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer',
      render: (customer) => (
        <div>
          <p className="font-medium text-slate-900">
            {customer.firstName} {customer.lastName}
          </p>
          <p className="text-xs text-slate-500">{customer.email}</p>
        </div>
      ),
    },
    { key: 'city', header: 'Location', render: (customer) => `${customer.city}, ${customer.state}` },
    { key: 'added', header: 'Added', render: (customer) => formatDate(customer.createdAt) },
  ];

  const firstName = agent?.name.split(' ')[0] ?? 'there';

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Your book of business at a glance."
        actions={
          <Button onClick={() => navigate('/customers/new')} icon={icon('M12 5v14M5 12h14')}>
            New customer
          </Button>
        }
      />

      {error ? (
        <Alert tone="error" title="Could not load your dashboard">
          {error}{' '}
          <button type="button" onClick={reload} className="font-medium underline">
            Try again
          </button>
        </Alert>
      ) : loading ? (
        <LoadingPanel label="Loading your dashboard…" />
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total customers"
              value={data.stats.totalCustomers}
              hint={`${data.stats.openQuotations} open quotation${data.stats.openQuotations === 1 ? '' : 's'}`}
              accent="brand"
              icon={icon('M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7z')}
            />
            <StatCard
              label="Active policies"
              value={data.stats.activePolicies}
              hint={`${formatMoneyCompact(data.stats.premiumWritten)} premium written`}
              accent="emerald"
              icon={icon('M12 3l7 2.6v6.3c0 4.4-3 8-7 9.1-4-1.1-7-4.7-7-9.1V5.6L12 3z')}
            />
            <StatCard
              label="Pending payments"
              value={data.stats.pendingPayments}
              hint="Awaiting customer payment"
              accent="amber"
              icon={icon('M12 8v4l2.5 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z')}
            />
            <StatCard
              label="Available products"
              value={data.stats.availableProducts}
              hint="Across all categories"
              accent="slate"
              icon={icon('M4 7l8-4 8 4-8 4-8-4zm0 0v10l8 4 8-4V7')}
            />
          </div>

          <Card>
            <CardHeader
              title="Recent policies"
              description="Cover that has started after a successful payment."
              action={
                <Link to="/policies" className="text-sm font-medium text-brand-600 hover:underline">
                  View all
                </Link>
              }
            />
            <DataTable
              columns={policyColumns}
              rows={data.recentPolicies}
              rowKey={(policy) => policy.id}
              empty={
                <EmptyState
                  title="No policies yet"
                  description="Once a customer completes payment, their policy appears here automatically."
                />
              }
            />
          </Card>

          <Card>
            <CardHeader
              title="Recently added customers"
              action={
                <Link to="/customers" className="text-sm font-medium text-brand-600 hover:underline">
                  View all
                </Link>
              }
            />
            <DataTable
              columns={customerColumns}
              rows={data.recentCustomers}
              rowKey={(customer) => customer.id}
              onRowClick={(customer) => navigate(`/customers/${customer.id}`)}
              empty={
                <EmptyState
                  title="No customers yet"
                  description="Add your first prospective customer to see which products they qualify for."
                  action={<Button onClick={() => navigate('/customers/new')}>Add a customer</Button>}
                />
              }
            />
          </Card>

          <CardBody className="rounded-xl border border-dashed border-slate-300 bg-white/60 text-sm text-slate-600">
            <p className="font-medium text-slate-800">The agent journey</p>
            <p className="mt-1">
              Add a customer → review the products they qualify for → generate a personalised quotation
              PDF → share it on WhatsApp → create a payment link → the policy activates automatically once
              Stripe confirms the payment, and the customer is emailed.
            </p>
          </CardBody>
        </div>
      ) : null}
    </>
  );
}
