import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PaymentReturnPage } from './PaymentReturnPage';
import { paymentApi } from '../services';
import type { PublicPaymentStatus } from '../types/api';

vi.mock('../services', () => ({ paymentApi: { publicStatus: vi.fn() } }));

const mockedPaymentApi = vi.mocked(paymentApi);

const status = (overrides: Partial<PublicPaymentStatus> = {}): PublicPaymentStatus => ({
  quotationReference: 'QTN-2026-A1B2C3D4',
  productName: 'Term Life Plus',
  customerFirstName: 'Ananya',
  amount: 969_000,
  currency: 'inr',
  paymentStatus: 'PENDING',
  policy: null,
  ...overrides,
});

function renderReturn(outcome: 'success' | 'cancelled', reference = 'QTN-2026-A1B2C3D4') {
  return render(
    <MemoryRouter initialEntries={[`/payment/${outcome}?ref=${reference}`]}>
      <Routes>
        <Route path={`/payment/${outcome}`} element={<PaymentReturnPage outcome={outcome} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('<PaymentReturnPage />', () => {
  beforeEach(() => {
    mockedPaymentApi.publicStatus.mockResolvedValue(status());
  });

  it('does NOT claim success just because Stripe redirected here', async () => {
    // The redirect is a browser navigation and proves nothing; only the webhook
    // does. Until the backend reports SUCCEEDED, the page says "confirming".
    renderReturn('success');

    expect(await screen.findByText('Confirming your payment')).toBeInTheDocument();
    expect(screen.queryByText(/your cover has started/i)).not.toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('confirms the policy once the backend reports it active', async () => {
    mockedPaymentApi.publicStatus.mockResolvedValue(
      status({
        paymentStatus: 'SUCCEEDED',
        policy: {
          policyNumber: 'POL-2026-X9Y8Z7W6',
          status: 'ACTIVE',
          startDate: '2026-09-14T00:00:00.000Z',
          endDate: '2027-09-14T00:00:00.000Z',
        },
      }),
    );

    renderReturn('success');

    expect(await screen.findByText(/your cover has started/i)).toBeInTheDocument();
    expect(screen.getByText('POL-2026-X9Y8Z7W6')).toBeInTheDocument();
    expect(screen.getByText('Succeeded')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('renders the amount and reference from the server, not the query string', async () => {
    renderReturn('success');

    expect(await screen.findByText('₹9,690')).toBeInTheDocument();
    expect(screen.getByText('QTN-2026-A1B2C3D4')).toBeInTheDocument();
    expect(screen.getByText('Term Life Plus')).toBeInTheDocument();
  });

  it('reassures the customer that nothing was charged when they cancel', async () => {
    renderReturn('cancelled');

    expect(await screen.findByText('Payment cancelled')).toBeInTheDocument();
    expect(screen.getByText(/no money has been taken/i)).toBeInTheDocument();
  });

  it('still shows the confirmed policy if the customer reopens the cancel link after paying', async () => {
    mockedPaymentApi.publicStatus.mockResolvedValue(
      status({
        paymentStatus: 'SUCCEEDED',
        policy: {
          policyNumber: 'POL-2026-X9Y8Z7W6',
          status: 'ACTIVE',
          startDate: '2026-09-14T00:00:00.000Z',
          endDate: '2027-09-14T00:00:00.000Z',
        },
      }),
    );

    renderReturn('cancelled');
    expect(await screen.findByText(/your cover has started/i)).toBeInTheDocument();
  });

  it('explains the problem when the link has no reference', async () => {
    render(
      <MemoryRouter initialEntries={['/payment/success']}>
        <Routes>
          <Route path="/payment/success" element={<PaymentReturnPage outcome="success" />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Missing reference')).toBeInTheDocument();
    expect(mockedPaymentApi.publicStatus).not.toHaveBeenCalled();
  });

  it('shows a clear message when the reference cannot be found', async () => {
    mockedPaymentApi.publicStatus.mockRejectedValue(new Error('not found'));
    renderReturn('success');

    expect(await screen.findByText('We could not find this payment')).toBeInTheDocument();
  });
});
