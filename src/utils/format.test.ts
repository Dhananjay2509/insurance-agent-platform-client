import { describe, expect, it } from 'vitest';
import {
  calculateAge,
  formatDate,
  formatMoney,
  formatMoneyCompact,
  humaniseEnum,
  toMajorUnits,
  toMinorUnits,
} from './format';

describe('money formatting', () => {
  it('renders minor units as a whole-rupee currency string', () => {
    expect(formatMoney(1_140_000)).toBe('₹11,400');
    expect(formatMoney(0)).toBe('₹0');
  });

  it('round-trips between major and minor units without drift', () => {
    // 19.99 is the classic binary-floating-point trap; money must survive it.
    expect(toMinorUnits(19.99)).toBe(1999);
    expect(toMajorUnits(1999)).toBe(19.99);
    expect(toMinorUnits(toMajorUnits(1_234_567))).toBe(1_234_567);
  });

  it('uses Indian lakh/crore shorthand for large amounts', () => {
    expect(formatMoneyCompact(100_000_000)).toBe('₹10L');
    expect(formatMoneyCompact(1_000_000_000)).toBe('₹1Cr');
    expect(formatMoneyCompact(250_000_000)).toBe('₹25L');
  });

  it('falls back to standard formatting for other currencies', () => {
    expect(formatMoneyCompact(1_000_000, 'usd')).toContain('10,000');
  });
});

describe('date helpers', () => {
  it('formats an ISO date for display', () => {
    // Month abbreviations differ slightly between ICU versions ("Sep"/"Sept"),
    // so the assertion checks the parts rather than an exact string.
    expect(formatDate('2026-09-14T00:00:00.000Z')).toMatch(/^14 Sept? 2026$/);
  });

  it('renders UTC-midnight dates as that same calendar day', () => {
    // A date of birth must not shift a day for viewers west of UTC.
    expect(formatDate('1994-01-01T00:00:00.000Z')).toMatch(/^01 Jan 1994$/);
  });

  it('renders a placeholder rather than "Invalid Date"', () => {
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
  });

  it('counts age in completed years', () => {
    const thirtyYearsAgo = new Date();
    thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);
    thirtyYearsAgo.setDate(thirtyYearsAgo.getDate() - 1);
    expect(calculateAge(thirtyYearsAgo.toISOString())).toBe(30);

    const almostThirty = new Date();
    almostThirty.setFullYear(almostThirty.getFullYear() - 30);
    almostThirty.setDate(almostThirty.getDate() + 2);
    expect(calculateAge(almostThirty.toISOString())).toBe(29);
  });
});

describe('humaniseEnum', () => {
  it('turns screaming snake case into a readable label', () => {
    expect(humaniseEnum('PAYMENT_PENDING')).toBe('Payment pending');
    expect(humaniseEnum('SUCCEEDED')).toBe('Succeeded');
  });
});
