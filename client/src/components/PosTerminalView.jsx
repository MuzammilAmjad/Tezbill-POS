import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  RotateCcw,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle,
  ShoppingBag,
} from 'lucide-react';
import { usePos } from '../context/PosContext.jsx';
import { api } from '../api/client.js';
import { formatPKR } from '../utils/formatters.js';

const PAYMENT_METHODS = [
  { type: 'CASH', label: 'Cash', icon: Banknote },
  { type: 'CARD', label: 'Card', icon: CreditCard },
  { type: 'JAZZCASH', label: 'JazzCash', icon: Smartphone },
  { type: 'EASYPAISA', label: 'Easypaisa', icon: Smartphone },
];

export default function PosTerminalView() {
  const {
    bootstrap,
    activeStoreSid,
    activeWorkstationSid,
    activeEmployee,
    catalogItems,
    customers,
    setReceiptModalDoc,
    notify,
    refreshAll,
  } = usePos();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCustomerSid, setSelectedCustomerSid] = useState(customers[0]?.cust_sid || 1);
  const [cart, setCart] = useState([]);
  const [discountAmount, setDiscountAmount] = useState('');
  const [tenderType, setTenderType] = useState('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const searchRef = useRef(null);

  const addItemToCart = (item) => {
    if (Number(item.qty_on_hand) <= 0) {
      notify(`"${item.description1}" is out of stock`, 'error');
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((c) => c.item_sid === item.item_sid);
      const price = Number(item.retail_price || 0);

      if (idx > -1) {
        const current = prev[idx];
        if (current.qty + 1 > Number(item.qty_on_hand)) {
          notify(`Only ${item.qty_on_hand} units available in stock`, 'error');
          return prev;
        }
        const updated = [...prev];
        updated[idx] = { ...current, qty: current.qty + 1 };
        return updated;
      }

      return [
        ...prev,
        {
          item_sid: item.item_sid,
          alu: item.alu,
          upc: item.upc,
          description1: item.description1,
          qty_on_hand: Number(item.qty_on_hand),
          qty: 1,
          price,
        },
      ];
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;

    const match = catalogItems.find(
      (i) => i.upc.toLowerCase() === q || i.alu.toLowerCase() === q
    );
    if (match) {
      addItemToCart(match);
      setSearchQuery('');
    } else if (filteredItems.length === 1) {
      addItemToCart(filteredItems[0]);
      setSearchQuery('');
    }
  };

  const updateQty = (itemSid, nextQty) => {
    if (nextQty <= 0) {
      setCart((prev) => prev.filter((c) => c.item_sid !== itemSid));
      return;
    }
    setCart((prev) =>
      prev.map((c) => {
        if (c.item_sid !== itemSid) return c;
        if (nextQty > c.qty_on_hand) {
          notify(`Only ${c.qty_on_hand} available in stock`, 'error');
          return c;
        }
        return { ...c, qty: nextQty };
      })
    );
  };

  const filteredItems = useMemo(() => {
    return catalogItems.filter((item) => {
      if (selectedCategory && String(item.dcs_sid) !== String(selectedCategory)) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        item.description1.toLowerCase().includes(q) ||
        item.alu.toLowerCase().includes(q) ||
        item.upc.toLowerCase().includes(q)
      );
    });
  }, [catalogItems, selectedCategory, searchQuery]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );

  const discVal = Math.max(0, Math.min(subtotal, Number(discountAmount || 0)));
  const grandTotal = Math.max(0, subtotal - discVal);
  const effectiveCash = tenderType === 'CASH' && cashReceived !== '' ? Number(cashReceived) : grandTotal;
  const changeDue = Math.max(0, effectiveCash - grandTotal);

  const clearBill = () => {
    setCart([]);
    setDiscountAmount('');
    setCashReceived('');
    setTenderType('CASH');
    searchRef.current?.focus();
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      notify('Please add at least one product to the bill', 'error');
      return;
    }
    if (tenderType === 'CASH' && effectiveCash < grandTotal) {
      notify('Cash received is less than the total bill amount', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const methodLabel = PAYMENT_METHODS.find((m) => m.type === tenderType)?.label || 'Cash';
      const res = await api.createDocument({
        store_sid: activeStoreSid,
        workstation_sid: activeWorkstationSid,
        cashier_sid: activeEmployee?.empl_sid || 1,
        price_lvl_sid: 1,
        receipt_type: 0,
        is_held: 0,
        bt_cuid: Number(selectedCustomerSid) || 1,
        disc_amt: discVal,
        items: cart.map((c) => ({
          item_sid: c.item_sid,
          qty: c.qty,
          orig_price: c.price,
        })),
        tenders: [
          {
            tender_type: tenderType,
            tender_name: methodLabel,
            amount: grandTotal,
            taken: effectiveCash,
          },
        ],
      });

      await refreshAll(activeStoreSid);
      clearBill();
      notify(`Sale completed (${res.document.doc_no})`);
      setReceiptModalDoc(res.document);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-5 p-5 overflow-hidden">
      {/* Left Side: Product Selection */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50/50">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product by name, code, or scan barcode..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-emerald-600"
            />
          </form>

          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedCategory('')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                selectedCategory === ''
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Products ({catalogItems.length})
            </button>
            {bootstrap.dcsCategories.map((cat) => (
              <button
                key={cat.dcs_sid}
                type="button"
                onClick={() => setSelectedCategory(String(cat.dcs_sid))}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  String(selectedCategory) === String(cat.dcs_sid)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat.d_name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-sm">
              <p>No products found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredItems.map((item) => {
                const outOfStock = Number(item.qty_on_hand) <= 0;
                return (
                  <button
                    key={item.item_sid}
                    type="button"
                    onClick={() => addItemToCart(item)}
                    className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                      outOfStock
                        ? 'bg-slate-50 border-slate-200 opacity-50'
                        : 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Code: {item.alu}</span>
                        <span
                          className={`font-medium ${
                            outOfStock ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {outOfStock ? 'Out of stock' : `${item.qty_on_hand} in stock`}
                        </span>
                      </div>
                      <div className="font-semibold text-sm text-slate-900 leading-snug">
                        {item.description1}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.d_name}</div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-base text-emerald-700">
                        {formatPKR(item.retail_price)}
                      </span>
                      <span className="text-xs text-emerald-600 font-medium">+ Add</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Current Bill */}
      <div className="w-full lg:w-[420px] bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col shrink-0 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm">Current Bill</span>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearBill}
              className="flex items-center gap-1 text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Bill
            </button>
          )}
        </div>

        {/* Customer Selection */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium shrink-0">Customer:</span>
          <select
            value={selectedCustomerSid}
            onChange={(e) => setSelectedCustomerSid(Number(e.target.value))}
            className="flex-1 bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 font-medium text-slate-800 focus:outline-none"
          >
            {customers.map((c) => (
              <option key={c.cust_sid} value={c.cust_sid}>
                {c.first_name} {c.last_name} ({c.phone_no})
              </option>
            ))}
          </select>
        </div>

        {/* Bill Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-sm p-6 text-center">
              <p className="font-medium text-slate-500">Bill is empty</p>
              <p className="text-xs mt-1">Click on any product on the left to add it to the bill.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.item_sid} className="p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-slate-900 truncate">
                    {item.description1}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatPKR(item.price)} each
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateQty(item.item_sid, item.qty - 1)}
                    className="w-7 h-7 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-bold text-sm">{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(item.item_sid, item.qty + 1)}
                    className="w-7 h-7 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="w-20 text-right font-bold text-sm text-slate-900">
                  {formatPKR(item.price * item.qty)}
                </div>

                <button
                  type="button"
                  onClick={() => updateQty(item.item_sid, 0)}
                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Totals & Payment */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 text-sm">
          <div className="space-y-1.5">
            <div className="flex justify-between text-slate-600 text-xs">
              <span>Subtotal ({cart.reduce((a, c) => a + c.qty, 0)} items)</span>
              <span className="font-semibold text-slate-800">{formatPKR(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Discount (Rs.)</span>
              <input
                type="number"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="0"
                className="w-24 px-2 py-1 bg-white border border-slate-300 rounded text-right font-semibold"
              />
            </div>

            <div className="flex justify-between items-baseline text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Payable</span>
              <span className="text-xl text-emerald-700">{formatPKR(grandTotal)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1.5">Payment Method</div>
            <div className="grid grid-cols-4 gap-1.5">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                const active = tenderType === m.type;
                return (
                  <button
                    key={m.type}
                    type="button"
                    onClick={() => setTenderType(m.type)}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {tenderType === 'CASH' && (
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Cash Received (Rs.)
                </label>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder={String(grandTotal)}
                  className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-300 font-bold text-sm"
                />
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 flex flex-col justify-center text-right">
                <span className="text-[11px] font-medium text-emerald-700">Change to Return</span>
                <span className="font-bold text-sm text-emerald-900">{formatPKR(changeDue)}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={submitting || cart.length === 0}
            onClick={handleCompleteSale}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            {submitting ? 'Saving Bill...' : `Complete Sale (${formatPKR(grandTotal)})`}
          </button>
        </div>
      </div>
    </div>
  );
}
