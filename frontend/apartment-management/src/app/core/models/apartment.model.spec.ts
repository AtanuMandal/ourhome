import { formatApartmentLabel } from './apartment.model';

describe('formatApartmentLabel', () => {
  it('formats block, floor, and apartment number in the required order', () => {
    expect(formatApartmentLabel({
      apartmentNumber: '101',
      blockName: 'A',
      floorNumber: 2,
    })).toBe('A 2-101');
  });

  it('falls back gracefully when block name is unavailable', () => {
    expect(formatApartmentLabel({
      apartmentNumber: '101',
      floorNumber: 2,
    })).toBe('2-101');
  });
});
