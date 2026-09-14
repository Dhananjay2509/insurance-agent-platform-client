import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync';
import { useToast } from '../hooks/useToast';
import { customerApi } from '../services';
import { ApiError } from '../services/apiClient';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Alert,
  Button,
  Card,
  Column,
  ConfirmDialog,
  DataTable,
  EmptyState,
  LoadingPanel,
  TextField,
} from '../components/ui';
import { calculateAge, formatDate, formatMoneyCompact } from '../utils/format';
import type { Customer } from '../types/api';

export function CustomersPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // The customer queued for deletion. Holding the whole record (not just an id)
  // lets the dialog name the person being removed.
  const [pendingDelete, setPendingDelete] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data, loading, error, reload } = useAsync(
    (signal) => customerApi.list({ search: search || undefined }, signal),
    [search],
  );

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer',
      render: (customer) => (
        <div>
          <p className="font-medium text-slate-900">
            {customer.firstName} {customer.lastName}
          </p>
          <p className="text-xs text-slate-500">{customer.occupation}</p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (customer) => (
        <div>
          <p className="text-slate-700">{customer.email}</p>
          <p className="text-xs text-slate-500">{customer.phone}</p>
        </div>
      ),
    },
    { key: 'age', header: 'Age', render: (customer) => `${calculateAge(customer.dateOfBirth)}` },
    {
      key: 'income',
      header: 'Annual income',
      render: (customer) => formatMoneyCompact(customer.annualIncome),
    },
    {
      key: 'location',
      header: 'Location',
      render: (customer) => `${customer.city}, ${customer.state}`,
    },
    { key: 'added', header: 'Added', render: (customer) => formatDate(customer.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-px whitespace-nowrap text-right',
      render: (customer) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            // The row itself opens the customer, so a row-level action must not
            // also trigger that navigation.
            onClick={(event) => {
              event.stopPropagation();
              // Tell the form where to come back to, so saving returns here
              // rather than dropping the agent into the customer's profile.
              navigate(`/customers/${customer.id}/edit`, { state: { from: '/customers' } });
            }}
            aria-label={`Edit ${customer.firstName} ${customer.lastName}`}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={(event) => {
              event.stopPropagation();
              setDeleteError(null);
              setPendingDelete(customer);
            }}
            aria-label={`Delete ${customer.firstName} ${customer.lastName}`}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const handleDelete = async () => {
    if (!pendingDelete) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await customerApi.remove(pendingDelete.id);
      toast(`${pendingDelete.firstName} ${pendingDelete.lastName} deleted.`, 'success');
      setPendingDelete(null);
      reload();
    } catch (error) {
      // The dialog stays open on failure: a 409 carries the reason the customer
      // cannot be removed, and the user needs to read it.
      setDeleteError(
        error instanceof ApiError ? error.message : 'Could not delete this customer. Please try again.',
      );
    } finally {
      setDeleting(false);
    }
  };

  const total = (data?.meta as { total?: number } | undefined)?.total ?? data?.data.customers.length ?? 0;

  return (
    <>
      <PageHeader
        title="Customers"
        description="Prospective and existing customers you have added."
        actions={
          <Button
            onClick={() => navigate('/customers/new')}
            icon={
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            }
          >
            New customer
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <TextField
          label="Search"
          placeholder="Name, email or phone"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>

      {error ? (
        <Alert tone="error" title="Could not load customers">
          {error}{' '}
          <button type="button" onClick={reload} className="font-medium underline">
            Try again
          </button>
        </Alert>
      ) : loading ? (
        <LoadingPanel label="Loading customers…" />
      ) : (
        <Card>
          <DataTable
            columns={columns}
            rows={data?.data.customers ?? []}
            rowKey={(customer) => customer.id}
            onRowClick={(customer) => navigate(`/customers/${customer.id}`)}
            empty={
              search ? (
                <EmptyState
                  title="No matching customers"
                  description={`Nothing matched "${search}". Try a different name, email or phone number.`}
                />
              ) : (
                <EmptyState
                  title="No customers yet"
                  description="Add a prospective customer to see which insurance products they qualify for."
                  action={<Button onClick={() => navigate('/customers/new')}>Add your first customer</Button>}
                />
              )
            }
          />
          {total > 0 ? (
            <div className="border-t border-slate-200 px-5 py-2.5 text-xs text-slate-500">
              Showing {data?.data.customers.length ?? 0} of {total} customer{total === 1 ? '' : 's'}
            </div>
          ) : null}
        </Card>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        tone="danger"
        title={`Delete ${pendingDelete?.firstName ?? ''} ${pendingDelete?.lastName ?? ''}?`}
        confirmLabel="Delete customer"
        loading={deleting}
        error={deleteError}
        onCancel={() => {
          setPendingDelete(null);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
        description={
          <>
            <p>
              This permanently removes their profile, any quotations you have raised for them, and any
              quotation documents — which stops previously shared PDF links from working.
            </p>
            <p className="mt-2">
              Customers with an active policy, a completed payment, or a payment still in progress
              cannot be deleted. This cannot be undone.
            </p>
          </>
        }
      />
    </>
  );
}
