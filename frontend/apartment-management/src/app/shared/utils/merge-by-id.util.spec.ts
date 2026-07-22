import { mergeById } from './merge-by-id.util';

interface Item {
  id: string;
  value: string;
}

describe('mergeById', () => {
  it('upserts a changed record in place, keeping its original position', () => {
    const existing: Item[] = [
      { id: '1', value: 'a' },
      { id: '2', value: 'b' },
      { id: '3', value: 'c' },
    ];
    const delta: Item[] = [{ id: '2', value: 'b-updated' }];

    const merged = mergeById(existing, delta);

    expect(merged.map(i => i.id)).toEqual(['1', '2', '3']);
    expect(merged.find(i => i.id === '2')?.value).toBe('b-updated');
  });

  it('appends a new record not present in the existing list', () => {
    const existing: Item[] = [{ id: '1', value: 'a' }];
    const delta: Item[] = [{ id: '2', value: 'b' }];

    const merged = mergeById(existing, delta);

    expect(merged.map(i => i.id)).toEqual(['1', '2']);
  });

  it('returns a copy of the existing array unchanged when the delta is empty', () => {
    const existing: Item[] = [{ id: '1', value: 'a' }];

    const merged = mergeById(existing, []);

    expect(merged).toEqual(existing);
    expect(merged).not.toBe(existing);
  });

  it('drops merged records that no longer satisfy stillVisible', () => {
    const existing: Item[] = [{ id: '1', value: 'Pending' }];
    const delta: Item[] = [{ id: '1', value: 'CheckedOut' }];

    const merged = mergeById(existing, delta, {
      stillVisible: item => item.value === 'Pending',
    });

    expect(merged).toEqual([]);
  });

  it('keeps a merged record that still satisfies stillVisible', () => {
    const existing: Item[] = [{ id: '1', value: 'Pending' }];
    const delta: Item[] = [{ id: '1', value: 'Pending' }];

    const merged = mergeById(existing, delta, {
      stillVisible: item => item.value === 'Pending',
    });

    expect(merged.map(i => i.id)).toEqual(['1']);
  });

  it('re-sorts the merged array when compare is passed', () => {
    const existing: Item[] = [
      { id: '1', value: '3' },
      { id: '2', value: '1' },
    ];
    const delta: Item[] = [{ id: '3', value: '2' }];

    const merged = mergeById(existing, delta, {
      compare: (a, b) => Number(a.value) - Number(b.value),
    });

    expect(merged.map(i => i.id)).toEqual(['2', '3', '1']);
  });

  it('preserves insertion order (existing first, new appended) when compare is omitted', () => {
    const existing: Item[] = [
      { id: '1', value: 'a' },
      { id: '2', value: 'b' },
    ];
    const delta: Item[] = [
      { id: '2', value: 'b-updated' },
      { id: '3', value: 'c' },
    ];

    const merged = mergeById(existing, delta);

    expect(merged.map(i => i.id)).toEqual(['1', '2', '3']);
  });
});
