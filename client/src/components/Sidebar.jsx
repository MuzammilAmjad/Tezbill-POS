import React from 'react';
import { ShoppingCart, Package, Users, FileText, ShieldCheck, LogOut } from 'lucide-react';
import { usePos } from '../context/PosContext.jsx';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { activeEmployee, handleLogout } = usePos();
  const isAdmin = Boolean(activeEmployee?.admin);

  const navItems = [
    { id: 'pos', label: 'New Sale (POS)', icon: ShoppingCart },
    { id: 'inventory', label: 'Products & Stock', icon: Package },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'documents', label: 'Sales History', icon: FileText },
  ];

  if (isAdmin) {
    navItems.push({ id: 'audit', label: 'Audit Log', icon: ShieldCheck });
  }

  return (
    <aside className="w-60 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 shrink-0 select-none">
      <div className="px-5 py-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-base">
          TB
        </div>
        <div>
          <div className="font-bold text-white text-lg leading-none">Tezbill</div>
          <div className="text-xs text-slate-400 mt-1">Point of Sale</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="text-xs">
          <div className="text-slate-400">Signed in as</div>
          <div className="font-semibold text-white mt-0.5">{activeEmployee?.full_name}</div>
          <div className="text-[11px] text-emerald-400 font-medium">{activeEmployee?.job_name}</div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
