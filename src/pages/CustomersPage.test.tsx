import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CustomersPage } from './CustomersPage';
import { ToastProvider } from '../hooks/useToast';
import { customerApi } from '../services';
import { ApiError } from '../services/apiClient';
import type { Customer } from '../types/api';

vi.mock('../services', () => ({
  customerApi: { list: vi.fn(), remove: vi.fn() },
}));

const mockedCustomerApi = vi.mocked(customerApi);

const customer = (overrides: Partial<Customer> = {}): Customer => ({
  id: 'c1',
  firstName: 'Ananya',
  lastName: 'Sharma',
  fullName: 'Ananya Sharma',
  email: 'ananya@example.com',
  phone: '+919876543210',
  dateOfBirth: '1994-01-15T00:00:00.000Z',
  gender: 'FEMALE',
  occupation: 'Software Engineer',
  annualIncome: 120_000_000,
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560034',
  vehicle: { owns: true, type: 'CAR', value: 90_000_000 },
  health: { smoker: false, preExistingConditions: false },
  createdByAgent: 'a1',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/customers']}>
      <ToastProvider>
        <Routes>
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<div>Customer profile</div>} />
          <Route path="/customers/:id/edit" element={<div>Edit customer form</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

const rowFor = (name: string) => screen.getByRole('row', { name: new RegExp(name) });

describe('<CustomersPage /> row actions', () => {
  beforeEach(() => {
    mockedCustomerApi.list.mockResolvedValue({
      data: { customers: [customer()] },
      meta: { total: 1 },
    });
    mockedCustomerApi.remove.mockResolvedValue({
      deleted: true,
      deletedQuotations: 0,
      deletedDocuments: 0,
      deletedPayments: 0,
    });
  });

  it('shows an Edit and a Delete action on each row', async () => {
    renderPage();
    await screen.findByText('ananya@example.com');

    expect(screen.getByRole('button', { name: 'Edit Ananya Sharma' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Ananya Sharma' })).toBeInTheDocument();
  });

  it('opens the edit form without also opening the profile', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('ananya@example.com');

    await user.click(screen.getByRole('button', { name: 'Edit Ananya Sharma' }));

    // The row click handler must not fire as well.
    expect(await screen.findByText('Edit customer form')).toBeInTheDocument();
    expect(screen.queryByText('Customer profile')).not.toBeInTheDocument();
  });

  it('still opens the profile when the row itself is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('ananya@example.com');

    await user.click(within(rowFor('Ananya Sharma')).getByText('ananya@example.com'));

    expect(await screen.findByText('Customer profile')).toBeInTheDocument();
  });

  it('asks for confirmation before deleting, and does not call the API until confirmed', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('ananya@example.com');

    await user.click(screen.getByRole('button', { name: 'Delete Ananya Sharma' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete Ananya Sharma?')).toBeInTheDocument();
    expect(within(dialog).getByText(/cannot be undone/i)).toBeInTheDocument();
    expect(mockedCustomerApi.remove).not.toHaveBeenCalled();
  });

  it('cancelling closes the dialog and deletes nothing', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('ananya@example.com');

    await user.click(screen.getByRole('button', { name: 'Delete Ananya Sharma' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockedCustomerApi.remove).not.toHaveBeenCalled();
  });

  it('pressing Escape closes the dialog', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('ananya@example.com');

    await user.click(screen.getByRole('button', { name: 'Delete Ananya Sharma' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockedCustomerApi.remove).not.toHaveBeenCalled();
  });

  it('deletes on confirmation and refreshes the list', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('ananya@example.com');

    await user.click(screen.getByRole('button', { name: 'Delete Ananya Sharma' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete customer' }));

    await waitFor(() => expect(mockedCustomerApi.remove).toHaveBeenCalledWith('c1'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // The list is refetched rather than patched locally, so it matches the server.
    await waitFor(() => expect(mockedCustomerApi.list).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Ananya Sharma deleted\./)).toBeInTheDocument();
  });

  /**
   * The important one: the API refuses to delete a customer who holds a policy,
   * and that reason has to reach the user instead of vanishing with the dialog.
   */
  it('keeps the dialog open and shows why when the server refuses', async () => {
    const user = userEvent.setup();
    mockedCustomerApi.remove.mockRejectedValue(
      new ApiError(
        409,
        'CONFLICT',
        'Ananya Sharma has 1 policy on record and cannot be deleted. Policies are financial records and must be retained.',
      ),
    );

    renderPage();
    await screen.findByText('ananya@example.com');

    await user.click(screen.getByRole('button', { name: 'Delete Ananya Sharma' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete customer' }));

    expect(await within(dialog).findByText(/has 1 policy on record/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // The row is untouched.
    expect(screen.getByText('ananya@example.com')).toBeInTheDocument();
  });

  it('clears a previous error when the dialog is reopened', async () => {
    const user = userEvent.setup();
    mockedCustomerApi.remove.mockRejectedValueOnce(
      new ApiError(409, 'CONFLICT', 'Cannot be deleted.'),
    );

    renderPage();
    await screen.findByText('ananya@example.com');

    await user.click(screen.getByRole('button', { name: 'Delete Ananya Sharma' }));
    let dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete customer' }));
    expect(await within(dialog).findByText('Cannot be deleted.')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Delete Ananya Sharma' }));
    dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByText('Cannot be deleted.')).not.toBeInTheDocument();
  });
});
