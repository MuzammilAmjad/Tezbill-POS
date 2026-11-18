export function formatPKR(amount) {
  const num = Number(amount || 0);
  return `Rs. ${num.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPKRWithDecimals(amount) {
  const num = Number(amount || 0);
  return `Rs. ${num.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const normalized = dateStr.includes('T') ? dateStr : `${dateStr.replace(' ', 'T')}Z`;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function matchesDateRange(dateStr, range = 'ALL', startDate = '', endDate = '') {
  if (!range || range === 'ALL') return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return true;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);

  if (range === 'DAILY' || range === 'TODAY') {
    return d >= todayStart && d < tomorrowStart;
  }

  if (range === 'YESTERDAY') {
    const yestStart = new Date(todayStart);
    yestStart.setDate(todayStart.getDate() - 1);
    return d >= yestStart && d < todayStart;
  }

  if (range === 'WEEKLY' || range === 'THIS_WEEK') {
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - 6);
    return d >= weekStart && d < tomorrowStart;
  }

  if (range === 'MONTHLY' || range === 'THIS_MONTH') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return d >= monthStart && d < tomorrowStart;
  }

  if (range === 'CUSTOM') {
    const s = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const e = endDate ? new Date(`${endDate}T23:59:59.999`) : null;
    if (s && d < s) return false;
    if (e && d > e) return false;
    return true;
  }

  return true;
}
