import React, { useState, useEffect } from 'react';
import { PosProvider, usePos } from './context/PosContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import DashboardView from './components/DashboardView.jsx';
import PosTerminalView from './components/PosTerminalView.jsx';
import DocumentsView from './components/DocumentsView.jsx';
import PurchasingView from './components/PurchasingView.jsx';
import InventoryView from './components/InventoryView.jsx';
import StockView from './components/StockView.jsx';
import SuppliersView from './components/SuppliersView.jsx';
import CustomersView from './components/CustomersView.jsx';
import ProfitLossView from './components/ProfitLossView.jsx';
import ReportsView from './components/ReportsView.jsx';
import AuditLogView from './components/AuditLogView.jsx';
import StoreConfigView from './components/StoreConfigView.jsx';
import LoginView from './components/LoginView.jsx';
import ReceiptModal from './components/ReceiptModal.jsx';

const ADMIN_TABS = [
  'dashboard',
  'documents',
  'purchasing',
  'inventory',
  'stock',
  'suppliers',
  'customers',
  'profit',
  'reports',
  'audit',
  'settings',
];
const CASHIER_TABS = ['pos', 'documents', 'inventory', 'stock', 'customers'];

function PosShell() {
  const { loading, activeEmployee, receiptModalDoc, setReceiptModalDoc, toast } = usePos();
  const isAdmin = Boolean(activeEmployee?.admin);
  const [activeTab, setActiveTab] = useState(isAdmin ? 'dashboard' : 'pos');

  useEffect(() => {
    if (!activeEmployee) return;
    if (isAdmin && !ADMIN_TABS.includes(activeTab)) {
      setActiveTab('dashboard');
    } else if (!isAdmin && !CASHIER_TABS.includes(activeTab)) {
      setActiveTab('pos');
    }
  }, [activeEmployee, isAdmin, activeTab]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-slate-200 text-sm font-medium">
        Loading Tezbill POS...
      </div>
    );
  }

  return (
    <>
      {!activeEmployee ? (
        <LoginView />
      ) : (
        <div className="h-screen w-screen flex overflow-hidden bg-slate-100 text-slate-900">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <TopBar />

            <main className="flex-1 min-h-0 overflow-hidden">
              {isAdmin && activeTab === 'dashboard' && <DashboardView setActiveTab={setActiveTab} />}
              {!isAdmin && activeTab === 'pos' && <PosTerminalView />}
              {activeTab === 'documents' && <DocumentsView />}
              {isAdmin && activeTab === 'purchasing' && <PurchasingView />}
              {activeTab === 'inventory' && <InventoryView />}
              {activeTab === 'stock' && <StockView />}
              {isAdmin && activeTab === 'suppliers' && <SuppliersView />}
              {activeTab === 'customers' && <CustomersView />}
              {isAdmin && activeTab === 'profit' && <ProfitLossView />}
              {isAdmin && activeTab === 'reports' && <ReportsView />}
              {isAdmin && activeTab === 'audit' && <AuditLogView />}
              {isAdmin && activeTab === 'settings' && <StoreConfigView />}
            </main>
          </div>

          {receiptModalDoc && (
            <ReceiptModal
              document={receiptModalDoc}
              onClose={() => setReceiptModalDoc(null)}
            />
          )}
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg shadow-lg border text-xs font-semibold transition-all print:hidden ${
            toast.type === 'error'
              ? 'bg-rose-900 text-white border-rose-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <PosProvider>
      <PosShell />
    </PosProvider>
  );
}
