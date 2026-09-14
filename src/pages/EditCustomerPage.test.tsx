import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EditCustomerPage } from './EditCustomerPage';
import { ToastProvider } from '../hooks/useToast';
import { customerApi } from '../services';
import type { Customer } from '../types/api';

vi.mock('../services', () => ({
  customerApi: { get: vi.fn(), update: vi.fn() },
}));

const mockedCustomerApi = vi.mocked(customerApi);

const customer: Customer = {
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
};

/** Renders the edit route with whatever origin a caller would have supplied. */
function renderEdit(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/customers/c1/edit', state }]}>
      <ToastProvider>
        <Routes>
          <Route path="/customers" element={<div>Customers table</div>} />
          <Route path="/customers/:id" element={<div>Customer profile</div>} />
          <Route path="/customers/:id/edit" element={<EditCustomerPage />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

async function save(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByDisplayValue('Ananya');
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
}

describe('<EditCustomerPage /> return destination', () => {
  beforeEach(() => {
    mockedCustomerApi.get.mockResolvedValue({ customer });
    mockedCustomerApi.update.mockResolvedValue({ customer });
  });

  it('returns to the customers table when opened from the table', async () => {
    const user = userEvent.setup();
    renderEdit({ from: '/customers' });

    await save(user);

    await waitFor(() => expect(mockedCustomerApi.update).toHaveBeenCalled());
    expect(await screen.findByText('Customers table')).toBeInTheDocument();
    expect(screen.queryByText('Customer profile')).not.toBeInTheDocument();
  });

  it('returns to the profile when opened from the profile', async () => {
    const user = userEvent.setup();
    renderEdit({ from: '/customers/c1' });

    await save(user);

    expect(await screen.findByText('Customer profile')).toBeInTheDocument();
    expect(screen.queryByText('Customers table')).not.toBeInTheDocument();
  });

  it('falls back to the customers table when there is no origin', async () => {
    const user = userEvent.setup();
    renderEdit();

    await save(user);

    expect(await screen.findByText('Customers table')).toBeInTheDocument();
  });

  it('sends Cancel to the same place as Save', async () => {
    const user = userEvent.setup();
    renderEdit({ from: '/customers/c1' });

    await screen.findByDisplayValue('Ananya');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByText('Customer profile')).toBeInTheDocument();
    expect(mockedCustomerApi.update).not.toHaveBeenCalled();
  });

  /**
   * Router state is client-controlled, so the origin is validated rather than
   * trusted — an arbitrary value must not decide where the agent is sent.
   */
  it('ignores an origin that is not an in-app customer route', async () => {
    const user = userEvent.setup();
    renderEdit({ from: 'https://example.com/phishing' });

    await save(user);

    expect(await screen.findByText('Customers table')).toBeInTheDocument();
  });

  it('ignores an origin pointing back at the edit form itself', async () => {
    const user = userEvent.setup();
    renderEdit({ from: '/customers/c1/edit' });

    await save(user);

    // Returning here would leave the agent stuck in the form after saving.
    expect(await screen.findByText('Customers table')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });
});
