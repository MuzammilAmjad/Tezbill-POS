import React, { useState, useMemo } from 'react';
import { Search, Printer, Eye, X } from 'lucide-react';
import { usePos } from '../context/PosContext.jsx';
import { formatPKR, formatDateTime, matchesDateRange } from '../utils/formatters.js';

export default function DocumentsView() {
  const { completedDocs, setReceiptModalDoc } = usePos();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [inspectDoc, setInspectDoc] = useState(null);

  const customerNames = useMemo(() => {
    const names = new Set();
    completedDocs.forEach((d) => {
      names.add(`${d.bt_first_name} ${d.bt_last_name}`.trim());
    });
    return ['ALL', ...Array.from(names)];
  }, [completedDocs]);

  const filteredDocs = useMemo(() => {
    return completedDocs.filter((doc) => {
      if (!matchesDateRange(doc.invc_post_date, dateFilter)) return false;
      const fullCust = `${doc.bt_first_name} ${doc.bt_last_name}`.trim();
      if (customerFilter !== 'ALL' && fullCust !== customerFilter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const itemsStr = (doc.items || []).map((i) => `${i.description1} ${i.alu}`).join(' ');
      return (
        doc.doc_no.toLowerCase().includes(q) ||
        fullCust.toLowerCase().includes(q) ||
        itemsStr.toLowerCase().includes(q)
      );
    });
  }, [completedDocs, dateFilter, customerFilter, search]);

  return (
    <div className="p-6 space-y-5 h-full flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Sales</h1>
          <p className="text-xs text-slate-500">
            Review completed transactions, inspect item margins, and reprint invoices
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice, customer, item..."
              className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium"
          >
            <option value="ALL">All Dates</option>
            <option value="TODAY">Today</option>
            <option value="YESTERDAY">Yesterday</option>
            <option value="WEEKLY">Last 7 Days</option>
            <option value="MONTHLY">This Month</option>
          </select>

          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium"
          >
            {customerNames.map((name) => (
              <option key={name} value={name}>
                {name === 'ALL' ? 'All Customers' : name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bills Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-700">
          <span>Sales History ({filteredDocs.length} invoices)</span>
          <span>
            Total: {formatPKR(filteredDocs.reduce((s, d) => s + Number(d.transaction_total_amt || 0), 0))}
          </span>
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 sticky top-0">
              <tr>
                <th className="py-3 px-4 font-semibold">Invoice #</th>
                <th className="py-3 px-4 font-semibold">Date &amp; Time</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Cashier</th>
                <th className="py-3 px-4 font-semibold text-right">Units</th>
                <th className="py-3 px-4 font-semibold">Payment</th>
                <th className="py-3 px-4 font-semibold text-right">Total</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                    No sales invoices match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const unitCount = (doc.items || []).reduce((s, i) => s + Number(i.qty || 0), 0);
                  return (
                    <tr key={doc.doc_sid} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900">
                        {doc.doc_no}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {formatDateTime(doc.invc_post_date)}
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium text-xs">
                        {doc.bt_first_name} {doc.bt_last_name}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">{doc.cashier_name}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs">{unitCount}</td>
                      <td className="py-3 px-4 text-xs">
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
                          {doc.tenders?.[0]?.tender_name || 'Cash'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatPKR(doc.transaction_total_amt)}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => setInspectDoc(doc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                        <button
                          onClick={() => setReceiptModalDoc(doc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Details & Margin Inspector Modal */}
      {inspectDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-semibold text-sm">Invoice {inspectDoc.doc_no}</h3>
              <button
                onClick={() => setInspectDoc(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Date &amp; Time</span>
                  <strong className="text-slate-900">{formatDateTime(inspectDoc.invc_post_date)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Customer</span>
                  <strong className="text-slate-900">
                    {inspectDoc.bt_first_name} {inspectDoc.bt_last_name}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Cashier</span>
                  <strong className="text-slate-900">{inspectDoc.cashier_name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Payment Method</span>
                  <strong className="text-emerald-700">
                    {inspectDoc.tenders?.[0]?.tender_name || 'Cash'}
                  </strong>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Cost at Sale</th>
                      <th className="py-2.5 px-3 text-right">Profit / Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(inspectDoc.items || []).map((it) => {
                      const profit = (Number(it.price) - Number(it.cost || 0)) * Number(it.qty);
                      return (
                        <tr key={it.doc_item_sid}>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{it.description1}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{it.alu}</td>
                          <td className="py-2.5 px-3 text-right font-semibold">{it.qty}</td>
                          <td className="py-2.5 px-3 text-right">{formatPKR(it.price)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-500">{formatPKR(it.cost)}</td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              profit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {formatPKR(profit)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <div className="text-sm font-bold text-slate-900">
                  Grand Total: <span className="text-emerald-700">{formatPKR(inspectDoc.transaction_total_amt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInspectDoc(null)}
                    className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      const d = inspectDoc;
                      setInspectDoc(null);
                      setReceiptModalDoc(d);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
