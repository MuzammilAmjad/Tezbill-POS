import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';

const PosContext = createContext(null);
const STORAGE_KEY = 'tezbill_active_employee';

export function PosProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [bootstrap, setBootstrap] = useState({
    subsidiary: null,
    stores: [],
    workstations: [],
    priceLevels: [],
    taxCodes: [],
    dcsCategories: [],
    denominations: [],
    reasons: [],
    employees: [],
    activeShift: null,
  });

  const [activeStoreSid, setActiveStoreSid] = useState(1);
  const [activeWorkstationSid, setActiveWorkstationSid] = useState(1);
  const [activeEmployee, setActiveEmployeeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [catalogItems, setCatalogItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [completedDocs, setCompletedDocs] = useState([]);
  const [heldDocs, setHeldDocs] = useState([]);
  const [receiptModalDoc, setReceiptModalDoc] = useState(null);
  const [toast, setToast] = useState(null);

  const setActiveEmployee = useCallback((emp) => {
    setActiveEmployeeState(emp);
    try {
      if (emp) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(emp));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((prev) => (prev && Date.now() - prev.id >= 3400 ? null : prev));
    }, 3500);
  }, []);

  const refreshAll = useCallback(
    async (requestedStoreSid = activeStoreSid) => {
      try {
        const bootData = await api.getBootstrap(requestedStoreSid);
        const resolvedStoreSid = bootData.stores?.[0]?.store_sid || 1;
        setActiveStoreSid(resolvedStoreSid);

        const [catData, custData, vendData, vouData, salesData, heldData] = await Promise.all([
          api.getCatalog({ storeSid: resolvedStoreSid, includeInactive: true }),
          api.getCustomers(),
          api.getVendors(),
          api.getVouchers(resolvedStoreSid),
          api.getDocuments({ storeSid: resolvedStoreSid, isHeld: 0 }),
          api.getDocuments({ storeSid: resolvedStoreSid, isHeld: 1 }),
        ]);

        setBootstrap(bootData);
        setCatalogItems(catData.items || []);
        setCustomers(custData.customers || []);
        setVendors(vendData.vendors || []);
        setVouchers(vouData.vouchers || []);
        setCompletedDocs(salesData.documents || []);
        setHeldDocs(heldData.documents || []);

        if (bootData.workstations?.length > 0) {
          setActiveWorkstationSid(bootData.workstations[0].workstation_sid);
        }
      } catch (err) {
        notify(err.message || 'Failed to load store data', 'error');
      } finally {
        setLoading(false);
      }
    },
    [activeStoreSid, notify]
  );

  useEffect(() => {
    refreshAll(activeStoreSid);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      if (activeEmployee?.empl_sid) {
        await api.logout(activeEmployee.empl_sid);
      }
    } catch {
      // ignore logout error
    }
    setActiveEmployee(null);
    notify('Signed out');
  }, [activeEmployee, setActiveEmployee, notify]);

  const activeStore =
    bootstrap.stores.find((s) => s.store_sid === Number(activeStoreSid)) ||
    bootstrap.stores[0] ||
    null;

  const activeWorkstation =
    bootstrap.workstations.find((w) => w.workstation_sid === Number(activeWorkstationSid)) ||
    bootstrap.workstations[0] ||
    null;

  return (
    <PosContext.Provider
      value={{
        loading,
        bootstrap,
        activeStore,
        activeStoreSid,
        setActiveStoreSid,
        activeWorkstation,
        activeWorkstationSid,
        setActiveWorkstationSid,
        activeEmployee,
        setActiveEmployee,
        handleLogout,
        catalogItems,
        customers,
        vendors,
        vouchers,
        completedDocs,
        heldDocs,
        receiptModalDoc,
        setReceiptModalDoc,
        toast,
        notify,
        refreshAll,
      }}
    >
      {children}
    </PosContext.Provider>
  );
}

export function usePos() {
  const ctx = useContext(PosContext);
  if (!ctx) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return ctx;
}
