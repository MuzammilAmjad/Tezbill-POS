import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { formatPKR, formatDateTime } from '../utils/formatters.js';

export default function ReceiptModal({ document, onClose }) {
  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden my-8">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm">Sale Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div id="printable-receipt" className="p-6 bg-white text-slate-900 font-mono text-xs leading-relaxed">
          <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
            <div className="font-bold text-base uppercase">
              {document.store_name || 'Tezbill General Store'}
            </div>
            <div className="text-[11px] text-slate-600">{document.address1}</div>
            <div className="text-[11px] text-slate-600">
              {document.city} &bull; {document.phone1}
            </div>
          </div>

          <div className="space-y-1 border-b border-dashed border-slate-300 pb-3 mb-3 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Bill No:</span>
              <span className="font-bold">{document.doc_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span>{formatDateTime(document.invc_post_date || document.created_datetime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span>
                {document.bt_first_name} {document.bt_last_name}
              </span>
            </div>
          </div>

          {document.items?.length > 0 && (
            <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
              <div className="grid grid-cols-12 font-bold text-[10px] uppercase text-slate-500 pb-1 border-b border-slate-200 mb-2">
                <div className="col-span-6">Item</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-4 text-right">Amount</div>
              </div>
              <div className="space-y-1.5">
                {document.items.map((item) => (
                  <div key={item.doc_item_sid || item.item_pos} className="grid grid-cols-12 text-[11px]">
                    <div className="col-span-6 font-medium text-slate-900">{item.description1}</div>
                    <div className="col-span-2 text-right text-slate-600">{item.qty}</div>
                    <div className="col-span-4 text-right font-semibold text-slate-900">
                      {formatPKR(item.ext_price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1 border-b border-dashed border-slate-300 pb-3 mb-3 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal:</span>
              <span>{formatPKR(document.sale_subtotal)}</span>
            </div>
            {Number(document.total_discount_amt) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span>- {formatPKR(document.total_discount_amt)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-200">
              <span>TOTAL:</span>
              <span>{formatPKR(document.transaction_total_amt)}</span>
            </div>
          </div>

          {document.tenders?.length > 0 && (
            <div className="space-y-1 border-b border-dashed border-slate-300 pb-3 mb-3 text-[11px]">
              {document.tenders.map((t, idx) => (
                <div key={t.tender_sid || idx} className="flex justify-between">
                  <span>Paid ({t.tender_name}):</span>
                  <span className="font-semibold">{formatPKR(t.taken)}</span>
                </div>
              ))}
              {Number(document.given_amt) > 0 && (
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Change Returned:</span>
                  <span>{formatPKR(document.given_amt)}</span>
                </div>
              )}
            </div>
          )}

          <div className="text-center text-[11px] text-slate-500">
            <p>{document.receipt_footer || 'Thank you for shopping with us.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
