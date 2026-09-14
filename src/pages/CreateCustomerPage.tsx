import { useNavigate } from 'react-router-dom';
import { customerApi } from '../services';
import { useToast } from '../hooks/useToast';
import { PageHeader } from '../components/layout/PageHeader';
import { CustomerForm } from '../features/customers/CustomerForm';

export function CreateCustomerPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  return (
    <>
      <PageHeader
        title="New customer"
        description="Capture the details needed to decide which products this customer qualifies for."
        breadcrumbs={[{ label: 'Customers', to: '/customers' }, { label: 'New customer' }]}
      />

      <CustomerForm
        submitLabel="Create customer"
        onCancel={() => navigate('/customers')}
        onSubmit={async (payload) => {
          const { customer } = await customerApi.create(payload);
          toast(`${customer.firstName} ${customer.lastName} added.`, 'success');
          // Straight to the profile: the next step is choosing a product.
          navigate(`/customers/${customer.id}`, { replace: true });
        }}
      />
    </>
  );
}
