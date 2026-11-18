import React, { useState } from 'react';
import { ShieldCheck, User, Lock } from 'lucide-react';
import { usePos } from '../context/PosContext.jsx';
import { api } from '../api/client.js';

export default function LoginView() {
  const { setActiveEmployee, notify, refreshAll, activeStoreSid } = usePos();
  const [username, setUsername] = useState('admin');
  const [pinCode, setPinCode] = useState('1111');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.login(username, pinCode);
      setActiveEmployee(res.employee);
      await refreshAll(activeStoreSid);
      notify(`Signed in as ${res.employee.full_name} (${res.employee.job_name})`);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const quickLogin = async (user, pin) => {
    setUsername(user);
    setPinCode(pin);
    setSubmitting(true);
    try {
      const res = await api.login(user, pin);
      setActiveEmployee(res.employee);
      await refreshAll(activeStoreSid);
      notify(`Signed in as ${res.employee.full_name} (${res.employee.job_name})`);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="px-6 py-6 bg-slate-950 text-white text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white text-xl mx-auto mb-3">
            TB
          </div>
          <h1 className="text-xl font-bold tracking-tight">Tezbill POS</h1>
          <p className="text-xs text-slate-400 mt-1">Sign in to access the Point of Sale register</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Quick Role Selection Cards */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">
              Quick Sign In (Click to Login)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => quickLogin('admin', '1111')}
                className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Main Admin</span>
                </div>
                <div className="text-xs font-semibold text-slate-800 mt-1">Hamza Tariq</div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  User: admin &bull; PIN: 1111
                </div>
                <div className="text-[10px] text-emerald-700 font-medium mt-1">
                  Full Access + Audit Log
                </div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('cashier', '2222')}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                  <User className="w-4 h-4 text-slate-600" />
                  <span>Shop Cashier</span>
                </div>
                <div className="text-xs font-semibold text-slate-800 mt-1">Bilal Ahmed</div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  User: cashier &bull; PIN: 2222
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-1">
                  POS Billing &amp; Sales
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2 border-t border-slate-200 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">PIN Code</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs cursor-pointer"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
