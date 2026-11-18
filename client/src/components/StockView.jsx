import React, { useState, useMemo } from 'react';
import { Package, AlertTriangle, Search, History, PackagePlus, X } from 'lucide-react';
import { usePos } from '../context/PosContext.jsx';
import { api } from '../api/client.js';
import { formatPKR, formatDateTime } from '../utils/formatters.js';

export default function StockView() {
  const { activeStoreSid, activeEmployee, catalogItems, notify, refreshAll } = usePos();

  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [historyItem, setHistoryItem] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [adjustItem, setAdjustItem] = useState(null);
  const [newStockQty, setNewStockQty] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

  const stats = useMemo(() => {
    const totalUnits = catalogItems.reduce((s, i) => s + Number(i.qty_on_hand || 0), 0);
    const lowStock = catalogItems.filter(
      (i) => Number(i.qty_on_hand) > 0 && Number(i.qty_on_hand) <= Number(i.min_qty)
    ).length;
    const outOfStock = catalogItems.filter((i) => Number(i.qty_on_hand) <= 0).length;
    return { totalUnits, lowStock, outOfStock, totalItems: catalogItems.length };
  }, [catalogItems]);

  const filteredItems = useMemo(() => {
    return catalogItems.filter((item) => {
      const q = Number(item.qty_on_hand);
      const min = Number(item.min_qty);
      if (stockFilter === 'IN_STOCK' && q <= min) return false;
      if (stockFilter === 'LOW_STOCK' && (q <= 0 || q > min)) return false;
      if (stockFilter === 'OUT_OF_STOCK' && q > 0) return false;

      if (!search.trim()) return true;
      const s = search.trim().toLowerCase();
      return (
        item.description1.toLowerCase().includes(s) ||
        item.alu.toLowerCase().includes(s)
      );
    });
  }, [catalogItems, stockFilter, search]);

  const openMovementHistory = async (item) => {
    setHistoryItem(item);
    setLoadingHistory(true);
    try {
      const res = await api.getItemMovements(item.item_sid);
      setMovements(res.movements || []);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustItem) return;
    try {
      await api.createAdjustment({
        store_sid: activeStoreSid,
        created_by: activeEmployee?.empl_sid || 1,
        comments: adjustNotes || 'Stock count adjustment',
        items: [{ item_sid: adjustItem.item_sid, adj_qty: Number(newStockQty) }],
      });
      setAdjustItem(null);
      await refreshAll(activeStoreSid);
      notify('Stock quantity updated');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="p-6 space-y-5 h-full flex flex-col overflow-hidden">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Stock</h1>
        <p className="text-xs text-slate-500">
          Monitor live inventory balances, low-stock alerts, and per-product stock movement history
        </p>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total Units in Stock</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-bold text-xl text-slate-900">{stats.totalUnits.toLocaleString()}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Low Stock Items</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-bold text-xl text-amber-700">{stats.lowStock}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Out of Stock</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="font-bold text-xl text-rose-600">{stats.outOfStock}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Catalog Products</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-bold text-xl text-slate-900">{stats.totalItems}</div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-xs text-slate-700">
            Stock Levels ({filteredItems.length})
          </span>
          <div className="flex items-center gap-2">
            <div className="relative w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search SKU or product..."
                className="w-full pl-8 pr-3 py-1.5 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium"
            >
              <option value="ALL">All Stock</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 sticky top-0">
              <tr>
                <th className="py-3 px-4 font-semibold">SKU Code</th>
                <th className="py-3 px-4 font-semibold">Product</th>
                <th className="py-3 px-4 font-semibold text-right">Current Stock</th>
                <th className="py-3 px-4 font-semibold text-right">Minimum Stock</th>
                <th className="py-3 px-4 font-semibold text-right">Purchase Price</th>
                <th className="py-3 px-4 font-semibold text-right">Selling Price</th>
                <th className="py-3 px-4 font-semibold text-center">Stock Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const q = Number(item.qty_on_hand);
                const min = Number(item.min_qty);
                const statusLabel = q <= 0 ? 'Out of stock' : q <= min ? 'Low stock' : 'In stock';
                const statusStyle =
                  q <= 0
                    ? 'bg-rose-100 text-rose-800'
                    : q <= min
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800';

                return (
                  <tr key={item.item_sid} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-slate-700">
                      {item.alu}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{item.description1}</td>
                    <td className="py-3 px-4 text-right font-mono text-xs font-bold text-slate-900">
                      {item.qty_on_hand} {item.uom}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-500">
                      {item.min_qty}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">{formatPKR(item.cost)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatPKR(item.retail_price)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusStyle}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          setAdjustItem(item);
                          setNewStockQty(String(item.qty_on_hand));
                          setAdjustNotes('');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
                      >
                        <PackagePlus className="w-3.5 h-3.5 text-emerald-600" />
                        Adjust
                      </button>
                      <button
                        onClick={() => openMovementHistory(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5 text-blue-600" />
                        History
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-semibold text-sm">Adjust Stock Count</h3>
              <button
                onClick={() => setAdjustItem(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveAdjustment} className="p-5 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-500 block">Product</span>
                <strong className="text-sm text-slate-900">{adjustItem.description1}</strong>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Physical Stock *</label>
                <input
                  type="number"
                  min="0"
                  value={newStockQty}
                  onChange={(e) => setNewStockQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-sm"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Physical shelf audit..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustItem(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Movement History Modal */}
      {historyItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                Stock Movement History &bull; {historyItem.description1}
              </h3>
              <button
                onClick={() => setHistoryItem(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block">SKU Code</span>
                  <strong className="font-mono text-slate-900">{historyItem.alu}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Current Stock</span>
                  <strong className="text-emerald-700">
                    {historyItem.qty_on_hand} {historyItem.uom}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Minimum Stock</span>
                  <strong className="text-slate-900">
                    {historyItem.min_qty} {historyItem.uom}
                  </strong>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[11px] sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Date &amp; Time</th>
                      <th className="py-2.5 px-3">Movement Type</th>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3 text-right">Stock In</th>
                      <th className="py-2.5 px-3 text-right">Stock Out</th>
                      <th className="py-2.5 px-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingHistory ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Loading movement history...
                        </td>
                      </tr>
                    ) : movements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No stock movements recorded for this product.
                        </td>
                      </tr>
                    ) : (
                      movements.map((m) => (
                        <tr key={m.id}>
                          <td className="py-2.5 px-3 text-slate-600">{formatDateTime(m.date)}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                m.type === 'Purchase'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : m.type === 'Sale'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {m.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                            {m.reference}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                            {m.stockIn ? `+${m.stockIn}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-bold">
                            {m.stockOut ? `-${m.stockOut}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {m.balance}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setHistoryItem(null)}
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
