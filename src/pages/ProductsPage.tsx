import { useState } from 'react';
import { useAsync } from '../hooks/useAsync';
import { productApi } from '../services';
import { PageHeader } from '../components/layout/PageHeader';
import { Alert, Badge, Card, CardBody, EmptyState, LoadingPanel } from '../components/ui';
import { categoryLabel, formatMoney, formatMoneyCompact } from '../utils/format';
import { cn } from '../utils/cn';
import type { EligibilityRules, Product, ProductCategory } from '../types/api';

const CATEGORIES: { value: '' | ProductCategory; label: string }[] = [
  { value: '', label: 'All products' },
  { value: 'TERM', label: 'Term Life' },
  { value: 'HEALTH', label: 'Health' },
  { value: 'VEHICLE', label: 'Vehicle' },
  { value: 'OTHER', label: 'Other' },
];

const CATEGORY_TONES: Record<ProductCategory, 'info' | 'success' | 'warning' | 'neutral'> = {
  TERM: 'info',
  HEALTH: 'success',
  VEHICLE: 'warning',
  OTHER: 'neutral',
};

/** Renders the product's stored rules as plain-English criteria. */
function eligibilitySummary(rules: EligibilityRules): string[] {
  const lines: string[] = [];

  if (rules.minAge !== undefined && rules.maxAge !== undefined) lines.push(`Age ${rules.minAge}–${rules.maxAge}`);
  else if (rules.minAge !== undefined) lines.push(`Age ${rules.minAge}+`);
  else if (rules.maxAge !== undefined) lines.push(`Up to age ${rules.maxAge}`);

  if (rules.minAnnualIncome !== undefined) {
    lines.push(`Income ${formatMoneyCompact(rules.minAnnualIncome)}+`);
  }
  if (rules.requiresVehicle) {
    const types = rules.allowedVehicleTypes?.length
      ? rules.allowedVehicleTypes.map((type) => type.replace('_', ' ').toLowerCase()).join(', ')
      : 'any vehicle';
    lines.push(`Must own ${types}`);
  }
  if (rules.excludeSmokers) lines.push('Non-smokers only');
  if (rules.excludePreExistingConditions) lines.push('No pre-existing conditions');
  if (lines.length === 0) lines.push('Open to all customers');

  return lines;
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="flex h-full flex-col">
      <CardBody className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">{product.name}</h3>
          <Badge tone={CATEGORY_TONES[product.category]}>{categoryLabel(product.category)}</Badge>
        </div>

        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{product.description}</p>

        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Cover up to</dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-900">
              {formatMoneyCompact(product.coverageAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">From</dt>
            <dd className="mt-0.5 text-sm font-semibold text-brand-700">
              {formatMoney(product.basePremium)}
              <span className="text-xs font-normal text-slate-500">/year</span>
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Key benefits</p>
          <ul className="mt-2 space-y-1.5">
            {product.keyBenefits.slice(0, 3).map((benefit) => (
              <li key={benefit} className="flex gap-2 text-sm text-slate-600">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Who qualifies</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {eligibilitySummary(product.eligibilityRules).map((line) => (
              <span key={line} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                {line}
              </span>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export function ProductsPage() {
  const [category, setCategory] = useState<'' | ProductCategory>('');
  const { data, loading, error, reload } = useAsync(
    (signal) => productApi.list({ category: category || undefined }, signal),
    [category],
  );

  return (
    <>
      <PageHeader
        title="Insurance products"
        description="The live catalogue, served from the database. Eligibility criteria come from each product's stored rules."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {CATEGORIES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setCategory(option.value)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              category === option.value
                ? 'bg-brand-600 text-white'
                : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error ? (
        <Alert tone="error" title="Could not load products">
          {error}{' '}
          <button type="button" onClick={reload} className="font-medium underline">
            Try again
          </button>
        </Alert>
      ) : loading ? (
        <LoadingPanel label="Loading products…" />
      ) : data && data.products.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="No products in this category"
            description="Try a different category, or run the seed script to load the demo catalogue."
          />
        </Card>
      )}
    </>
  );
}
