import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Search, RefreshCw } from 'lucide-react';
import { api } from '../api/client.js';
import { usePos } from '../context/PosContext.jsx';
import { formatDateTime } from '../utils/formatters.js';

export default function AuditLogView() {
  const { notify } = usePos();
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs();
      setLogs(res.logs || []);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filtered = logs.filter((lg) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      lg.actor_name.toLowerCase().includes(q) ||
      lg.action_type.toLowerCase().includes(q) ||
      lg.details.toLowerCase().includes(q) ||
      (lg.entity_ref || '').toLowerCase().includes(q)
    );
  });

  const badgeStyle = (action) => {
    if (action.includes('SALE')) return 'bg-emerald-100 text-emerald-800';
    if (action.includes('STOCK') || action.includes('PRODUCT')) return 'bg-blue-100 text-blue-800';
    if (action.includes('LOGIN')) return 'bg-purple-100 text-purple-800';
    if (action.includes('LOGOUT')) return 'bg-slate-200 text-slate-700';
    return 'bg-amber-100 text-amber-800';
  };

  return (
    <div className="p-6 space-y-4 h-full flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-slate-900">Audit Log</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete record of every login, sale bill, stock update, and product change across all operators
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by user, action, or bill..."
              className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>

          <button
            onClick={loadLogs}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Log
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 sticky top-0">
              <tr>
                <th className="py-3 px-4 font-semibold">Date &amp; Time</th>
                <th className="py-3 px-4 font-semibold">Operator</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Reference</th>
                <th className="py-3 px-4 font-semibold">Activity Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                    Loading activity audit log...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filtered.map((lg) => (
                  <tr key={lg.log_sid} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(lg.created_datetime)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {lg.actor_name}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {lg.actor_role}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${badgeStyle(
                          lg.action_type
                        )}`}
                      >
                        {lg.action_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {lg.entity_ref || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-800">{lg.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
