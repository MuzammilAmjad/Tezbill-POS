import React, { useState, useEffect } from 'react';
import { PosProvider, usePos } from './context/PosContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import PosTerminalView from './components/PosTerminalView.jsx';
import DocumentsView from './components/DocumentsView.jsx';
import InventoryView from './components/InventoryView.jsx';
import CustomersView from './components/CustomersView.jsx';
import AuditLogView from './components/AuditLogView.jsx';
import LoginView from './components/LoginView.jsx';
import ReceiptModal from './components/ReceiptModal.jsx';

function PosShell() {
  const { loading, activeEmployee, receiptModalDoc, setReceiptModalDoc, toast } = usePos();
  const isAdmin = Boolean(activeEmployee?.admin);
  const [activeTab, setActiveTab] = useState(isAdmin ? 'inventory' : 'pos');

  useEffect(() => {
    if (!activeEmployee) return;
    if (isAdmin && activeTab === 'pos') {
      setActiveTab('inventory');
    } else if (!isAdmin && activeTab === 'audit') {
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
              {!isAdmin && activeTab === 'pos' && <PosTerminalView />}
              {activeTab === 'inventory' && <InventoryView />}
              {activeTab === 'customers' && <CustomersView />}
              {activeTab === 'documents' && <DocumentsView />}
              {isAdmin && activeTab === 'audit' && <AuditLogView />}
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
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg shadow-lg border text-xs font-semibold transition-all ${
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
