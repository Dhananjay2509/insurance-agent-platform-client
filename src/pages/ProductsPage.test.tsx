import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductsPage } from './ProductsPage';
import { productApi } from '../services';
import type { Product } from '../types/api';

vi.mock('../services', () => ({ productApi: { list: vi.fn() } }));

const mockedProductApi = vi.mocked(productApi);

const product = (overrides: Partial<Product>): Product => ({
  id: 'p1',
  name: 'Term Life Plus',
  category: 'TERM',
  description: 'Pure protection term cover for earning adults.',
  basePremium: 1_140_000,
  coverageAmount: 1_000_000_000,
  keyBenefits: ['Sum assured up to INR 1 crore', 'Fixed premium for the term'],
  eligibilityRules: { minAge: 18, maxAge: 60, minAnnualIncome: 30_000_000 },
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('<ProductsPage />', () => {
  beforeEach(() => {
    mockedProductApi.list.mockResolvedValue({ products: [product({})] });
  });

  it('renders products returned by the API, not a hardcoded list', async () => {
    render(<ProductsPage />);

    expect(await screen.findByText('Term Life Plus')).toBeInTheDocument();
    expect(screen.getByText(/pure protection term cover/i)).toBeInTheDocument();
    expect(mockedProductApi.list).toHaveBeenCalled();
  });

  it('shows the cover, premium and key benefits for each product', async () => {
    render(<ProductsPage />);

    expect(await screen.findByText('₹1Cr')).toBeInTheDocument();
    expect(screen.getByText('₹11,400')).toBeInTheDocument();
    expect(screen.getByText('Sum assured up to INR 1 crore')).toBeInTheDocument();
  });

  it('summarises each product’s eligibility rules in plain language', async () => {
    render(<ProductsPage />);

    expect(await screen.findByText('Age 18–60')).toBeInTheDocument();
    expect(screen.getByText('Income ₹3L+')).toBeInTheDocument();
  });

  it('describes a product with no rules as open to everyone', async () => {
    mockedProductApi.list.mockResolvedValue({
      products: [product({ id: 'p2', name: 'Open Plan', eligibilityRules: {} })],
    });

    render(<ProductsPage />);
    expect(await screen.findByText('Open to all customers')).toBeInTheDocument();
  });

  it('refetches with a category filter when the agent switches tabs', async () => {
    const user = userEvent.setup();
    render(<ProductsPage />);
    await screen.findByText('Term Life Plus');

    await user.click(screen.getByRole('button', { name: 'Health' }));

    await waitFor(() => {
      expect(mockedProductApi.list).toHaveBeenLastCalledWith(
        { category: 'HEALTH' },
        expect.anything(),
      );
    });
  });

  it('shows an empty state rather than a blank page when nothing matches', async () => {
    mockedProductApi.list.mockResolvedValue({ products: [] });
    render(<ProductsPage />);
    expect(await screen.findByText('No products in this category')).toBeInTheDocument();
  });

  it('shows a recoverable error when the catalogue cannot be loaded', async () => {
    mockedProductApi.list.mockRejectedValue(new Error('boom'));
    render(<ProductsPage />);

    expect(await screen.findByText('Could not load products')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
