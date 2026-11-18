import React, { useState, useMemo } from 'react';
import { Plus, Search, Truck, Users, TrendingUp, Eye, X, Trash2 } from 'lucide-react';
import { usePos } from '../context/PosContext.jsx';
import { api } from '../api/client.js';
import { formatPKR, formatDateTime } from '../utils/formatters.js';

export default function PurchasingView() {
  const { activeStoreSid, activeEmployee, catalogItems, vendors, vouchers, notify, refreshAll } = usePos();

  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inspectVoucher, setInspectVoucher] = useState(null);

  const activeVendors = useMemo(() => vendors.filter((v) => Boolean(v.active)), [vendors]);
  const activeProducts = useMemo(() => catalogItems.filter((p) => Boolean(p.active)), [catalogItems]);

  const [selectedVendorSid, setSelectedVendorSid] = useState('');
  const [selectedProductSid, setSelectedProductSid] = useState('');
  const [lineQty, setLineQty] = useState('10');
  const [lineCost, setLineCost] = useState('');
  const [purchaseLines, setPurchaseLines] = useState([]);
  const [discountAmt, setDiscountAmt] = useState('0');
  const [notes, setNotes] = useState('');

  const filteredVouchers = useMemo(() => {
    if (!search.trim()) return vouchers;
    const q = search.trim().toLowerCase();
    return vouchers.filter((v) => {
      const itemsText = (v.items || []).map((i) => `${i.description1} ${i.alu}`).join(' ');
      return (
        v.vou_no.toLowerCase().includes(q) ||
        v.vend_name.toLowerCase().includes(q) ||
        itemsText.toLowerCase().includes(q)
      );
    });
  }, [vouchers, search]);

  const openNewPurchaseModal = () => {
    const firstVend = activeVendors[0];
    const firstProd = activeProducts[0];
    setSelectedVendorSid(firstVend ? String(firstVend.vend_sid) : '');
    setSelectedProductSid(firstProd ? String(firstProd.item_sid) : '');
    setLineQty('10');
    setLineCost(firstProd ? String(firstProd.cost) : '0');
    setPurchaseLines([]);
    setDiscountAmt('0');
    setNotes('');
    setShowCreateModal(true);
  };

  const handleAddLine = () => {
    const prod = activeProducts.find((p) => String(p.item_sid) === String(selectedProductSid));
    const qty = Number(lineQty);
    const cost = Number(lineCost);
    if (!prod || !Number.isFinite(qty) || qty <= 0) {
      notify('Select a product and enter a valid positive quantity', 'error');
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      notify('Enter a valid purchase price', 'error');
      return;
    }

    setPurchaseLines((prev) => [
      ...prev,
      {
        item_sid: prod.item_sid,
        alu: prod.alu,
        description1: prod.description1,
        qty,
        cost,
        lineTotal: qty * cost,
      },
    ]);
  };

  const subtotal = purchaseLines.reduce((s, l) => s + l.lineTotal, 0);
  const discVal = Math.max(0, Math.min(subtotal, Number(discountAmt || 0)));
  const grandTotal = Math.max(0, subtotal - discVal);

  const handleSavePurchase = async () => {
    if (!selectedVendorSid) {
      notify('Please choose an active supplier', 'error');
      return;
    }
    if (purchaseLines.length === 0) {
      notify('Add at least one product line to save the purchase', 'error');
      return;
    }

    try {
      const res = await api.createVoucher({
        store_sid: activeStoreSid,
        vend_sid: Number(selectedVendorSid),
        disc_amt: discVal,
        notes,
        created_by: activeEmployee?.empl_sid || 1,
        items: purchaseLines.map((l) => ({
          item_sid: l.item_sid,
          qty: l.qty,
          cost: l.cost,
        })),
      });
      setShowCreateModal(false);
      await refreshAll(activeStoreSid);
      notify(`Purchase ${res.voucher.vou_no} saved & stock updated`);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="p-6 space-y-5 h-full flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Purchases</h1>
          <p className="text-xs text-slate-500">
            Receive stock from suppliers and maintain a searchable purchase history
          </p>
        </div>

        <button
          onClick={openNewPurchaseModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Purchase
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">Total Purchases</div>
            <div className="font-bold text-lg text-slate-900">{vouchers.length}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">Active Suppliers</div>
            <div className="font-bold text-lg text-slate-900">{activeVendors.length}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">Total Purchase Value</div>
            <div className="font-bold text-lg text-slate-900">
              {formatPKR(vouchers.reduce((s, v) => s + Number(v.vou_total || 0), 0))}
            </div>
          </div>
        </div>
      </div>

      {/* Purchase History Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="font-bold text-xs text-slate-700">
            Purchase History ({filteredVouchers.length})
          </span>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search purchase # or supplier..."
              className="w-full pl-8 pr-3 py-1.5 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 sticky top-0">
              <tr>
                <th className="py-3 px-4 font-semibold">Purchase #</th>
                <th className="py-3 px-4 font-semibold">Date &amp; Time</th>
                <th className="py-3 px-4 font-semibold">Supplier</th>
                <th className="py-3 px-4 font-semibold">Items Received</th>
                <th className="py-3 px-4 font-semibold text-right">Quantity</th>
                <th className="py-3 px-4 font-semibold text-right">Total Cost</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                    No purchase records found.
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => (
                  <tr key={v.vou_sid} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900">{v.vou_no}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {formatDateTime(v.created_datetime)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 text-xs">{v.vend_name}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {(v.items || []).map((i) => `${i.qty}x ${i.description1}`).join(', ')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs font-semibold">
                      {v.total_qty}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatPKR(v.vou_total)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setInspectVoucher(v)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-semibold text-sm">Record New Stock Purchase</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supplier *</label>
                <select
                  value={selectedVendorSid}
                  onChange={(e) => setSelectedVendorSid(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                >
                  <option value="">Choose supplier...</option>
                  {activeVendors.map((v) => (
                    <option key={v.vend_sid} value={v.vend_sid}>
                      {v.vend_name} ({v.vend_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-12 gap-2 items-end bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="col-span-5">
                  <label className="block font-semibold text-slate-700 mb-1">Product</label>
                  <select
                    value={selectedProductSid}
                    onChange={(e) => {
                      const sid = e.target.value;
                      setSelectedProductSid(sid);
                      const prod = activeProducts.find((p) => String(p.item_sid) === String(sid));
                      if (prod) setLineCost(String(prod.cost));
                    }}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {activeProducts.map((p) => (
                      <option key={p.item_sid} value={p.item_sid}>
                        [{p.alu}] {p.description1}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={lineQty}
                    onChange={(e) => setLineQty(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Price (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    value={lineCost}
                    onChange={(e) => setLineCost(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                  >
                    Add Item
                  </button>
                </div>
              </div>

              {/* Lines Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Product</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Purchase Price</th>
                      <th className="py-2 px-3 text-right">Line Total</th>
                      <th className="py-2 px-3 text-right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchaseLines.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          No items added to this purchase yet.
                        </td>
                      </tr>
                    ) : (
                      purchaseLines.map((l, idx) => (
                        <tr key={`${l.item_sid}-${idx}`}>
                          <td className="py-2 px-3 font-semibold text-slate-900">{l.description1}</td>
                          <td className="py-2 px-3 text-right">{l.qty}</td>
                          <td className="py-2 px-3 text-right">{formatPKR(l.cost)}</td>
                          <td className="py-2 px-3 text-right font-bold">{formatPKR(l.lineTotal)}</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setPurchaseLines((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-rose-600 hover:underline cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">Discount (Rs.):</span>
                  <input
                    type="number"
                    min="0"
                    value={discountAmt}
                    onChange={(e) => setDiscountAmt(e.target.value)}
                    className="w-24 px-2 py-1 rounded border border-slate-300 bg-white font-semibold"
                  />
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Grand Total: <span className="text-emerald-700">{formatPKR(grandTotal)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePurchase}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  Save Purchase &amp; Add Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Purchase Details Modal */}
      {inspectVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-semibold text-sm">Purchase {inspectVoucher.vou_no}</h3>
              <button
                onClick={() => setInspectVoucher(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Supplier</span>
                  <strong className="text-slate-900">{inspectVoucher.vend_name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Date</span>
                  <strong className="text-slate-900">
                    {formatDateTime(inspectVoucher.created_datetime)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Units</span>
                  <strong className="text-slate-900">{inspectVoucher.total_qty}</strong>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Product</th>
                      <th className="py-2 px-3">Code</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Purchase Price</th>
                      <th className="py-2 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(inspectVoucher.items || []).map((it) => (
                      <tr key={it.vou_item_sid}>
                        <td className="py-2 px-3 font-semibold text-slate-900">{it.description1}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{it.alu}</td>
                        <td className="py-2 px-3 text-right font-semibold">{it.qty}</td>
                        <td className="py-2 px-3 text-right">{formatPKR(it.cost)}</td>
                        <td className="py-2 px-3 text-right font-bold">{formatPKR(it.ext_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <div className="text-sm font-bold text-slate-900">
                  Total Purchase Cost:{' '}
                  <span className="text-emerald-700">{formatPKR(inspectVoucher.vou_total)}</span>
                </div>
                <button
                  onClick={() => setInspectVoucher(null)}
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
