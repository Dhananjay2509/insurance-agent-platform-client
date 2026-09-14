import { useNavigate } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync';
import { policyApi } from '../services';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Alert,
  Card,
  Column,
  DataTable,
  EmptyState,
  LoadingPanel,
  PolicyStatusBadge,
} from '../components/ui';
import { formatDate, formatMoney, formatMoneyCompact } from '../utils/format';
import type { Policy } from '../types/api';

export function PoliciesPage() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync((signal) => policyApi.list({}, signal));

  const columns: Column<Policy>[] = [
    {
      key: 'policy',
      header: 'Policy',
      render: (policy) => (
        <div>
          <p className="font-medium text-slate-900">{policy.policyNumber}</p>
          <p className="text-xs text-slate-500">{policy.quotationReference}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (policy) => (
        <div>
          <p className="text-slate-800">{policy.customerName}</p>
          <p className="text-xs text-slate-500">{policy.customerEmail}</p>
        </div>
      ),
    },
    { key: 'product', header: 'Product', render: (policy) => policy.productName },
    {
      key: 'cover',
      header: 'Sum assured',
      render: (policy) => formatMoneyCompact(policy.coverageAmount, policy.currency),
    },
    {
      key: 'premium',
      header: 'Premium',
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
        title="Policies"
        description="Every policy activated after a confirmed Stripe payment."
      />

      {error ? (
        <Alert tone="error" title="Could not load policies">
          {error}{' '}
          <button type="button" onClick={reload} className="font-medium underline">
            Try again
          </button>
        </Alert>
      ) : loading ? (
        <LoadingPanel label="Loading policies…" />
      ) : (
        <Card>
          <DataTable
            columns={columns}
            rows={data?.data.policies ?? []}
            rowKey={(policy) => policy.id}
            onRowClick={(policy) => navigate(`/quotations/${policy.quotationId}`)}
            empty={
              <EmptyState
                title="No policies yet"
                description="A policy is created automatically the moment Stripe confirms a customer's payment."
              />
            }
          />
        </Card>
      )}
    </>
  );
}
