import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotationApi } from '../../services';
import { ApiError } from '../../services/apiClient';
import { useToast } from '../../hooks/useToast';
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState } from '../../components/ui';
import { categoryLabel, formatMoney, formatMoneyCompact } from '../../utils/format';
import type { EligibleProductEntry, EligibleProductsResponse } from '../../types/api';

function EligibleCard({
  entry,
  customerId,
  onQuoted,
}: {
  entry: EligibleProductEntry;
  customerId: string;
  onQuoted: () => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);

  const handleSelect = async () => {
    setCreating(true);
    try {
      const { quotation } = await quotationApi.create({ customerId, productId: entry.product.id });
      onQuoted();
      navigate(`/quotations/${quotation.id}`);
    } catch (error) {
      toast(
        error instanceof ApiError ? error.message : 'Could not create the quotation.',
        'error',
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-semibold text-slate-900">{entry.product.name}</h4>
          <p className="mt-0.5 text-xs text-slate-500">{categoryLabel(entry.product.category)}</p>
        </div>
        <Badge tone="success">Eligible</Badge>
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{entry.product.description}</p>

      <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cover</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            {formatMoneyCompact(entry.quote?.coverageAmount ?? entry.product.coverageAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Premium</p>
          <p className="mt-0.5 text-sm font-semibold text-brand-700">
            {formatMoney(entry.quote?.premiumAmount ?? entry.product.basePremium)}
            <span className="text-xs font-normal text-slate-500">/year</span>
          </p>
        </div>
      </div>

      <Button className="mt-4 w-full" size="sm" onClick={handleSelect} loading={creating}>
        Select and quote
      </Button>
    </div>
  );
}

function IneligibleRow({ entry }: { entry: EligibleProductEntry }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-slate-700">{entry.product.name}</h4>
          <Badge>{categoryLabel(entry.product.category)}</Badge>
        </div>
        <ul className="mt-1.5 space-y-1">
          {entry.failures.map((failure) => (
            <li key={failure.rule} className="flex gap-2 text-sm text-slate-600">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              {failure.message}
            </li>
          ))}
        </ul>
      </div>
      <Badge tone="warning" className="shrink-0 self-start">
        Not applicable
      </Badge>
    </div>
  );
}

/**
 * The eligibility result, exactly as the server computed it.
 *
 * Ineligible products are shown with their reasons rather than hidden: the
 * agent has to be able to tell the customer why an option is not available.
 */
export function EligibleProducts({
  customerId,
  data,
  onQuoted,
}: {
  customerId: string;
  data: EligibleProductsResponse;
  onQuoted: () => void;
}) {
  const [showIneligible, setShowIneligible] = useState(false);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title={`Applicable products (${data.eligible.length})`}
          description="Priced for this customer's age, income and declarations."
        />
        <CardBody>
          {data.eligible.length === 0 ? (
            <EmptyState
              title="No products apply to this customer"
              description="Review the reasons below, or update the customer's details if something was captured incorrectly."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.eligible.map((entry) => (
                <EligibleCard
                  key={entry.product.id}
                  entry={entry}
                  customerId={customerId}
                  onQuoted={onQuoted}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {data.ineligible.length > 0 ? (
        <Card>
          <CardHeader
            title={`Not applicable (${data.ineligible.length})`}
            description="Why these products are not available to this customer."
            action={
              <Button variant="secondary" size="sm" onClick={() => setShowIneligible((open) => !open)}>
                {showIneligible ? 'Hide' : 'Show reasons'}
              </Button>
            }
          />
          {showIneligible ? (
            <CardBody className="space-y-3">
              {data.ineligible.map((entry) => (
                <IneligibleRow key={entry.product.id} entry={entry} />
              ))}
            </CardBody>
          ) : null}
        </Card>
      ) : null}

      <Alert tone="info">
        Eligibility is evaluated on the server from each product's stored rules — the same engine that
        guards quotation creation, so a product the customer does not qualify for cannot be quoted even
        by a crafted request.
      </Alert>
    </div>
  );
}
