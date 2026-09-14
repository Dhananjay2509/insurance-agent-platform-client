import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { EligibleProducts } from './EligibleProducts';
import { ToastProvider } from '../../hooks/useToast';
import type { EligibleProductsResponse, Product } from '../../types/api';

vi.mock('../../services', () => ({ quotationApi: { create: vi.fn() } }));

const product = (overrides: Partial<Product>): Product => ({
  id: 'p1',
  name: 'Term Life Plus',
  category: 'TERM',
  description: 'Pure protection term cover.',
  basePremium: 1_140_000,
  coverageAmount: 1_000_000_000,
  keyBenefits: ['Benefit one'],
  eligibilityRules: {},
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const response: EligibleProductsResponse = {
  profile: {
    age: 32,
    gender: 'FEMALE',
    annualIncome: 120_000_000,
    ownsVehicle: true,
    vehicleType: 'CAR',
    vehicleValue: 90_000_000,
    smoker: false,
    preExistingConditions: false,
  },
  eligible: [
    {
      product: product({ id: 'p1', name: 'Term Life Plus' }),
      eligible: true,
      failures: [],
      quote: { premiumAmount: 969_000, coverageAmount: 1_000_000_000 },
    },
  ],
  ineligible: [
    {
      product: product({ id: 'p2', name: 'Senior Health Protect', category: 'HEALTH' }),
      eligible: false,
      failures: [{ rule: 'MIN_AGE', message: 'Minimum entry age is 55; the customer is 32.' }],
    },
  ],
};

function renderPanel(data: EligibleProductsResponse = response) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <EligibleProducts customerId="c1" data={data} onQuoted={() => {}} />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('<EligibleProducts />', () => {
  it('lists applicable products with the premium priced for this customer', () => {
    renderPanel();

    expect(screen.getByText('Applicable products (1)')).toBeInTheDocument();
    expect(screen.getByText('Term Life Plus')).toBeInTheDocument();
    // The customer-specific quote (₹9,690), not the catalogue base premium.
    expect(screen.getByText(/₹9,690/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select and quote/i })).toBeInTheDocument();
  });

  it('hides ineligible reasons behind a disclosure and shows them on request', async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByText('Not applicable (1)')).toBeInTheDocument();
    expect(screen.queryByText(/Minimum entry age is 55/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show reasons/i }));

    expect(screen.getByText('Senior Health Protect')).toBeInTheDocument();
    expect(screen.getByText('Minimum entry age is 55; the customer is 32.')).toBeInTheDocument();
  });

  it('explains the situation when nothing applies rather than showing an empty panel', () => {
    renderPanel({ ...response, eligible: [] });
    expect(screen.getByText('No products apply to this customer')).toBeInTheDocument();
  });

  it('omits the ineligible section entirely when every product applies', () => {
    renderPanel({ ...response, ineligible: [] });
    expect(screen.queryByText(/Not applicable/)).not.toBeInTheDocument();
  });
});
