import React, { useState, useEffect } from 'react';
import { Store, Save, Lock } from 'lucide-react';
import { usePos } from '../context/PosContext.jsx';
import { api } from '../api/client.js';

export default function StoreConfigView() {
  const { activeStore, activeStoreSid, activeEmployee, notify, refreshAll } = usePos();

  const [form, setForm] = useState({
    store_name: '',
    address1: '',
    city: '',
    phone1: '',
    receipt_header: '',
    receipt_footer: '',
  });

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  useEffect(() => {
    if (activeStore) {
      setForm({
        store_name: activeStore.store_name || '',
        address1: activeStore.address1 || '',
        city: activeStore.city || '',
        phone1: activeStore.phone1 || '',
        receipt_header: activeStore.receipt_header || '',
        receipt_footer: activeStore.receipt_footer || '',
      });
    }
  }, [activeStore]);

  const handleSaveStore = async (e) => {
    e.preventDefault();
    try {
      await api.updateStore(activeStoreSid, {
        ...form,
        updated_by: activeEmployee?.empl_sid || 1,
      });
      await refreshAll(activeStoreSid);
      notify('Store settings saved');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleChangePin = async (e) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      notify('New PIN codes do not match', 'error');
      return;
    }
    try {
      await api.changePin({
        empl_sid: activeEmployee?.empl_sid || 1,
        current_pin: currentPin,
        new_pin: newPin,
      });
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      notify('Operator PIN code updated');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Settings</h1>
        <p className="text-xs text-slate-500">
          Configure store identity, printed receipt messages, and operator security
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm">Shop &amp; Receipt Information</span>
          </div>

          <form onSubmit={handleSaveStore} className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Shop Name *</label>
                <input
                  type="text"
                  value={form.store_name}
                  onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  value={form.phone1}
                  onChange={(e) => setForm({ ...form, phone1: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  value={form.address1}
                  onChange={(e) => setForm({ ...form, address1: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">City *</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Receipt Header Text</label>
              <input
                type="text"
                value={form.receipt_header}
                onChange={(e) => setForm({ ...form, receipt_header: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Receipt Footer &amp; Exchange Policy
              </label>
              <textarea
                rows={2}
                value={form.receipt_footer}
                onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Save Settings
              </button>
            </div>
          </form>
        </div>

        {/* Account Security Panel */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden h-fit">
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm">Account Security</span>
          </div>

          <form onSubmit={handleChangePin} className="p-5 space-y-3.5 text-xs">
            <div className="text-slate-600">
              Change PIN code for{' '}
              <strong className="text-slate-900">
                {activeEmployee?.full_name} ({activeEmployee?.user_name})
              </strong>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Current PIN Code *</label>
              <input
                type="password"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">New PIN Code *</label>
              <input
                type="password"
                minLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Confirm New PIN *</label>
              <input
                type="password"
                minLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
              >
                Update PIN Code
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
