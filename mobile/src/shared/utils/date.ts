const DATE_FMT = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const DATETIME_FMT = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: string | null | undefined): string {
  const d = parseDate(value);
  return d ? DATE_FMT.format(d) : '—';
}

export function formatDateTime(value: string | null | undefined): string {
  const d = parseDate(value);
  return d ? DATETIME_FMT.format(d) : '—';
}

export function isOverdue(value: string | null | undefined): boolean {
  const d = parseDate(value);
  return d !== null && d < new Date();
}
