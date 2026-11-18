import React, { useState } from 'react';
import { Plus, Search, Edit3, PackagePlus } from 'lucide-react';
import { usePos } from '../context/PosContext.jsx';
import { api } from '../api/client.js';
import { formatPKR } from '../utils/formatters.js';

export default function InventoryView() {
  const { bootstrap, activeStoreSid, activeEmployee, catalogItems, notify, refreshAll } = usePos();

  const [search, setSearch] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    alu: '',
    upc: '',
    description1: '',
    item_size: '',
    dcs_sid: '',
    cost: '',
    retail_price: '',
    initial_qty: 20,
  });

  const [stockItem, setStockItem] = useState(null);
  const [newStockQty, setNewStockQty] = useState('');

  const filteredItems = catalogItems.filter((item) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      item.description1.toLowerCase().includes(q) ||
      item.alu.toLowerCase().includes(q) ||
      item.upc.toLowerCase().includes(q)
    );
  });

  const openAddModal = () => {
    const nextCode = 1001 + catalogItems.length;
    setEditingItem(null);
    setForm({
      alu: String(nextCode),
      upc: `896400${nextCode}`,
      description1: '',
      item_size: '1 Pack',
      dcs_sid: bootstrap.dcsCategories[0]?.dcs_sid || 1,
      cost: '',
      retail_price: '',
      initial_qty: 20,
    });
    setShowProductModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      alu: item.alu,
      upc: item.upc,
      description1: item.description1,
      item_size: item.item_size || '',
      dcs_sid: item.dcs_sid,
      cost: item.cost,
      retail_price: item.retail_price,
      initial_qty: item.qty_on_hand,
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        store_sid: activeStoreSid,
        tax_code_sid: bootstrap.taxCodes[0]?.tax_code_sid || 1,
        cost: Number(form.cost || 0),
        retail_price: Number(form.retail_price),
        initial_qty: Number(form.initial_qty || 0),
      };

      if (editingItem) {
        await api.updateItem(editingItem.item_sid, payload);
        notify(`Updated "${form.description1}"`);
      } else {
        await api.createItem(payload);
        notify(`Added "${form.description1}"`);
      }
      setShowProductModal(false);
      await refreshAll(activeStoreSid);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    if (!stockItem) return;
    try {
      await api.createAdjustment({
        store_sid: activeStoreSid,
        created_by: activeEmployee?.empl_sid || 1,
        comments: 'Updated stock from Products screen',
        items: [{ item_sid: stockItem.item_sid, adj_qty: Number(newStockQty) }],
      });
      setStockItem(null);
      await refreshAll(activeStoreSid);
      notify('Stock quantity updated');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="p-6 space-y-4 h-full flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Products &amp; Stock</h1>
          <p className="text-xs text-slate-500">Manage shop products, prices, and available stock</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 sticky top-0">
              <tr>
                <th className="py-3 px-4 font-semibold">Code</th>
                <th className="py-3 px-4 font-semibold">Product Name</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold text-right">Cost Price</th>
                <th className="py-3 px-4 font-semibold text-right">Selling Price</th>
                <th className="py-3 px-4 font-semibold text-right">Stock Available</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.item_sid} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700">
                    {item.alu}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {item.description1}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                      {item.d_name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600">
                    {formatPKR(item.cost)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {formatPKR(item.retail_price)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.qty_on_hand <= 5
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {item.qty_on_hand} in stock
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        setStockItem(item);
                        setNewStockQty(String(item.qty_on_hand));
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      <PackagePlus className="w-3.5 h-3.5 text-emerald-600" />
                      Stock
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {editingItem ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={form.description1}
                  onChange={(e) => setForm({ ...form, description1: e.target.value })}
                  placeholder="e.g. Sugar 1kg Pack"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Item Code *</label>
                  <input
                    type="text"
                    value={form.alu}
                    onChange={(e) => setForm({ ...form, alu: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={form.dcs_sid}
                    onChange={(e) => setForm({ ...form, dcs_sid: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {bootstrap.dcsCategories.map((c) => (
                      <option key={c.dcs_sid} value={c.dcs_sid}>
                        {c.d_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cost Price (Rs.) *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Price (Rs.) *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.retail_price}
                    onChange={(e) => setForm({ ...form, retail_price: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                    required
                  />
                </div>
              </div>

              {!editingItem && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={form.initial_qty}
                    onChange={(e) => setForm({ ...form, initial_qty: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Update Stock Modal */}
      {stockItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-semibold text-sm">Update Stock Quantity</h3>
              <button
                onClick={() => setStockItem(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleUpdateStock} className="p-5 space-y-4 text-xs">
              <div>
                <div className="text-slate-500">Product</div>
                <div className="font-bold text-sm text-slate-900 mt-0.5">{stockItem.description1}</div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Stock Quantity *</label>
                <input
                  type="number"
                  min="0"
                  value={newStockQty}
                  onChange={(e) => setNewStockQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-sm"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStockItem(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
