import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { usePos } from '../context/PosContext.jsx';
import { api } from '../api/client.js';
import { formatPKR } from '../utils/formatters.js';

export default function CustomersView() {
  const { activeStoreSid, customers, notify, refreshAll } = usePos();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone_no: '',
    city: 'Lahore',
  });

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.phone_no.toLowerCase().includes(q)
    );
  });

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.createCustomer({ ...form, store_sid: activeStoreSid });
      setShowModal(false);
      setForm({ first_name: '', last_name: '', phone_no: '', city: 'Lahore' });
      await refreshAll(activeStoreSid);
      notify('Customer added');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="p-6 space-y-4 h-full flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Customers</h1>
          <p className="text-xs text-slate-500">Customer contact list and purchase summary</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or phone..."
              className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 sticky top-0">
              <tr>
                <th className="py-3 px-4 font-semibold">Customer ID</th>
                <th className="py-3 px-4 font-semibold">Customer Name</th>
                <th className="py-3 px-4 font-semibold">Phone Number</th>
                <th className="py-3 px-4 font-semibold">City</th>
                <th className="py-3 px-4 font-semibold text-right">Total Bills</th>
                <th className="py-3 px-4 font-semibold text-right">Total Purchases</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.cust_sid} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono text-xs text-slate-500">{c.cust_id}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {c.first_name} {c.last_name}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-700">{c.phone_no}</td>
                  <td className="py-3 px-4 text-slate-600">{c.city}</td>
                  <td className="py-3 px-4 text-right text-slate-700">{c.total_transactions}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700">
                    {formatPKR(c.ytd_sale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-semibold text-sm">Add Customer</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  value={form.phone_no}
                  onChange={(e) => setForm({ ...form, phone_no: e.target.value })}
                  placeholder="0300-1234567"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
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
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
