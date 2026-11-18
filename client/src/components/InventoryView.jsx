import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit3, Eye, DollarSign, Power, X } from 'lucide-react';
import { usePos } from '../context/PosContext.jsx';
import { api } from '../api/client.js';
import { formatPKR } from '../utils/formatters.js';

export default function InventoryView() {
  const { bootstrap, activeStoreSid, activeEmployee, catalogItems, notify, refreshAll } = usePos();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [inspectItem, setInspectItem] = useState(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceDrafts, setPriceDrafts] = useState({});

  const [form, setForm] = useState({
    alu: '',
    upc: '',
    description1: '',
    uom: 'PKT',
    dcs_sid: '',
    cost: '',
    retail_price: '',
    min_qty: 5,
    initial_qty: 20,
    active: true,
  });

  const filteredItems = useMemo(() => {
    return catalogItems.filter((item) => {
      if (categoryFilter !== 'ALL' && String(item.dcs_sid) !== String(categoryFilter)) return false;
      if (statusFilter === 'ACTIVE' && !item.active) return false;
      if (statusFilter === 'INACTIVE' && item.active) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        item.description1.toLowerCase().includes(q) ||
        item.alu.toLowerCase().includes(q) ||
        item.upc.toLowerCase().includes(q)
      );
    });
  }, [catalogItems, categoryFilter, statusFilter, search]);

  const openAddModal = () => {
    const nextCode = 1001 + catalogItems.length;
    setEditingItem(null);
    setForm({
      alu: String(nextCode),
      upc: `896400${nextCode}`,
      description1: '',
      uom: 'PKT',
      dcs_sid: bootstrap.dcsCategories[0]?.dcs_sid || 1,
      cost: '',
      retail_price: '',
      min_qty: 5,
      initial_qty: 20,
      active: true,
    });
    setShowProductModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      alu: item.alu,
      upc: item.upc,
      description1: item.description1,
      uom: item.uom || 'PKT',
      dcs_sid: item.dcs_sid,
      cost: item.cost,
      retail_price: item.retail_price,
      min_qty: item.min_qty || 5,
      initial_qty: item.qty_on_hand,
      active: Boolean(item.active),
    });
    setShowProductModal(true);
  };

  const openBulkPriceModal = () => {
    const map = {};
    catalogItems.forEach((i) => {
      map[i.item_sid] = {
        cost: String(i.cost),
        retail_price: String(i.retail_price),
      };
    });
    setPriceDrafts(map);
    setShowPriceModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        store_sid: activeStoreSid,
        created_by: activeEmployee?.empl_sid || 1,
        tax_code_sid: bootstrap.taxCodes[0]?.tax_code_sid || 1,
        cost: Number(form.cost || 0),
        retail_price: Number(form.retail_price),
        min_qty: Number(form.min_qty || 5),
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

  const handleToggleActive = async (item) => {
    try {
      await api.toggleItemActive(item.item_sid, !item.active, activeEmployee?.empl_sid || 1);
      await refreshAll(activeStoreSid);
      notify(`Product ${item.active ? 'deactivated' : 'activated'}`);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleSaveBulkPrices = async (e) => {
    e.preventDefault();
    try {
      const updates = catalogItems.map((i) => ({
        item_sid: i.item_sid,
        cost: Number(priceDrafts[i.item_sid]?.cost ?? i.cost),
        retail_price: Number(priceDrafts[i.item_sid]?.retail_price ?? i.retail_price),
      }));
      await api.updateBulkPrices({
        store_sid: activeStoreSid,
        updated_by: activeEmployee?.empl_sid || 1,
        updates,
      });
      setShowPriceModal(false);
      await refreshAll(activeStoreSid);
      notify('Daily purchase and selling prices updated');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="p-6 space-y-4 h-full flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Products</h1>
          <p className="text-xs text-slate-500">
            Manage product catalog, daily pricing, minimum stock levels, and availability
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openBulkPriceModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            Update Daily Prices
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2.5 bg-white p-3 rounded-xl border border-slate-200 shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU code or product name..."
            className="w-full pl-9 pr-3 py-1.5 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium"
        >
          <option value="ALL">All Categories</option>
          {bootstrap.dcsCategories.map((c) => (
            <option key={c.dcs_sid} value={c.dcs_sid}>
              {c.d_name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Product Catalog Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 sticky top-0">
              <tr>
                <th className="py-3 px-4 font-semibold">SKU Code</th>
                <th className="py-3 px-4 font-semibold">Product Name</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold text-right">Purchase Price</th>
                <th className="py-3 px-4 font-semibold text-right">Selling Price</th>
                <th className="py-3 px-4 font-semibold text-right">Current Stock</th>
                <th className="py-3 px-4 font-semibold text-right">Min Stock</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.item_sid} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono text-xs font-bold text-slate-700">
                    {item.alu}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {item.description1}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">{item.d_name}</td>
                  <td className="py-3 px-4 text-right text-slate-600">
                    {formatPKR(item.cost)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {formatPKR(item.retail_price)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs font-bold">
                    <span
                      className={
                        item.qty_on_hand <= item.min_qty ? 'text-amber-700' : 'text-emerald-700'
                      }
                    >
                      {item.qty_on_hand} {item.uom}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-slate-500">
                    {item.min_qty}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        item.active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {item.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => setInspectItem(item)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(item)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      <Power className="w-3 h-3" />
                      {item.active ? 'Deactivate' : 'Activate'}
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
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {editingItem ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Product Code / SKU *</label>
                  <input
                    type="text"
                    value={form.alu}
                    onChange={(e) => setForm({ ...form, alu: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit (UOM)</label>
                  <input
                    type="text"
                    value={form.uom}
                    onChange={(e) => setForm({ ...form, uom: e.target.value.toUpperCase() })}
                    placeholder="PKT, BTL, BAG..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={form.description1}
                  onChange={(e) => setForm({ ...form, description1: e.target.value })}
                  placeholder="e.g. Fine Sugar 1kg Pack"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Stock Alert Level</label>
                  <input
                    type="number"
                    min="0"
                    value={form.min_qty}
                    onChange={(e) => setForm({ ...form, min_qty: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Price (Rs.) *</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Opening Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={form.initial_qty}
                    onChange={(e) => setForm({ ...form, initial_qty: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                <span className="font-semibold text-slate-700">Product is active for POS sales</span>
              </label>

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

      {/* Product Details Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-semibold text-sm">Product Details</h3>
              <button
                onClick={() => setInspectItem(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block">SKU Code</span>
                  <strong className="font-mono text-slate-900">{inspectItem.alu}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Barcode (UPC)</span>
                  <strong className="font-mono text-slate-900">{inspectItem.upc}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Product Name</span>
                  <strong className="text-sm text-slate-900">{inspectItem.description1}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Category</span>
                  <strong className="text-slate-900">{inspectItem.d_name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Unit</span>
                  <strong className="text-slate-900">{inspectItem.uom}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Purchase Cost</span>
                  <strong className="text-slate-900">{formatPKR(inspectItem.cost)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Selling Price</span>
                  <strong className="text-emerald-700">{formatPKR(inspectItem.retail_price)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Current Stock</span>
                  <strong className="text-slate-900">
                    {inspectItem.qty_on_hand} {inspectItem.uom}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Minimum Stock</span>
                  <strong className="text-slate-900">{inspectItem.min_qty}</strong>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setInspectItem(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Daily Prices Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-semibold text-sm">Update Daily Product Prices</h3>
              <button
                onClick={() => setShowPriceModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveBulkPrices} className="p-5 space-y-4 text-xs">
              <p className="text-slate-500">
                Enter today&apos;s purchase cost and selling price for each product. New sales will use the updated selling price while completed past invoices retain their original prices.
              </p>
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[11px] sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Purchase Cost (Rs.)</th>
                      <th className="py-2.5 px-3">Selling Price (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {catalogItems.map((item) => (
                      <tr key={item.item_sid}>
                        <td className="py-2 px-3 font-semibold text-slate-900">{item.description1}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{item.alu}</td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={priceDrafts[item.item_sid]?.cost ?? ''}
                            onChange={(e) =>
                              setPriceDrafts((prev) => ({
                                ...prev,
                                [item.item_sid]: {
                                  ...prev[item.item_sid],
                                  cost: e.target.value,
                                },
                              }))
                            }
                            className="w-28 px-2.5 py-1 rounded border border-slate-300 font-semibold"
                            required
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={priceDrafts[item.item_sid]?.retail_price ?? ''}
                            onChange={(e) =>
                              setPriceDrafts((prev) => ({
                                ...prev,
                                [item.item_sid]: {
                                  ...prev[item.item_sid],
                                  retail_price: e.target.value,
                                },
                              }))
                            }
                            className="w-28 px-2.5 py-1 rounded border border-slate-300 font-bold text-emerald-800"
                            required
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPriceModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  Save All Prices
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
