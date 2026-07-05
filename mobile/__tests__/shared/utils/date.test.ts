import { formatDate, formatDateTime, isOverdue } from '../../../src/shared/utils/date';

describe('date utils', () => {
  describe('formatDate', () => {
    test('returns a non-empty string for a valid date', () => {
      const result = formatDate('2024-01-15T10:00:00Z');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('includes year in the formatted output', () => {
      const result = formatDate('2024-01-15T10:00:00Z');
      expect(result).toContain('2024');
    });
  });

  describe('formatDateTime', () => {
    test('returns a non-empty string for a valid datetime', () => {
      const result = formatDateTime('2024-01-15T10:30:00Z');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('isOverdue', () => {
    test('returns true for a past date', () => {
      expect(isOverdue('2020-01-01')).toBe(true);
    });

    test('returns false for a future date', () => {
      expect(isOverdue('2099-01-01')).toBe(false);
    });

    test('returns true for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isOverdue(yesterday.toISOString())).toBe(true);
    });
  });
});
