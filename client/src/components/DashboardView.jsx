import React, { useMemo } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Award,
  Package,
  AlertTriangle,
  FileText,
  Truck,
  ArrowRight,
} from 'lucide-react';
import { usePos } from '../context/PosContext.jsx';
import { formatPKR, formatDateTime, matchesDateRange } from '../utils/formatters.js';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function DashboardView({ setActiveTab }) {
  const { catalogItems, completedDocs, vouchers } = usePos();

  const stats = useMemo(() => {
    const todaySales = completedDocs.filter(
      (d) => d.receipt_type === 0 && matchesDateRange(d.invc_post_date, 'TODAY')
    );
    const yestSales = completedDocs.filter(
      (d) => d.receipt_type === 0 && matchesDateRange(d.invc_post_date, 'YESTERDAY')
    );
    const todayPurchases = vouchers.filter((v) => matchesDateRange(v.created_datetime, 'TODAY'));

    const calcRevenue = (docs) => docs.reduce((s, d) => s + Number(d.transaction_total_amt || 0), 0);
    const calcCogs = (docs) =>
      docs.reduce(
        (s, d) =>
          s + (d.items || []).reduce((is, it) => is + Number(it.cost || 0) * Number(it.qty || 0), 0),
        0
      );

    const todayRev = calcRevenue(todaySales);
    const yestRev = calcRevenue(yestSales);
    const todayCogs = calcCogs(todaySales);
    const todayProfit = todayRev - todayCogs;

    const allSales = completedDocs.filter((d) => d.receipt_type === 0);
    const totalRev = calcRevenue(allSales);
    const totalCogs = calcCogs(allSales);
    const totalProfit = totalRev - totalCogs;

    const todayPurchTotal = todayPurchases.reduce((s, v) => s + Number(v.vou_total || 0), 0);
    const allPurchTotal = vouchers.reduce((s, v) => s + Number(v.vou_total || 0), 0);

    const totalStockUnits = catalogItems.reduce((s, i) => s + Number(i.qty_on_hand || 0), 0);
    const lowStockItems = catalogItems.filter((i) => Number(i.qty_on_hand) <= Number(i.min_qty));

    // 7-day sales array (Mon..Sun of current week)
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monday = new Date(todayMidnight);
    monday.setDate(todayMidnight.getDate() - ((todayMidnight.getDay() + 6) % 7));

    const weeklyValues = Array.from({ length: 7 }, (_, idx) => {
      const dayStart = new Date(monday);
      dayStart.setDate(monday.getDate() + idx);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      return allSales
        .filter((d) => {
          const dt = new Date(d.invc_post_date);
          return dt >= dayStart && dt < dayEnd;
        })
        .reduce((s, d) => s + Number(d.transaction_total_amt || 0), 0);
    });

    return {
      todayRev,
      yestRev,
      todayCogs,
      todayProfit,
      totalRev,
      totalCogs,
      totalProfit,
      todayPurchTotal,
      allPurchTotal,
      totalStockUnits,
      lowStockItems,
      todayTxCount: todaySales.length,
      weeklyValues,
    };
  }, [catalogItems, completedDocs, vouchers]);

  const maxWeekVal = Math.max(...stats.weeklyValues, 1000);

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Store Overview</h1>
          <p className="text-xs text-slate-500">
            Monitor daily sales, purchases, gross profit, and stock levels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('reports')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Daily / Weekly / Monthly Reports
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Today&apos;s Sales</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-bold text-xl text-slate-900">{formatPKR(stats.todayRev)}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats.todayTxCount} transactions today &bull; Total: {formatPKR(stats.totalRev)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Today&apos;s Purchases</span>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-bold text-xl text-slate-900">{formatPKR(stats.todayPurchTotal)}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            All purchases: {formatPKR(stats.allPurchTotal)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Today&apos;s Gross Profit</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-bold text-xl text-emerald-700">{formatPKR(stats.todayProfit)}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total Profit: {formatPKR(stats.totalProfit)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Current Stock Units</span>
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-bold text-xl text-slate-900">
            {stats.totalStockUnits.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Across {catalogItems.length} catalog products
          </div>
        </div>
      </div>

      {/* Weekly Sales Chart & Profit Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-sm text-slate-900">Weekly Sales Overview</h2>
              <p className="text-xs text-slate-500">Current week daily revenue breakdown (Mon – Sun)</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {formatPKR(stats.weeklyValues.reduce((a, b) => a + b, 0))} this week
            </span>
          </div>

          <div className="h-44 flex items-end gap-3 pt-4 px-2 border-b border-slate-200">
            {stats.weeklyValues.map((val, idx) => {
              const heightPct = Math.max(6, Math.round((val / maxWeekVal) * 100));
              return (
                <div key={WEEKDAYS[idx]} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500">
                    {val > 0 ? formatPKR(val) : '—'}
                  </span>
                  <div className="w-full bg-slate-100 rounded-t-lg h-28 flex items-end overflow-hidden">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-lg transition-all ${
                        val > 0 ? 'bg-emerald-600' : 'bg-slate-200'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between px-2 pt-2 text-xs font-semibold text-slate-500">
            {WEEKDAYS.map((day) => (
              <span key={day} className="flex-1 text-center">
                {day}
              </span>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-slate-900">Profit &amp; Loss Summary</h2>
              <p className="text-xs text-slate-500">Gross margin calculated from item sale costs</p>
            </div>
            <button
              onClick={() => setActiveTab('profit')}
              className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Details <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-emerald-800">Gross Profit</div>
              <div className="text-2xl font-bold text-emerald-950 mt-0.5">
                {formatPKR(stats.totalProfit)}
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold">
              {stats.totalRev > 0
                ? `${((stats.totalProfit / stats.totalRev) * 100).toFixed(1)}% Margin`
                : '0%'}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Total Sales Revenue</span>
              <span className="font-bold text-slate-900">{formatPKR(stats.totalRev)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Cost of Goods Sold (COGS)</span>
              <span className="font-bold text-slate-700">{formatPKR(stats.totalCogs)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Low Stock Alert Items</span>
              <span className="font-bold text-amber-700">{stats.lowStockItems.length} products</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Tables: Low Stock, Recent Sales, Recent Purchases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Low Stock */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Low Stock Products ({stats.lowStockItems.length})</span>
            </div>
            <button
              onClick={() => setActiveTab('stock')}
              className="text-xs text-emerald-700 font-semibold hover:underline cursor-pointer"
            >
              View Stock
            </button>
          </div>
          <div className="divide-y divide-slate-100 text-xs flex-1">
            {stats.lowStockItems.length === 0 ? (
              <div className="p-6 text-center text-slate-400">All products are well stocked.</div>
            ) : (
              stats.lowStockItems.slice(0, 5).map((item) => (
                <div key={item.item_sid} className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{item.description1}</div>
                    <div className="text-[11px] text-slate-400 font-mono">Code: {item.alu}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      item.qty_on_hand <= 0
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.qty_on_hand} left
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Recent Sales</span>
            </div>
            <button
              onClick={() => setActiveTab('documents')}
              className="text-xs text-emerald-700 font-semibold hover:underline cursor-pointer"
            >
              See All
            </button>
          </div>
          <div className="divide-y divide-slate-100 text-xs flex-1">
            {completedDocs.slice(0, 5).map((doc) => (
              <div key={doc.doc_sid} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-mono font-bold text-slate-900">{doc.doc_no}</div>
                  <div className="text-[11px] text-slate-500">
                    {doc.bt_first_name} {doc.bt_last_name} &bull; {formatDateTime(doc.invc_post_date)}
                  </div>
                </div>
                <span className="font-bold text-emerald-700">
                  {formatPKR(doc.transaction_total_amt)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Purchases */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>Recent Purchases</span>
            </div>
            <button
              onClick={() => setActiveTab('purchasing')}
              className="text-xs text-emerald-700 font-semibold hover:underline cursor-pointer"
            >
              See All
            </button>
          </div>
          <div className="divide-y divide-slate-100 text-xs flex-1">
            {vouchers.length === 0 ? (
              <div className="p-6 text-center text-slate-400">No supplier purchases recorded yet.</div>
            ) : (
              vouchers.slice(0, 5).map((v) => (
                <div key={v.vou_sid} className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-slate-900">{v.vou_no}</div>
                    <div className="text-[11px] text-slate-500">
                      {v.vend_name} &bull; {formatDateTime(v.created_datetime)}
                    </div>
                  </div>
                  <span className="font-bold text-slate-900">{formatPKR(v.vou_total)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
