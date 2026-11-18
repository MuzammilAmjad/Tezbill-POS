import React, { useState, useEffect, useCallback } from 'react';
import { Search, Printer, TrendingUp, FileText, Package, Wallet } from 'lucide-react';
import { usePos } from '../context/PosContext.jsx';
import { api } from '../api/client.js';
import { formatPKR, formatDateTime } from '../utils/formatters.js';

export default function DocumentsView() {
  const { activeStoreSid, catalogItems, bootstrap, setReceiptModalDoc, notify } = usePos();
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getDocuments({ storeSid: activeStoreSid, isHeld: 0, search });
      setDocuments(res.documents || []);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [activeStoreSid, search, notify]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const totalSales = documents.reduce((sum, d) => sum + Number(d.transaction_total_amt || 0), 0);

  return (
    <div className="p-6 space-y-5 h-full flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Sales History &amp; Summary</h1>
          <p className="text-xs text-slate-500">Overview of completed sales bills and receipts</p>
        </div>

        <div className="relative w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bill number or customer..."
            className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
          />
        </div>
      </div>

      {/* 4 Clean Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total Sales</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-bold text-xl text-slate-900">{formatPKR(totalSales)}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total Bills</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-bold text-xl text-slate-900">{documents.length}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total Products</span>
            <Package className="w-4 h-4 text-slate-600" />
          </div>
          <div className="font-bold text-xl text-slate-900">{catalogItems.length}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Cash in Drawer</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-bold text-xl text-emerald-700">
            {formatPKR(bootstrap.activeShift?.expected_cash || 0)}
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 sticky top-0">
              <tr>
                <th className="py-3 px-4 font-semibold">Bill No</th>
                <th className="py-3 px-4 font-semibold">Date &amp; Time</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Items</th>
                <th className="py-3 px-4 font-semibold">Payment</th>
                <th className="py-3 px-4 font-semibold text-right">Total Amount</th>
                <th className="py-3 px-4 font-semibold text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                    Loading bills...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                    No sales bills recorded yet.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.doc_sid} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900">
                      {doc.doc_no}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {formatDateTime(doc.invc_post_date)}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {doc.bt_first_name} {doc.bt_last_name}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {(doc.items || []).map((i) => `${i.qty}x ${i.description1}`).join(', ')}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-full font-medium text-slate-700">
                        {doc.tenders?.[0]?.tender_name || 'Cash'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatPKR(doc.transaction_total_amt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setReceiptModalDoc(doc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        View Bill
                      </button>
                    </td>
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
