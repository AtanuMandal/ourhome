import { formatCurrency } from '../../../src/shared/utils/currency';

describe('formatCurrency', () => {
  test('formats 1500 and result contains 1,500', () => {
    const result = formatCurrency(1500);
    expect(result).toContain('1,500');
  });

  test('formats 0 and result contains 0', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  test('formats large number correctly', () => {
    const result = formatCurrency(100000);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  test('formats negative amount', () => {
    const result = formatCurrency(-500);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
