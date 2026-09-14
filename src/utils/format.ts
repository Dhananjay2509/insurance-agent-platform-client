/**
 * Display helpers. Amounts arrive from the API as integers in minor currency
 * units (paise); every conversion to a human-readable figure happens here, so
 * no component does arithmetic on money.
 */

const LOCALES: Record<string, string> = { inr: 'en-IN', usd: 'en-US', eur: 'de-DE', gbp: 'en-GB' };

export const toMajorUnits = (minorUnits: number): number => minorUnits / 100;
export const toMinorUnits = (majorUnits: number): number => Math.round(majorUnits * 100);

export function formatMoney(minorUnits: number, currency = 'inr'): string {
  return new Intl.NumberFormat(LOCALES[currency.toLowerCase()] ?? 'en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(toMajorUnits(minorUnits));
}

/** Compact Indian-style rendering used on dense cards: "₹12.5L", "₹1.2Cr". */
export function formatMoneyCompact(minorUnits: number, currency = 'inr'): string {
  const major = toMajorUnits(minorUnits);
  const symbol = currency.toLowerCase() === 'inr' ? '₹' : '';

  if (currency.toLowerCase() !== 'inr') return formatMoney(minorUnits, currency);
  if (major >= 10_000_000) return `${symbol}${(major / 10_000_000).toFixed(2).replace(/\.00$/, '')}Cr`;
  if (major >= 100_000) return `${symbol}${(major / 100_000).toFixed(2).replace(/\.00$/, '')}L`;
  if (major >= 1_000) return `${symbol}${(major / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return formatMoney(minorUnits, currency);
}

export function formatDate(value: string | Date | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  // Rendered in UTC to match the server and the PDF. Dates such as a date of
  // birth are stored as UTC midnight; formatting them in local time would show
  // the previous day for any viewer west of UTC.
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatDateTime(value: string | Date | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

const CATEGORY_LABELS: Record<string, string> = {
  TERM: 'Term Life',
  HEALTH: 'Health',
  VEHICLE: 'Vehicle',
  OTHER: 'Other',
};

export const categoryLabel = (category: string): string => CATEGORY_LABELS[category] ?? category;

/** Turns SCREAMING_SNAKE enum values into readable labels: "PAYMENT_PENDING" -> "Payment pending". */
export function humaniseEnum(value: string): string {
  const lower = value.toLowerCase().replace(/_/g, ' ');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
