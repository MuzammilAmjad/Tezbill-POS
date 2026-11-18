import React, { useState, useMemo } from 'react';
import { Printer, Download, Search, FileText, Calendar } from 'lucide-react';
import { usePos } from '../context/PosContext.jsx';
import { formatPKR, formatDateTime, matchesDateRange } from '../utils/formatters.js';

const PERIOD_OPTIONS = [
  { id: 'DAILY', label: 'Daily Report (Today)' },
  { id: 'YESTERDAY', label: 'Yesterday' },
  { id: 'WEEKLY', label: 'Weekly Report (7 Days)' },
  { id: 'MONTHLY', label: 'Monthly Report (This Month)' },
  { id: 'ALL', label: 'All Time' },
  { id: 'CUSTOM', label: 'Custom Range' },
];

export default function ReportsView() {
  const { activeStore, activeEmployee, completedDocs, vouchers, catalogItems } = usePos();

  const [reportType, setReportType] = useState('SALES'); // SALES | PURCHASES | STOCK
  const [period, setPeriod] = useState('DAILY');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  const periodLabel =
    PERIOD_OPTIONS.find((p) => p.id === period)?.label || 'Sales Report';

  const filteredSales = useMemo(() => {
    return completedDocs.filter((doc) => {
      if (doc.receipt_type !== 0) return false;
      if (!matchesDateRange(doc.invc_post_date, period, startDate, endDate)) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const cust = `${doc.bt_first_name} ${doc.bt_last_name} ${doc.bt_primary_phone_no || ''}`;
      const itemsText = (doc.items || []).map((i) => `${i.description1} ${i.alu}`).join(' ');
      return (
        doc.doc_no.toLowerCase().includes(q) ||
        cust.toLowerCase().includes(q) ||
        (doc.cashier_name || '').toLowerCase().includes(q) ||
        itemsText.toLowerCase().includes(q)
      );
    });
  }, [completedDocs, period, startDate, endDate, search]);

  const salesSummary = useMemo(() => {
    let totalSubtotal = 0;
    let totalDiscounts = 0;
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalUnits = 0;

    filteredSales.forEach((d) => {
      totalSubtotal += Number(d.sale_subtotal || 0);
      totalDiscounts += Number(d.total_discount_amt || 0);
      totalRevenue += Number(d.transaction_total_amt || 0);
      (d.items || []).forEach((it) => {
        const qty = Number(it.qty || 0);
        totalUnits += qty;
        totalCogs += Number(it.cost || 0) * qty;
      });
    });

    return {
      count: filteredSales.length,
      totalUnits,
      totalSubtotal,
      totalDiscounts,
      totalRevenue,
      totalCogs,
      totalProfit: totalRevenue - totalCogs,
    };
  }, [filteredSales]);

  const filteredPurchases = useMemo(() => {
    return vouchers.filter((v) => {
      if (!matchesDateRange(v.created_datetime, period, startDate, endDate)) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        v.vou_no.toLowerCase().includes(q) ||
        v.vend_name.toLowerCase().includes(q)
      );
    });
  }, [vouchers, period, startDate, endDate, search]);

  const filteredStock = useMemo(() => {
    if (!search.trim()) return catalogItems;
    const q = search.trim().toLowerCase();
    return catalogItems.filter(
      (i) =>
        i.description1.toLowerCase().includes(q) ||
        i.alu.toLowerCase().includes(q)
    );
  }, [catalogItems, search]);

  const handleExportCsv = () => {
    let csv = '';
    if (reportType === 'SALES') {
      csv =
        'Invoice No,Date & Time,Customer,Phone,Cashier,Payment Method,Items Sold,Units,Subtotal,Discount,Net Total,COGS,Gross Profit\n';
      filteredSales.forEach((d) => {
        const cust = `${d.bt_first_name} ${d.bt_last_name}`.trim();
        const payment = d.tenders?.[0]?.tender_name || 'Cash';
        const itemsDesc = (d.items || [])
          .map((i) => `${i.qty}x ${i.description1} (@Rs.${i.price})`)
          .join(' | ');
        const units = (d.items || []).reduce((s, i) => s + Number(i.qty || 0), 0);
        const cogs = (d.items || []).reduce(
          (s, i) => s + Number(i.cost || 0) * Number(i.qty || 0),
          0
        );
        const net = Number(d.transaction_total_amt || 0);
        const profit = net - cogs;
        csv += `"${d.doc_no}","${formatDateTime(d.invc_post_date)}","${cust}","${
          d.bt_primary_phone_no || ''
        }","${d.cashier_name}","${payment}","${itemsDesc}",${units},${d.sale_subtotal},${
          d.total_discount_amt
        },${net},${cogs},${profit}\n`;
      });
    } else if (reportType === 'PURCHASES') {
      csv = 'Purchase No,Date & Time,Supplier,Items Received,Total Qty,Total Cost\n';
      filteredPurchases.forEach((v) => {
        const itemsDesc = (v.items || []).map((i) => `${i.qty}x ${i.description1}`).join(' | ');
        csv += `"${v.vou_no}","${formatDateTime(v.created_datetime)}","${v.vend_name}","${itemsDesc}",${
          v.total_qty
        },${v.vou_total}\n`;
      });
    } else {
      csv = 'SKU Code,Product Name,Category,Stock Qty,Min Qty,Cost Price,Selling Price,Stock Cost Value\n';
      filteredStock.forEach((i) => {
        csv += `"${i.alu}","${i.description1}","${i.d_name}",${i.qty_on_hand},${i.min_qty},${i.cost},${
          i.retail_price
        },${Number(i.qty_on_hand) * Number(i.cost)}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tezbill-${reportType.toLowerCase()}-${period.toLowerCase()}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-5 h-full flex flex-col overflow-hidden">
      {/* Top Controls Bar (hidden when printing) */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Reports (Daily / Weekly / Monthly Printable)
          </h1>
          <p className="text-xs text-slate-500">
            Generate and print itemized Daily, Weekly, and Monthly sales, purchases, and stock reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Report / Save PDF
          </button>
        </div>
      </div>

      {/* Period & Report Type Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3 shrink-0 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Period Quick Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Calendar className="w-4 h-4 text-emerald-600 mr-1" />
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  period === p.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Report Type Switcher */}
          <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-0.5 text-xs">
            {[
              { id: 'SALES', label: 'Detailed Sales Report' },
              { id: 'PURCHASES', label: 'Purchases Report' },
              { id: 'STOCK', label: 'Stock Report' },
            ].map((rt) => (
              <button
                key={rt.id}
                type="button"
                onClick={() => setReportType(rt.id)}
                className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                  reportType === rt.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {rt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter report by invoice #, customer, cashier, product..."
              className="w-full pl-8 pr-3 py-1.5 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>

          {period === 'CUSTOM' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300"
              />
              <span className="font-semibold text-slate-600">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
          )}
        </div>
      </div>

      {/* Printable Report Sheet */}
      <div
        id="printable-report"
        className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs overflow-y-auto p-6 space-y-5"
      >
        {/* Report Masthead */}
        <div className="border-b-2 border-slate-900 pb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
                {activeStore?.store_name || 'Tezbill General Store'}
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {activeStore?.address1}, {activeStore?.city} &bull; Phone: {activeStore?.phone1}
            </p>
          </div>

          <div className="text-right text-xs">
            <div className="font-bold text-sm text-slate-900 uppercase">
              {reportType === 'SALES'
                ? `Sales Report — ${periodLabel}`
                : reportType === 'PURCHASES'
                ? `Purchases Report — ${periodLabel}`
                : 'Stock Valuation Report'}
            </div>
            <div className="text-slate-500 mt-0.5">
              Generated: {formatDateTime(new Date().toISOString())}
            </div>
            <div className="text-slate-500">
              Prepared By: {activeEmployee?.full_name || 'Main Admin'}
            </div>
          </div>
        </div>

        {/* SALES REPORT CONTENT */}
        {reportType === 'SALES' && (
          <>
            {/* KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">Total Sales Bills</span>
                <strong className="text-base text-slate-900">{salesSummary.count}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Total Units Sold</span>
                <strong className="text-base text-slate-900">{salesSummary.totalUnits}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Gross Subtotal</span>
                <strong className="text-base text-slate-900">
                  {formatPKR(salesSummary.totalSubtotal)}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Discounts Given</span>
                <strong className="text-base text-amber-700">
                  {formatPKR(salesSummary.totalDiscounts)}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Net Sales Revenue</span>
                <strong className="text-base text-emerald-700">
                  {formatPKR(salesSummary.totalRevenue)}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Gross Profit</span>
                <strong className="text-base text-emerald-800">
                  {formatPKR(salesSummary.totalProfit)}
                </strong>
              </div>
            </div>

            {/* Detailed Itemized Sales Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">Invoice #</th>
                    <th className="py-2.5 px-3 font-bold">Date &amp; Time</th>
                    <th className="py-2.5 px-3 font-bold">Customer &amp; Phone</th>
                    <th className="py-2.5 px-3 font-bold">Cashier</th>
                    <th className="py-2.5 px-3 font-bold">Itemized Products Sold</th>
                    <th className="py-2.5 px-3 font-bold">Payment</th>
                    <th className="py-2.5 px-3 font-bold text-right">Discount</th>
                    <th className="py-2.5 px-3 font-bold text-right">Net Sale</th>
                    <th className="py-2.5 px-3 font-bold text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No sales transactions recorded for the selected report period.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((doc) => {
                      const docCogs = (doc.items || []).reduce(
                        (s, it) => s + Number(it.cost || 0) * Number(it.qty || 0),
                        0
                      );
                      const docNet = Number(doc.transaction_total_amt || 0);
                      const docProfit = docNet - docCogs;

                      return (
                        <tr key={doc.doc_sid} className="align-top">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {doc.doc_no}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                            {formatDateTime(doc.invc_post_date)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">
                              {doc.bt_first_name} {doc.bt_last_name}
                            </div>
                            {doc.bt_primary_phone_no && (
                              <div className="text-[11px] font-mono text-slate-500">
                                {doc.bt_primary_phone_no}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                            {doc.cashier_name}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="space-y-0.5">
                              {(doc.items || []).map((it) => (
                                <div key={it.doc_item_sid} className="text-slate-800">
                                  <span className="font-mono font-bold">{it.qty}x</span>{' '}
                                  {it.description1}{' '}
                                  <span className="text-slate-500">
                                    (@ {formatPKR(it.price)} = {formatPKR(it.ext_price)})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                            {doc.tenders?.[0]?.tender_name || 'Cash'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-amber-700 whitespace-nowrap">
                            {formatPKR(doc.total_discount_amt)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                            {formatPKR(docNet)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                            {formatPKR(docProfit)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredSales.length > 0 && (
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                    <tr>
                      <td colSpan={6} className="py-2.5 px-3 text-right uppercase">
                        Report Period Totals ({salesSummary.count} Sales / {salesSummary.totalUnits} Units):
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-800">
                        {formatPKR(salesSummary.totalDiscounts)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-950">
                        {formatPKR(salesSummary.totalRevenue)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-800">
                        {formatPKR(salesSummary.totalProfit)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}

        {/* PURCHASES REPORT CONTENT */}
        {reportType === 'PURCHASES' && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 font-bold">Purchase #</th>
                  <th className="py-2.5 px-3 font-bold">Date &amp; Time</th>
                  <th className="py-2.5 px-3 font-bold">Supplier</th>
                  <th className="py-2.5 px-3 font-bold">Items Received</th>
                  <th className="py-2.5 px-3 font-bold text-right">Units</th>
                  <th className="py-2.5 px-3 font-bold text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No supplier purchases recorded for this period.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((v) => (
                    <tr key={v.vou_sid}>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{v.vou_no}</td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {formatDateTime(v.created_datetime)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{v.vend_name}</td>
                      <td className="py-2.5 px-3">
                        {(v.items || []).map((i) => (
                          <div key={i.vou_item_sid}>
                            <span className="font-mono font-bold">{i.qty}x</span> {i.description1} (@{' '}
                            {formatPKR(i.cost)})
                          </div>
                        ))}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">{v.total_qty}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatPKR(v.vou_total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* STOCK REPORT CONTENT */}
        {reportType === 'STOCK' && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 font-bold">SKU Code</th>
                  <th className="py-2.5 px-3 font-bold">Product Name</th>
                  <th className="py-2.5 px-3 font-bold">Category</th>
                  <th className="py-2.5 px-3 font-bold text-right">Stock On Hand</th>
                  <th className="py-2.5 px-3 font-bold text-right">Unit Cost</th>
                  <th className="py-2.5 px-3 font-bold text-right">Selling Price</th>
                  <th className="py-2.5 px-3 font-bold text-right">Total Cost Value</th>
                  <th className="py-2.5 px-3 font-bold text-right">Total Retail Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStock.map((i) => (
                  <tr key={i.item_sid}>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{i.alu}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{i.description1}</td>
                    <td className="py-2.5 px-3 text-slate-600">{i.d_name}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {i.qty_on_hand} {i.uom}
                    </td>
                    <td className="py-2.5 px-3 text-right">{formatPKR(i.cost)}</td>
                    <td className="py-2.5 px-3 text-right">{formatPKR(i.retail_price)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">
                      {formatPKR(Number(i.qty_on_hand) * Number(i.cost))}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                      {formatPKR(Number(i.qty_on_hand) * Number(i.retail_price))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
