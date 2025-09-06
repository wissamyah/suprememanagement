import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import type { Customer } from '../types';
import { storage, generateId } from '../utils/storage';
import { GitHubContext } from '../App';
import githubStorage from '../services/githubStorage';
import { globalSyncManager } from '../services/globalSyncManager';

const CUSTOMERS_KEY = 'customers';

export const useCustomersWithGitHub = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
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

  // Define loadData function
  const loadData = async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      if (isAuthenticated) {
        // Load all data from GitHub
        const githubData = await githubStorage.loadAllData();
        
        if (githubData) {
          // Set customers data from GitHub
          setCustomers(githubData.customers || []);
          
          // Update localStorage with GitHub data as backup
          storage.set(CUSTOMERS_KEY, githubData.customers || []);
        }
      } else {
        // Load from localStorage
        const storedCustomers = storage.get<Customer[]>(CUSTOMERS_KEY) || [];
        setCustomers(storedCustomers);
      }
    } catch (error) {
      console.error('Error loading customers data:', error);
      // Fallback to localStorage on error
      const storedCustomers = storage.get<Customer[]>(CUSTOMERS_KEY) || [];
      setCustomers(storedCustomers);
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
      if (e.key === `supreme_mgmt_${CUSTOMERS_KEY}`) {
        const newData = e.newValue ? JSON.parse(e.newValue) : [];
        setCustomers(newData);
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
  }, [customers, isAuthenticated, loading]);

  const saveCustomers = (newCustomers: Customer[]) => {
    // Save to local state immediately (optimistic update)
    setCustomers(newCustomers);
    storage.set(CUSTOMERS_KEY, newCustomers);
    
    // Trigger storage event for other tabs/components
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'supreme_mgmt_customers',
      newValue: JSON.stringify(newCustomers),
      url: window.location.href
    }));
    
    // Notify global sync manager
    globalSyncManager.markAsChanged();
  };

  // Customer operations
  const addCustomer = useCallback((
    name: string,
    phone: string,
    state: string,
    initialBalance: number = 0
  ): { success: boolean; errors?: string[] } => {
    try {
      // Check for duplicate by name and phone
      const existingByName = customers.find(c => 
        c.name.toLowerCase() === name.toLowerCase()
      );
      const existingByPhone = customers.find(c => 
        c.phone === phone
      );

      if (existingByName) {
        return { 
          success: false, 
          errors: [`Customer with name "${name}" already exists`] 
        };
      }

      if (existingByPhone) {
        return { 
          success: false, 
          errors: [`Customer with phone number "${phone}" already exists`] 
        };
      }

      const now = new Date();
      const newCustomer: Customer = {
        id: generateId(),
        name,
        phone,
        state,
        balance: initialBalance,
        createdAt: now,
        updatedAt: now
      };

      const updatedCustomers = [...customers, newCustomer];
      saveCustomers(updatedCustomers);
      
      return { success: true };
    } catch (error) {
      console.error('Error adding customer:', error);
      return { success: false, errors: ['Failed to add customer'] };
    }
  }, [customers]);

  const updateCustomer = useCallback((
    id: string, 
    updates: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>
  ): { success: boolean; errors?: string[] } => {
    try {
      const customerIndex = customers.findIndex(c => c.id === id);
      if (customerIndex === -1) {
        return { 
          success: false, 
          errors: ['Customer not found'] 
        };
      }

      // Check for duplicate name or phone if they're being updated
      if (updates.name) {
        const existingByName = customers.find(c => 
          c.id !== id && c.name.toLowerCase() === updates.name!.toLowerCase()
        );
        if (existingByName) {
          return { 
            success: false, 
            errors: [`Another customer with name "${updates.name}" already exists`] 
          };
        }
      }

      if (updates.phone) {
        const existingByPhone = customers.find(c => 
          c.id !== id && c.phone === updates.phone
        );
        if (existingByPhone) {
          return { 
            success: false, 
            errors: [`Another customer with phone number "${updates.phone}" already exists`] 
          };
        }
      }

      const updatedCustomers = customers.map(customer => {
        if (customer.id === id) {
          return {
            ...customer,
            ...updates,
            updatedAt: new Date()
          };
        }
        return customer;
      });

      saveCustomers(updatedCustomers);
      return { success: true };
    } catch (error) {
      console.error('Error updating customer:', error);
      return { success: false, errors: ['Failed to update customer'] };
    }
  }, [customers]);

  const deleteCustomer = useCallback((id: string): { success: boolean; warning?: string } => {
    try {
      const customer = customers.find(c => c.id === id);
      if (!customer) {
        return { success: false };
      }

      // Check if customer has outstanding balance
      let warning: string | undefined;
      if (customer.balance !== 0) {
        warning = `Customer has an outstanding balance of ₦${customer.balance.toLocaleString()}`;
      }

      const updatedCustomers = customers.filter(c => c.id !== id);
      saveCustomers(updatedCustomers);
      
      return { success: true, warning };
    } catch (error) {
      console.error('Error deleting customer:', error);
      return { success: false };
    }
  }, [customers]);

  const updateCustomerBalance = useCallback((
    id: string, 
    amount: number,
    operation: 'add' | 'subtract' | 'set'
  ): { success: boolean; newBalance?: number } => {
    try {
      const customerIndex = customers.findIndex(c => c.id === id);
      if (customerIndex === -1) {
        return { success: false };
      }

      const updatedCustomers = customers.map(customer => {
        if (customer.id === id) {
          let newBalance = customer.balance;
          
          switch (operation) {
            case 'add':
              newBalance += amount;
              break;
            case 'subtract':
              newBalance -= amount;
              break;
            case 'set':
              newBalance = amount;
              break;
          }

          return {
            ...customer,
            balance: newBalance,
            updatedAt: new Date()
          };
        }
        return customer;
      });

      saveCustomers(updatedCustomers);
      
      const updatedCustomer = updatedCustomers.find(c => c.id === id);
      return { 
        success: true, 
        newBalance: updatedCustomer?.balance 
      };
    } catch (error) {
      console.error('Error updating customer balance:', error);
      return { success: false };
    }
  }, [customers]);

  const getCustomerById = useCallback((id: string): Customer | undefined => {
    return customers.find(c => c.id === id);
  }, [customers]);

  const searchCustomers = useCallback((query: string): Customer[] => {
    const searchTerm = query.toLowerCase();
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(searchTerm) ||
      customer.phone.includes(searchTerm) ||
      customer.state.toLowerCase().includes(searchTerm)
    );
  }, [customers]);

  const getCustomersByState = useCallback((state: string): Customer[] => {
    return customers.filter(c => c.state === state);
  }, [customers]);

  const getCustomersByBalance = useCallback((filter: 'positive' | 'negative' | 'zero'): Customer[] => {
    switch (filter) {
      case 'positive':
        return customers.filter(c => c.balance > 0);
      case 'negative':
        return customers.filter(c => c.balance < 0);
      case 'zero':
        return customers.filter(c => c.balance === 0);
      default:
        return customers;
    }
  }, [customers]);

  // Calculate statistics
  const getStatistics = useCallback(() => {
    const totalCustomers = customers.length;
    const totalPositiveBalance = customers
      .filter(c => c.balance > 0)
      .reduce((sum, c) => sum + c.balance, 0);
    const totalNegativeBalance = customers
      .filter(c => c.balance < 0)
      .reduce((sum, c) => sum + Math.abs(c.balance), 0);
    const customersWithDebt = customers.filter(c => c.balance < 0).length;

    return {
      totalCustomers,
      totalPositiveBalance,
      totalNegativeBalance,
      customersWithDebt
    };
  }, [customers]);

  // Force sync method - delegate to global sync manager
  const forceSync = useCallback(async () => {
    if (isAuthenticated && mountedRef.current) {
      console.log('Force sync triggered for customers');
      await globalSyncManager.forceSync();
    }
  }, [isAuthenticated]);

  return {
    customers,
    loading,
    pendingChanges,
    lastSyncError,
    syncInProgress: syncPending,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    updateCustomerBalance,
    getCustomerById,
    searchCustomers,
    getCustomersByState,
    getCustomersByBalance,
    getStatistics,
    forceSync,
    refreshData: loadData
  };
};