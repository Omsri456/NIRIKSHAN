/** Formats a number as Indian Rupees using the lakh/crore grouping. */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Compact currency for stat cards, e.g. ₹48.5 Cr */
export function formatCurrencyCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  const abs = Math.abs(amount);
  if (abs >= 1e7) return `₹${(amount / 1e7).toFixed(1)} Cr`;
  if (abs >= 1e5) return `₹${(amount / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `₹${(amount / 1e3).toFixed(1)} K`;
  return `₹${amount.toFixed(0)}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-IN').format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Converts CONSTANT_CASE enum values into readable labels, e.g. IN_PROGRESS -> In Progress */
export function humanize(value: string | null | undefined): string {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Normalizes transliterated Gujarati / regional text into clear English summaries.
 */
export function translateWorkDescription(text: string | null | undefined, category?: string): string {
  if (!text) return 'MPLADS Development Project';

  const lower = text.toLowerCase();
  
  // Check if text has local Gujarati / regional transliterations
  const isRegional = /\b(kam|kaam|faliya|faliyu|kuva|kuvo|nu|ma|shala|aanganvadi|vistar|game|sheri|pase|sudhi)\b/i.test(lower);
  if (!isRegional) return text;

  const components: string[] = [];

  if (/c\.?c\.?\s*road|paver|block/i.test(lower)) {
    components.push('Cement Concrete Road Construction');
  } else if (/kuva|kuvo|paani|pani|water/i.test(lower)) {
    components.push('Community Drinking Water Well Project');
  } else if (/aanganvadi|anganwadi/i.test(lower)) {
    components.push('Anganwadi Child Healthcare Center Project');
  } else if (/aashram|shala|school/i.test(lower)) {
    components.push('Ashram School Infrastructure Project');
  } else if (/gutter|nala|drain/i.test(lower)) {
    components.push('Drainage & Sanitation Infrastructure Work');
  } else {
    components.push(category || 'Community Infrastructure Work');
  }

  // Extract location/locality hints
  const villageMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:game|vistar|faliya)/i);
  if (villageMatch && villageMatch[1]) {
    components.push(`at ${villageMatch[1]}`);
  }

  return `${components.join(' ')} (${text})`;
}
