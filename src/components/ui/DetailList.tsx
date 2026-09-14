import type { ReactNode } from 'react';

export interface DetailItem {
  label: string;
  value: ReactNode;
}

/** Label/value grid used for profile and quotation summaries. */
export function DetailList({ items, columns = 2 }: { items: DetailItem[]; columns?: 1 | 2 | 3 }) {
  const gridCols = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }[columns];

  return (
    <dl className={`grid grid-cols-1 gap-x-6 gap-y-4 ${gridCols}`}>
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</dt>
          <dd className="mt-1 break-words text-sm font-medium text-slate-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
