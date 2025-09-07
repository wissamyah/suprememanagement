import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import type { LedgerEntry, Customer, Sale } from '../types';
import { storage, generateId } from '../utils/storage';
import { GitHubContext } from '../App';
import githubStorage from '../services/githubStorage';
import { globalSyncManager } from '../services/globalSyncManager';

const LEDGER_KEY = 'ledger_entries';
const CUSTOMERS_KEY = 'customers';
const SALES_KEY = 'sales';

export const useLedgerWithGitHub = () => {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncPending, setSyncPending] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const { isAuthenticated } = useContext(GitHubContext);
  const mountedRef = useRef(true);
  const isInitialLoad = useRef(true);

  // Cleanup on unmount and subscribe to global sync
  useEffect(() => {
    mountedRef.current = true;
    
    // Subscribe to global sync state for UI updates
    const unsubscribe = globalSyncManager.subscribe((syncState) => {
      if (mountedRef.current) {
        setSyncPending(syncState.isPending);
        setPendingChanges(syncState.pendingChanges);
        setLastSyncError(syncState.error);
      }
    });
    
    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  // Load data from GitHub or localStorage
  const loadData = async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      if (isAuthenticated) {
        // Load all data from GitHub
        const githubData = await githubStorage.loadAllData();
        
        if (githubData) {
          // Set ledger data from GitHub
          setLedgerEntries(githubData.ledgerEntries || []);
          setCustomers(githubData.customers || []);
          setSales(githubData.sales || []);
          
          // Update localStorage with GitHub data as backup
          storage.set(LEDGER_KEY, githubData.ledgerEntries || []);
          storage.set(CUSTOMERS_KEY, githubData.customers || []);
          storage.set(SALES_KEY, githubData.sales || []);
        }
      } else {
        // Load from localStorage
        const storedLedger = storage.get<LedgerEntry[]>(LEDGER_KEY) || [];
        const storedCustomers = storage.get<Customer[]>(CUSTOMERS_KEY) || [];
        const storedSales = storage.get<Sale[]>(SALES_KEY) || [];
        console.log('Loading ledger from localStorage:', storedLedger.length, 'entries');
        setLedgerEntries(storedLedger);
        setCustomers(storedCustomers);
        setSales(storedSales);
      }
    } catch (error) {
      console.error('Error loading ledger data:', error);
      // Fallback to localStorage on error
      const storedLedger = storage.get<LedgerEntry[]>(LEDGER_KEY) || [];
      const storedCustomers = storage.get<Customer[]>(CUSTOMERS_KEY) || [];
      const storedSales = storage.get<Sale[]>(SALES_KEY) || [];
      console.log('Fallback - Loading ledger from localStorage:', storedLedger.length, 'entries');
      setLedgerEntries(storedLedger);
      setCustomers(storedCustomers);
      setSales(storedSales);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        // Mark initial load as complete
        setTimeout(() => {
          isInitialLoad.current = false;
        }, 100);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  // Listen for storage events to sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `supreme_mgmt_${LEDGER_KEY}`) {
        const newData = e.newValue ? JSON.parse(e.newValue) : [];
        setLedgerEntries(newData);
      } else if (e.key === `supreme_mgmt_${CUSTOMERS_KEY}`) {
        const newData = e.newValue ? JSON.parse(e.newValue) : [];
        setCustomers(newData);
      } else if (e.key === `supreme_mgmt_${SALES_KEY}`) {
        const newData = e.newValue ? JSON.parse(e.newValue) : [];
        setSales(newData);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Notify global sync manager when data changes
  useEffect(() => {
    // Skip initial load to avoid marking as changed on mount
    if (mountedRef.current && isAuthenticated && !loading && !isInitialLoad.current) {
      globalSyncManager.markAsChanged();
    }
  }, [ledgerEntries, isAuthenticated, loading]);

  // Save data to localStorage and trigger sync
  const saveData = (newEntries: LedgerEntry[], newCustomers?: Customer[]) => {
    // Save to local state immediately (optimistic update)
    setLedgerEntries(newEntries);
    if (newCustomers) {
      setCustomers(newCustomers);
    }
    
    // Save to localStorage
    storage.set(LEDGER_KEY, newEntries);
    if (newCustomers) {
      storage.set(CUSTOMERS_KEY, newCustomers);
    }
    
    // Trigger storage events for other components to react
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'supreme_mgmt_ledger_entries',
      newValue: JSON.stringify(newEntries),
      url: window.location.href
    }));
    
    if (newCustomers) {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'supreme_mgmt_customers',
        newValue: JSON.stringify(newCustomers),
        url: window.location.href
      }));
    }
    
    // Notify global sync manager - immediate sync for ledger operations
    globalSyncManager.markAsChanged(true);
  };

  // Recalculate running balances for a customer
  const recalculateBalances = useCallback((entries: LedgerEntry[], customerId?: string): LedgerEntry[] => {
    // Filter entries for specific customer if provided
    const filteredEntries = customerId 
      ? entries.filter(e => e.customerId === customerId)
      : entries;
    
    // Group by customer
    const customerGroups = new Map<string, LedgerEntry[]>();
    filteredEntries.forEach(entry => {
      if (!customerGroups.has(entry.customerId)) {
        customerGroups.set(entry.customerId, []);
      }
      customerGroups.get(entry.customerId)!.push(entry);
    });
    
    // Recalculate balances for each customer
    const updatedEntries: LedgerEntry[] = [];
    
    customerGroups.forEach((customerEntries) => {
      // Sort by date and then by creation time
      const sorted = [...customerEntries].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        // If same date, sort by creation time
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      
      let balance = 0;
      sorted.forEach(entry => {
        // For open book: credit increases balance (customer has credit), debit decreases (customer owes)
        balance = balance + entry.credit - entry.debit;
        updatedEntries.push({
          ...entry,
          runningBalance: balance
        });
      });
    });
    
    // If we're recalculating for a specific customer, merge with other entries
    if (customerId) {
      const otherEntries = entries.filter(e => e.customerId !== customerId);
      return [...otherEntries, ...updatedEntries];
    }
    
    return updatedEntries;
  }, []);

  // Add a new ledger entry
  const addEntry = useCallback((
    customerId: string,
    transactionType: LedgerEntry['transactionType'],
    debit: number,
    credit: number,
    description: string,
    options?: {
      date?: Date;
      referenceId?: string;
      referenceNumber?: string;
      paymentMethod?: LedgerEntry['paymentMethod'];
      notes?: string;
    }
  ): { success: boolean; error?: string; entryId?: string } => {
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }

      const now = new Date();
      const newEntry: LedgerEntry = {
        id: generateId(),
        customerId,
        customerName: customer.name,
        date: options?.date || now,
        transactionType,
        referenceId: options?.referenceId,
        referenceNumber: options?.referenceNumber,
        description,
        debit,
        credit,
        runningBalance: 0, // Will be calculated
        paymentMethod: options?.paymentMethod,
        notes: options?.notes,
        createdAt: now,
        updatedAt: now
      };

      // Add new entry and recalculate balances
      const allEntries = [...ledgerEntries, newEntry];
      const updatedEntries = recalculateBalances(allEntries, customerId);
      
      // Update customer balance
      const customerBalance = updatedEntries
        .filter(e => e.customerId === customerId)
        .reduce((_, entry) => entry.runningBalance, 0);
      
      const updatedCustomers = customers.map(c => {
        if (c.id === customerId) {
          return {
            ...c,
            balance: customerBalance,
            updatedAt: now
          };
        }
        return c;
      });

      saveData(updatedEntries, updatedCustomers);
      
      return { success: true, entryId: newEntry.id };
    } catch (error) {
      console.error('Error adding ledger entry:', error);
      return { success: false, error: 'Failed to add ledger entry' };
    }
  }, [ledgerEntries, customers, recalculateBalances]);

  // Update an existing ledger entry
  const updateEntry = useCallback((
    entryId: string,
    updates: Partial<Omit<LedgerEntry, 'id' | 'customerId' | 'customerName' | 'createdAt' | 'runningBalance'>>
  ): { success: boolean; error?: string } => {
    try {
      const entryIndex = ledgerEntries.findIndex(e => e.id === entryId);
      if (entryIndex === -1) {
        return { success: false, error: 'Entry not found' };
      }

      const oldEntry = ledgerEntries[entryIndex];
      const updatedEntry = {
        ...oldEntry,
        ...updates,
        updatedAt: new Date()
      };

      const allEntries = [...ledgerEntries];
      allEntries[entryIndex] = updatedEntry;
      
      // Recalculate balances for this customer
      const updatedEntries = recalculateBalances(allEntries, oldEntry.customerId);
      
      // Update customer balance
      const customerBalance = updatedEntries
        .filter(e => e.customerId === oldEntry.customerId)
        .reduce((_, entry) => entry.runningBalance, 0);
      
      const updatedCustomers = customers.map(c => {
        if (c.id === oldEntry.customerId) {
          return {
            ...c,
            balance: customerBalance,
            updatedAt: new Date()
          };
        }
        return c;
      });

      saveData(updatedEntries, updatedCustomers);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating ledger entry:', error);
      return { success: false, error: 'Failed to update ledger entry' };
    }
  }, [ledgerEntries, customers, recalculateBalances]);

  // Delete a ledger entry
  const deleteEntry = useCallback((entryId: string): { success: boolean; error?: string } => {
    try {
      const entry = ledgerEntries.find(e => e.id === entryId);
      if (!entry) {
        return { success: false, error: 'Entry not found' };
      }

      // Remove entry
      const filteredEntries = ledgerEntries.filter(e => e.id !== entryId);
      
      // Recalculate balances for this customer
      const updatedEntries = recalculateBalances(filteredEntries, entry.customerId);
      
      // Update customer balance
      const customerBalance = updatedEntries
        .filter(e => e.customerId === entry.customerId)
        .reduce((_, e) => e.runningBalance, 0);
      
      const updatedCustomers = customers.map(c => {
        if (c.id === entry.customerId) {
          return {
            ...c,
            balance: customerBalance,
            updatedAt: new Date()
          };
        }
        return c;
      });

      saveData(updatedEntries, updatedCustomers);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting ledger entry:', error);
      return { success: false, error: 'Failed to delete ledger entry' };
    }
  }, [ledgerEntries, customers, recalculateBalances]);

  // Update sale-related ledger entry (amount only, no duplicates)
  const updateSaleEntry = useCallback((
    saleId: string,
    newAmount: number
  ): { success: boolean; error?: string } => {
    try {
      // Find existing entry by referenceId
      const entryIndex = ledgerEntries.findIndex(e => 
        e.referenceId === saleId && e.transactionType === 'sale'
      );
      
      if (entryIndex === -1) {
        return { success: false, error: 'Sale entry not found' };
      }

      const oldEntry = ledgerEntries[entryIndex];
      const updatedEntry = {
        ...oldEntry,
        debit: newAmount,
        updatedAt: new Date()
      };

      const allEntries = [...ledgerEntries];
      allEntries[entryIndex] = updatedEntry;
      
      // Recalculate balances for this customer
      const updatedEntries = recalculateBalances(allEntries, oldEntry.customerId);
      
      // Update customer balance
      const customerBalance = updatedEntries
        .filter(e => e.customerId === oldEntry.customerId)
        .reduce((_, entry) => entry.runningBalance, 0);
      
      const updatedCustomers = customers.map(c => {
        if (c.id === oldEntry.customerId) {
          return {
            ...c,
            balance: customerBalance,
            updatedAt: new Date()
          };
        }
        return c;
      });

      saveData(updatedEntries, updatedCustomers);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating sale entry:', error);
      return { success: false, error: 'Failed to update sale entry' };
    }
  }, [ledgerEntries, customers, recalculateBalances]);

  // Delete sale-related ledger entry
  const deleteSaleEntry = useCallback((saleId: string): { success: boolean; error?: string } => {
    try {
      const entry = ledgerEntries.find(e => 
        e.referenceId === saleId && e.transactionType === 'sale'
      );
      
      if (!entry) {
        return { success: false, error: 'Sale entry not found' };
      }

      return deleteEntry(entry.id);
    } catch (error) {
      console.error('Error deleting sale entry:', error);
      return { success: false, error: 'Failed to delete sale entry' };
    }
  }, [ledgerEntries, deleteEntry]);

  // Get ledger entries for a specific customer
  const getCustomerLedger = useCallback((customerId: string): LedgerEntry[] => {
    return ledgerEntries
      .filter(e => e.customerId === customerId)
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [ledgerEntries]);

  // Get all customers with their current balances
  const getAllCustomersWithBalances = useCallback((): Array<{
    customer: Customer;
    balance: number;
    lastTransaction?: LedgerEntry;
  }> => {
    return customers.map(customer => {
      const customerEntries = ledgerEntries
        .filter(e => e.customerId === customer.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const lastEntry = customerEntries[0];
      const balance = lastEntry ? lastEntry.runningBalance : customer.balance;
      
      return {
        customer,
        balance,
        lastTransaction: lastEntry
      };
    });
  }, [customers, ledgerEntries]);

  // Force sync method - delegate to global sync manager
  const forceSync = useCallback(async () => {
    if (isAuthenticated && mountedRef.current) {
      console.log('Force sync triggered for ledger');
      await globalSyncManager.forceSync();
    }
  }, [isAuthenticated]);

  return {
    ledgerEntries,
    customers,
    sales,
    loading,
    pendingChanges,
    lastSyncError,
    syncInProgress: syncPending,
    addEntry,
    updateEntry,
    deleteEntry,
    updateSaleEntry,
    deleteSaleEntry,
    getCustomerLedger,
    getAllCustomersWithBalances,
    recalculateBalances,
    forceSync,
    refreshData: loadData
  };
};