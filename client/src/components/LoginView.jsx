import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { usePos } from '../context/PosContext.jsx';
import { api } from '../api/client.js';

export default function LoginView() {
  const { setActiveEmployee, notify, refreshAll, activeStoreSid } = usePos();
  const [username, setUsername] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.login(username, pinCode);
      setActiveEmployee(res.employee);
      await refreshAll(activeStoreSid);
      notify(`Signed in as ${res.employee.full_name}`);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
        <div className="px-6 py-6 bg-slate-950 text-white text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white text-xl mx-auto mb-3">
            TB
          </div>
          <h1 className="text-xl font-bold tracking-tight">Tezbill POS</h1>
          <p className="text-xs text-slate-400 mt-1">Sign in to access the Point of Sale register</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-emerald-600"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">PIN Code</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="Enter PIN code"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:border-emerald-600"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs cursor-pointer mt-2"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
