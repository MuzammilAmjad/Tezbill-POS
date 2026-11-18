import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit3, Power, History, X } from 'lucide-react';
import { usePos } from '../context/PosContext.jsx';
import { api } from '../api/client.js';
import { formatPKR, formatDateTime } from '../utils/formatters.js';

export default function SuppliersView() {
  const { activeStoreSid, activeEmployee, vendors, vouchers, notify, refreshAll } = usePos();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [historyVendor, setHistoryVendor] = useState(null);

  const [form, setForm] = useState({
    vend_code: '',
    vend_name: '',
    contact_name: '',
    phone1: '',
    address1: '',
    city: 'Lahore',
    active: true,
  });

  const filteredVendors = useMemo(() => {
    if (!search.trim()) return vendors;
    const q = search.trim().toLowerCase();
    return vendors.filter(
      (v) =>
        v.vend_code.toLowerCase().includes(q) ||
        v.vend_name.toLowerCase().includes(q) ||
        (v.phone1 || '').toLowerCase().includes(q) ||
        (v.address1 || '').toLowerCase().includes(q)
    );
  }, [vendors, search]);

  const openAddModal = () => {
    const nextNum = vendors.length + 1;
    setEditingVendor(null);
    setForm({
      vend_code: `SUP-00${nextNum}`,
      vend_name: '',
      contact_name: '',
      phone1: '',
      address1: '',
      city: 'Lahore',
      active: true,
    });
    setShowModal(true);
  };

  const openEditModal = (v) => {
    setEditingVendor(v);
    setForm({
      vend_code: v.vend_code,
      vend_name: v.vend_name,
      contact_name: v.contact_name || '',
      phone1: v.phone1 || '',
      address1: v.address1 || '',
      city: v.city || 'Lahore',
      active: Boolean(v.active),
    });
    setShowModal(true);
  };

  const handleSaveVendor = async (e) => {
    e.preventDefault();
    try {
      if (editingVendor) {
        await api.updateVendor(editingVendor.vend_sid, {
          ...form,
          updated_by: activeEmployee?.empl_sid || 1,
        });
        notify(`Updated supplier "${form.vend_name}"`);
      } else {
        await api.createVendor({
          ...form,
          created_by: activeEmployee?.empl_sid || 1,
        });
        notify(`Added supplier "${form.vend_name}"`);
      }
      setShowModal(false);
      await refreshAll(activeStoreSid);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleToggleActive = async (v) => {
    try {
      await api.toggleVendorActive(v.vend_sid, !v.active, activeEmployee?.empl_sid || 1);
      await refreshAll(activeStoreSid);
      notify(`Supplier ${v.active ? 'deactivated' : 'activated'}`);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const vendorPurchases = useMemo(() => {
    if (!historyVendor) return [];
    return vouchers.filter((vo) => vo.vend_sid === historyVendor.vend_sid);
  }, [historyVendor, vouchers]);

  return (
    <div className="p-6 space-y-5 h-full flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Suppliers</h1>
          <p className="text-xs text-slate-500">
            Manage supplier directory, contact details, and purchase history
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {/* Suppliers Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="font-bold text-xs text-slate-700">
            Supplier Directory ({filteredVendors.length})
          </span>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suppliers..."
              className="w-full pl-8 pr-3 py-1.5 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 sticky top-0">
              <tr>
                <th className="py-3 px-4 font-semibold">Supplier Code</th>
                <th className="py-3 px-4 font-semibold">Supplier Name</th>
                <th className="py-3 px-4 font-semibold">Phone</th>
                <th className="py-3 px-4 font-semibold">Address</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Purchases</th>
                <th className="py-3 px-4 font-semibold text-right">Total Value</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVendors.map((v) => (
                <tr key={v.vend_sid} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono text-xs font-bold text-slate-700">
                    {v.vend_code}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{v.vend_name}</td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-600">
                    {v.phone1 || '—'}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">
                    {v.address1 ? `${v.address1}, ${v.city}` : v.city || '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        v.active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {v.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs font-semibold">
                    {v.purchases_count || 0}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {formatPKR(v.total_purchased)}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => setHistoryVendor(v)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      <History className="w-3 h-3 text-blue-600" />
                      History
                    </button>
                    <button
                      onClick={() => openEditModal(v)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(v)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      <Power className="w-3 h-3" />
                      {v.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {editingVendor ? 'Edit Supplier' : 'Add Supplier'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveVendor} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier Code *</label>
                  <input
                    type="text"
                    value={form.vend_code}
                    onChange={(e) => setForm({ ...form, vend_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone1}
                    onChange={(e) => setForm({ ...form, phone1: e.target.value })}
                    placeholder="0300-..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  value={form.vend_name}
                  onChange={(e) => setForm({ ...form, vend_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={form.address1}
                  onChange={(e) => setForm({ ...form, address1: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                <span className="font-semibold text-slate-700">Supplier is active</span>
              </label>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Purchase History Modal */}
      {historyVendor && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                Supplier Details &amp; Purchase History &bull; {historyVendor.vend_name}
              </h3>
              <button
                onClick={() => setHistoryVendor(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Supplier Code</span>
                  <strong className="font-mono text-slate-900">{historyVendor.vend_code}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Phone</span>
                  <strong className="text-slate-900">{historyVendor.phone1 || '—'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Purchased</span>
                  <strong className="text-emerald-700">{formatPKR(historyVendor.total_purchased)}</strong>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Purchase #</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-right">Units</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vendorPurchases.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          No purchase history recorded for this supplier.
                        </td>
                      </tr>
                    ) : (
                      vendorPurchases.map((vo) => (
                        <tr key={vo.vou_sid}>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">{vo.vou_no}</td>
                          <td className="py-2 px-3 text-slate-600">
                            {formatDateTime(vo.created_datetime)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">{vo.total_qty}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {formatPKR(vo.vou_total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setHistoryVendor(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
