import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { customerApi } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useToast } from '../hooks/useToast';
import { PageHeader } from '../components/layout/PageHeader';
import { Alert, LoadingPanel } from '../components/ui';
import { CustomerForm } from '../features/customers/CustomerForm';
import { toFormValues } from '../features/customers/customerForm.logic';

const CUSTOMER_LIST_PATH = '/customers';

/** `/customers` or `/customers/<id>` — deliberately not `/customers/<id>/edit`,
 *  which would send the agent straight back into the form they just left. */
const RETURNABLE_PATH = /^\/customers(\/[A-Za-z0-9_-]+)?$/;

/**
 * Where to go after saving or cancelling.
 *
 * The edit form is reached from two places — the customers table and a customer's
 * own profile — and should return to whichever one the agent came from. The
 * origin travels in router state, which survives a page refresh because React
 * Router stores it in `history.state`.
 *
 * The value is validated rather than trusted: history state is client-controlled,
 * so only in-app customer routes are accepted.
 */
function resolveReturnPath(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  if (typeof from === 'string' && RETURNABLE_PATH.test(from)) return from;
  return CUSTOMER_LIST_PATH;
}

export function EditCustomerPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const returnPath = resolveReturnPath(location.state);

  const { data, loading, error } = useAsync((signal) => customerApi.get(id, signal), [id]);

  if (loading) return <LoadingPanel label="Loading customer…" />;
  if (error || !data) {
    return (
      <Alert tone="error" title="Could not load this customer">
        {error ?? 'The customer could not be found.'}
      </Alert>
    );
  }

  const customer = data.customer;

  return (
    <>
      <PageHeader
        title={`Edit ${customer.firstName} ${customer.lastName}`}
        description="Changing income, age, vehicle or declarations re-runs eligibility and re-prices any open quotation."
        breadcrumbs={[
          { label: 'Customers', to: CUSTOMER_LIST_PATH },
          { label: `${customer.firstName} ${customer.lastName}`, to: `/customers/${id}` },
          { label: 'Edit' },
        ]}
      />

      <CustomerForm
        initialValues={toFormValues(customer)}
        submitLabel="Save changes"
        onCancel={() => navigate(returnPath)}
        onSubmit={async (payload) => {
          await customerApi.update(id, payload);
          toast('Customer updated.', 'success');
          // `replace` so Back from the destination does not re-open the form.
          navigate(returnPath, { replace: true });
        }}
      />
    </>
  );
}
