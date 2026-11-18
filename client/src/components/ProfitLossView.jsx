import React, { useState, useMemo } from 'react';
import { TrendingUp, ShoppingBag, Award, Percent } from 'lucide-react';
import { usePos } from '../context/PosContext.jsx';
import { formatPKR, formatDateTime, matchesDateRange } from '../utils/formatters.js';

export default function ProfitLossView() {
  const { completedDocs } = usePos();
  const [dateRange, setDateRange] = useState('MONTHLY');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [breakdownMode, setBreakdownMode] = useState('PRODUCT'); // PRODUCT | SALE | ITEMS

  const filteredSales = useMemo(() => {
    return completedDocs.filter(
      (d) =>
        d.receipt_type === 0 &&
        matchesDateRange(d.invc_post_date, dateRange, startDate, endDate)
    );
  }, [completedDocs, dateRange, startDate, endDate]);

  const metrics = useMemo(() => {
    let revenue = 0;
    let cogs = 0;
    let discounts = 0;

    const lineRows = [];
    const saleRows = [];
    const prodMap = new Map();

    filteredSales.forEach((doc) => {
      const custName = `${doc.bt_first_name} ${doc.bt_last_name}`.trim();
      let docRev = 0;
      let docCogs = 0;

      (doc.items || []).forEach((it) => {
        const qty = Number(it.qty || 0);
        const lineRev = Number(it.ext_price || 0);
        const lineCost = Number(it.cost || 0) * qty;
        const lineProfit = lineRev - lineCost;

        docRev += lineRev;
        docCogs += lineCost;

        lineRows.push({
          id: `${doc.doc_sid}-${it.doc_item_sid}`,
          doc_no: doc.doc_no,
          date: doc.invc_post_date,
          customer: custName,
          alu: it.alu,
          product: it.description1,
          qty,
          revenue: lineRev,
          cogs: lineCost,
          profit: lineProfit,
        });

        const existing = prodMap.get(it.alu) || {
          alu: it.alu,
          product: it.description1,
          qty: 0,
          revenue: 0,
          cogs: 0,
          profit: 0,
        };
        existing.qty += qty;
        existing.revenue += lineRev;
        existing.cogs += lineCost;
        existing.profit += lineProfit;
        prodMap.set(it.alu, existing);
      });

      const docDisc = Number(doc.total_discount_amt || 0);
      const netRev = Number(doc.transaction_total_amt || 0);
      revenue += netRev;
      cogs += docCogs;
      discounts += docDisc;

      saleRows.push({
        id: doc.doc_sid,
        doc_no: doc.doc_no,
        date: doc.invc_post_date,
        customer: custName,
        revenue: docRev,
        cogs: docCogs,
        discount: docDisc,
        profit: netRev - docCogs,
      });
    });

    return {
      revenue,
      cogs,
      profit: revenue - cogs,
      discounts,
      productRows: Array.from(prodMap.values()),
      saleRows,
      lineRows,
    };
  }, [filteredSales]);

  return (
    <div className="p-6 space-y-5 h-full flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Profit / Loss</h1>
          <p className="text-xs text-slate-500">
            Gross profit and cost of goods sold analysis calculated from each sale item&apos;s saved cost
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
          >
            <option value="TODAY">Today</option>
            <option value="YESTERDAY">Yesterday</option>
            <option value="WEEKLY">This Week (7 Days)</option>
            <option value="MONTHLY">This Month</option>
            <option value="ALL">All Dates</option>
            <option value="CUSTOM">Custom Date Range</option>
          </select>

          {dateRange === 'CUSTOM' && (
            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total Sales Revenue</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-bold text-xl text-slate-900">{formatPKR(metrics.revenue)}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Cost of Goods Sold</span>
            <ShoppingBag className="w-4 h-4 text-slate-600" />
          </div>
          <div className="font-bold text-xl text-slate-800">{formatPKR(metrics.cogs)}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>{metrics.profit >= 0 ? 'Gross Profit' : 'Gross Loss'}</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div
            className={`font-bold text-xl ${
              metrics.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {formatPKR(metrics.profit)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Sale Discounts</span>
            <Percent className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-bold text-xl text-amber-700">{formatPKR(metrics.discounts)}</div>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="font-bold text-xs text-slate-700">Gross Profit / Loss Breakdown</span>
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
            {[
              { id: 'PRODUCT', label: 'Product-wise' },
              { id: 'SALE', label: 'Sale-wise' },
              { id: 'ITEMS', label: 'Sale Items' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setBreakdownMode(tab.id)}
                className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                  breakdownMode === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {breakdownMode === 'PRODUCT' && (
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 sticky top-0">
                <tr>
                  <th className="py-3 px-4 font-semibold">SKU Code</th>
                  <th className="py-3 px-4 font-semibold">Product</th>
                  <th className="py-3 px-4 font-semibold text-right">Units Sold</th>
                  <th className="py-3 px-4 font-semibold text-right">Sales Revenue</th>
                  <th className="py-3 px-4 font-semibold text-right">COGS</th>
                  <th className="py-3 px-4 font-semibold text-right">Gross Profit / Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.productRows.map((r) => (
                  <tr key={r.alu} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-slate-700">{r.alu}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{r.product}</td>
                    <td className="py-3 px-4 text-right font-mono text-xs">{r.qty}</td>
                    <td className="py-3 px-4 text-right">{formatPKR(r.revenue)}</td>
                    <td className="py-3 px-4 text-right text-slate-600">{formatPKR(r.cogs)}</td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        r.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {formatPKR(r.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {breakdownMode === 'SALE' && (
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 sticky top-0">
                <tr>
                  <th className="py-3 px-4 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Date &amp; Time</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold text-right">Sales Revenue</th>
                  <th className="py-3 px-4 font-semibold text-right">COGS</th>
                  <th className="py-3 px-4 font-semibold text-right">Discount</th>
                  <th className="py-3 px-4 font-semibold text-right">Net Profit / Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.saleRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900">
                      {r.doc_no}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{formatDateTime(r.date)}</td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-800">{r.customer}</td>
                    <td className="py-3 px-4 text-right">{formatPKR(r.revenue)}</td>
                    <td className="py-3 px-4 text-right text-slate-600">{formatPKR(r.cogs)}</td>
                    <td className="py-3 px-4 text-right text-amber-700">{formatPKR(r.discount)}</td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        r.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {formatPKR(r.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {breakdownMode === 'ITEMS' && (
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 sticky top-0">
                <tr>
                  <th className="py-3 px-4 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Date &amp; Time</th>
                  <th className="py-3 px-4 font-semibold">Product</th>
                  <th className="py-3 px-4 font-semibold text-right">Qty</th>
                  <th className="py-3 px-4 font-semibold text-right">Revenue</th>
                  <th className="py-3 px-4 font-semibold text-right">COGS</th>
                  <th className="py-3 px-4 font-semibold text-right">Profit / Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.lineRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900">
                      {r.doc_no}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{formatDateTime(r.date)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{r.product}</td>
                    <td className="py-3 px-4 text-right font-mono text-xs">{r.qty}</td>
                    <td className="py-3 px-4 text-right">{formatPKR(r.revenue)}</td>
                    <td className="py-3 px-4 text-right text-slate-600">{formatPKR(r.cogs)}</td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        r.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {formatPKR(r.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
