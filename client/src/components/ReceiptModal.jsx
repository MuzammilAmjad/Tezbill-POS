import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { formatPKR, formatDateTime } from '../utils/formatters.js';

export default function ReceiptModal({ document, onClose }) {
  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm">Sale Invoice Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div id="printable-receipt" className="p-7 bg-white text-slate-900 text-sm">
          {/* Store Header */}
          <div className="text-center border-b border-slate-200 pb-4 mb-4">
            <div className="font-bold text-xl tracking-tight text-slate-900 uppercase">
              {document.store_name || 'Tezbill General Store'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {document.address1}
              {document.city ? `, ${document.city}` : ''}
            </div>
            {document.phone1 && (
              <div className="text-xs text-slate-500 mt-0.5">Phone: {document.phone1}</div>
            )}
          </div>

          {/* Invoice Meta Details */}
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs mb-4">
            <div>
              <span className="text-slate-500">Bill No: </span>
              <span className="font-mono font-bold text-slate-900">{document.doc_no}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Date: </span>
              <span className="font-medium text-slate-800">
                {formatDateTime(document.invc_post_date || document.created_datetime)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Customer: </span>
              <span className="font-semibold text-slate-800">
                {document.bt_first_name} {document.bt_last_name}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Cashier: </span>
              <span className="font-medium text-slate-800">{document.cashier_name || 'Cashier'}</span>
            </div>
          </div>

          {/* Line Items Table */}
          {document.items?.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Item Description</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Rate</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Qty</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {document.items.map((item) => (
                    <tr key={item.doc_item_sid || item.item_pos}>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{item.description1}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{formatPKR(item.price)}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-800">{item.qty}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                        {formatPKR(item.ext_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals Summary */}
          <div className="space-y-1.5 border-t border-slate-200 pt-3 mb-4 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-medium text-slate-800">{formatPKR(document.sale_subtotal)}</span>
            </div>
            {Number(document.total_discount_amt) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount</span>
                <span className="font-medium">- {formatPKR(document.total_discount_amt)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Amount</span>
              <span>{formatPKR(document.transaction_total_amt)}</span>
            </div>
          </div>

          {/* Payment Details */}
          {document.tenders?.length > 0 && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-xs mb-4">
              {document.tenders.map((t, idx) => (
                <div key={t.tender_sid || idx} className="flex justify-between">
                  <span className="text-slate-600">Paid via {t.tender_name}</span>
                  <span className="font-semibold text-slate-900">{formatPKR(t.taken)}</span>
                </div>
              ))}
              {Number(document.given_amt) > 0 && (
                <div className="flex justify-between font-bold text-emerald-800 pt-1 border-t border-slate-200">
                  <span>Change Returned</span>
                  <span>{formatPKR(document.given_amt)}</span>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-slate-500 pt-2 border-t border-dashed border-slate-200">
            <p>{document.receipt_footer || 'Thank you for shopping with us.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
