async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  getBootstrap: (storeSid = 1) => request(`/api/settings/bootstrap?store_sid=${storeSid}`),
  updateStore: (storeSid, payload) =>
    request(`/api/settings/stores/${storeSid}`, { method: 'PUT', body: JSON.stringify(payload) }),
  login: (user_name, pin_code) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ user_name, pin_code }) }),
  logout: (empl_sid) =>
    request('/api/auth/logout', { method: 'POST', body: JSON.stringify({ empl_sid }) }),
  getAuditLogs: () => request('/api/audit-logs'),

  getCatalog: ({ storeSid = 1, search = '', dcsSid = '', lowStock = false } = {}) => {
    const params = new URLSearchParams({ store_sid: String(storeSid) });
    if (search) params.set('search', search);
    if (dcsSid) params.set('dcs_sid', String(dcsSid));
    if (lowStock) params.set('low_stock', '1');
    return request(`/api/catalog/items?${params.toString()}`);
  },
  lookupItem: (code, storeSid = 1) =>
    request(`/api/catalog/lookup?code=${encodeURIComponent(code)}&store_sid=${storeSid}`),
  createItem: (payload) =>
    request('/api/catalog/items', { method: 'POST', body: JSON.stringify(payload) }),
  updateItem: (itemSid, payload) =>
    request(`/api/catalog/items/${itemSid}`, { method: 'PUT', body: JSON.stringify(payload) }),
  createDcs: (payload) =>
    request('/api/catalog/dcs', { method: 'POST', body: JSON.stringify(payload) }),
  getAdjustments: (storeSid = 1) =>
    request(`/api/catalog/adjustments?store_sid=${storeSid}`),
  createAdjustment: (payload) =>
    request('/api/catalog/adjustments', { method: 'POST', body: JSON.stringify(payload) }),

  getDocuments: ({ storeSid = 1, isHeld, receiptType, search = '' } = {}) => {
    const params = new URLSearchParams({ store_sid: String(storeSid) });
    if (isHeld !== undefined) params.set('is_held', String(isHeld));
    if (receiptType !== undefined) params.set('receipt_type', String(receiptType));
    if (search) params.set('search', search);
    return request(`/api/documents?${params.toString()}`);
  },
  getDocument: (docSid) => request(`/api/documents/${docSid}`),
  createDocument: (payload) =>
    request('/api/documents', { method: 'POST', body: JSON.stringify(payload) }),
  deleteHeldDocument: (docSid) =>
    request(`/api/documents/${docSid}/held`, { method: 'DELETE' }),

  getCustomers: (search = '') =>
    request(`/api/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getCustomerHistory: (custSid) => request(`/api/customers/${custSid}/history`),
  createCustomer: (payload) =>
    request('/api/customers', { method: 'POST', body: JSON.stringify(payload) }),
  updateCustomer: (custSid, payload) =>
    request(`/api/customers/${custSid}`, { method: 'PUT', body: JSON.stringify(payload) }),
};
