/**
 * Merges a small delta of created/updated records (see requirements/auto_refresh.md) into an
 * existing dataset instead of replacing it — the core of auto-refresh traffic minimization.
 *
 * - Records in `delta` are upserted into `existing` by id: updated in place if already present
 *   (keeping its original position), appended if new.
 * - `stillVisible`, if passed, drops any merged record that no longer satisfies the screen's
 *   current filter/view — the backend still returns it in the delta (its timestamp changed)
 *   even if it no longer belongs in this particular view.
 * - `compare`, if passed, re-sorts the merged array — omit it to preserve existing order with
 *   new records appended at the end.
 */
export function mergeById<T extends { id: string }>(
  existing: readonly T[],
  delta: readonly T[],
  options?: {
    stillVisible?: (item: T) => boolean;
    compare?: (a: T, b: T) => number;
  }
): T[] {
  if (delta.length === 0) return existing.slice();

  const deltaById = new Map(delta.map((item) => [item.id, item]));
  const merged: T[] = [];
  const seenIds = new Set<string>();

  for (const item of existing) {
    const updated = deltaById.get(item.id);
    merged.push(updated ?? item);
    seenIds.add(item.id);
  }

  for (const item of delta) {
    if (!seenIds.has(item.id)) merged.push(item);
  }

  const filtered = options?.stillVisible ? merged.filter(options.stillVisible) : merged;
  if (options?.compare) filtered.sort(options.compare);
  return filtered;
}
