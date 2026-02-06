export type DateFilterOption = {
  label: string;
  months: number;
};

export const DATE_FILTER_OPTIONS: DateFilterOption[] = [
  { label: 'More than 6 months ago', months: 6 },
  { label: 'More than 1 year ago', months: 12 },
  { label: 'More than 2 years ago', months: 24 },
  { label: 'More than 3 years ago', months: 36 },
  { label: 'More than 5 years ago', months: 60 },
];

export function isOlderThan(dateString: string, months: number): boolean {
  const date = new Date(dateString);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return date < cutoff;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  const years = Math.floor(diffDays / 365);
  const remainingMonths = Math.floor((diffDays % 365) / 30);
  if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  return `${years}y ${remainingMonths}m ago`;
}
