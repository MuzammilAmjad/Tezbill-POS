import React from 'react';
import { Store, ShieldCheck, User, RefreshCw, LogOut } from 'lucide-react';
import { usePos } from '../context/PosContext.jsx';

export default function TopBar() {
  const { activeStore, activeStoreSid, activeEmployee, handleLogout, refreshAll } = usePos();
  const isAdmin = Boolean(activeEmployee?.admin);

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 print:hidden">
      <div className="flex items-center gap-2.5">
        <Store className="w-5 h-5 text-emerald-600" />
        <span className="font-bold text-slate-900 text-base">
          {activeStore?.store_name || 'Tezbill General Store'}
        </span>
        {activeStore?.city && (
          <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
            {activeStore.city}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
            isAdmin
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          {isAdmin ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          ) : (
            <User className="w-4 h-4 text-slate-600" />
          )}
          <span>
            {activeEmployee?.full_name} ({activeEmployee?.job_name})
          </span>
        </div>

        <button
          onClick={() => refreshAll(activeStoreSid)}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
          title="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
          title="Logout of POS"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
