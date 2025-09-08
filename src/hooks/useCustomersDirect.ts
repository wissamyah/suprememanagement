// Direct GitHub customers hook - no localStorage dependency
import { useCallback } from 'react';
import { useGitHubData } from './useGitHubData';
import type { Customer, LedgerEntry } from '../types';
import { generateId } from '../utils/storage';

export const useCustomersDirect = () => {
  // Use the base hook for each data type
  const {
    data: customers,
    loading: customersLoading,
    error: customersError,
    updateData: updateCustomers,
    isOnline,
    isSyncing,
    offlineQueueSize,
    refresh,
    forceSync
  } = useGitHubData<Customer>({ dataType: 'customers', immediate: true });
  
  const {
    data: ledgerEntries,
    updateData: updateLedgerEntries
  } = useGitHubData<LedgerEntry>({ dataType: 'ledgerEntries', immediate: true });
  
  const loading = customersLoading;
  const error = customersError;
  
  // Add customer
  const addCustomer = useCallback((
    name: string,
    phone: string,
    state: string = 'Lagos'
  ): { success: boolean; customer?: Customer; errors?: string[] } => {
    try {
      // Check for duplicate
      const existing = customers.find(c => 
        c.name.toLowerCase() === name.toLowerCase() || 
        c.phone === phone
      );
      
      if (existing) {
        return { 
          success: false, 
          errors: ['Customer with this name or phone already exists'] 
        };
      }
      
      const now = new Date();
      const newCustomer: Customer = {
        id: generateId(),
        name,
        phone,
        state,
        balance: 0,
        createdAt: now,
        updatedAt: now
      };
      
      // Fire and forget
      updateCustomers([...customers, newCustomer]).catch(console.error);
      
      return { success: true, customer: newCustomer };
    } catch (error) {
      console.error('Error adding customer:', error);
      return { success: false, errors: ['Failed to add customer'] };
    }
  }, [customers, updateCustomers]);
  
  // Update customer
  const updateCustomer = useCallback((
    id: string,
    updates: Partial<Customer>
  ): { success: boolean; errors?: string[] } => {
    try {
      // Check for duplicate if name or phone is being updated
      if (updates.name || updates.phone) {
        const existing = customers.find(c => 
          c.id !== id && (
            (updates.name && c.name.toLowerCase() === updates.name.toLowerCase()) ||
            (updates.phone && c.phone === updates.phone)
          )
        );
        
        if (existing) {
          return { 
            success: false, 
            errors: ['Another customer with this name or phone already exists'] 
          };
        }
      }
      
      const updatedCustomersList = customers.map(customer => {
        if (customer.id === id) {
          return {
            ...customer,
            ...updates,
            updatedAt: new Date()
          };
        }
        return customer;
      });
      
      // Fire and forget
      updateCustomers(updatedCustomersList).catch(console.error);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating customer:', error);
      return { success: false, errors: ['Failed to update customer'] };
    }
  }, [customers, updateCustomers]);
  
  // Delete customer
  const deleteCustomer = useCallback((id: string): { success: boolean; error?: string } => {
    try {
      const customer = customers.find(c => c.id === id);
      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }
      
      // Check if customer has transactions
      const hasTransactions = ledgerEntries.some(l => l.customerId === id);
      if (hasTransactions) {
        return { success: false, error: 'Cannot delete customer with transaction history' };
      }
      
      const updatedCustomersList = customers.filter(c => c.id !== id);
      
      // Fire and forget
      updateCustomers(updatedCustomersList).catch(console.error);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting customer:', error);
      return { success: false, error: 'Failed to delete customer' };
    }
  }, [customers, ledgerEntries, updateCustomers]);
  
  // Add ledger entry
  const addLedgerEntry = useCallback((
    customerId: string,
    transactionType: 'sale' | 'payment' | 'credit_note' | 'opening_balance' | 'adjustment',
    description: string,
    debit: number,
    credit: number,
    referenceId?: string,
    referenceNumber?: string,
    date: Date = new Date(),
    notes?: string
  ): { success: boolean; error?: string } => {
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }
      
      // Get all existing entries for this customer to find the previous balance
      const customerEntries = ledgerEntries.filter(e => e.customerId === customerId);
      
      // Sort entries by date and creation time to find the most recent one
      const sortedEntries = customerEntries.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateB - dateA; // Most recent first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      // Calculate running balance
      // Balance is negative when customer owes money, positive when they have credit
      // Debit increases what they owe (makes balance more negative)
      // Credit reduces what they owe (makes balance more positive)
      // Use the running balance from the most recent entry, or 0 if no entries exist
      const prevBalance = sortedEntries.length > 0 ? sortedEntries[0].runningBalance : 0;
      const runningBalance = prevBalance - debit + credit;
      
      const now = new Date();
      const newEntry: LedgerEntry = {
        id: generateId(),
        customerId,
        customerName: customer.name,
        date,
        transactionType,
        referenceId,
        referenceNumber,
        description,
        debit,
        credit,
        runningBalance,
        notes,
        createdAt: now,
        updatedAt: now
      };
      
      // Update customer balance
      const updatedCustomersList = customers.map(c => {
        if (c.id === customerId) {
          return {
            ...c,
            balance: runningBalance,
            updatedAt: now
          };
        }
        return c;
      });
      
      // Fire and forget
      updateLedgerEntries([...ledgerEntries, newEntry]).catch(console.error);
      updateCustomers(updatedCustomersList).catch(console.error);
      
      return { success: true };
    } catch (error) {
      console.error('Error adding ledger entry:', error);
      return { success: false, error: 'Failed to add ledger entry' };
    }
  }, [customers, ledgerEntries, updateCustomers, updateLedgerEntries]);
  
  // Delete ledger entry
  const deleteLedgerEntry = useCallback((id: string): { success: boolean; error?: string } => {
    try {
      const entry = ledgerEntries.find(l => l.id === id);
      if (!entry) {
        return { success: false, error: 'Ledger entry not found' };
      }
      
      // Don't allow deletion of sale-related entries
      if (entry.referenceId) {
        return { success: false, error: 'Cannot delete entries with references' };
      }
      
      // Recalculate customer balance
      const customer = customers.find(c => c.id === entry.customerId);
      if (customer) {
        // Reverse the balance change
        // When deleting, we need to undo the effect: add back debit, subtract credit
        const balanceAdjustment = entry.debit - entry.credit;
        const newBalance = (customer.balance || 0) + balanceAdjustment;
        
        const updatedCustomersList = customers.map(c => {
          if (c.id === entry.customerId) {
            return {
              ...c,
              balance: newBalance,
              updatedAt: new Date()
            };
          }
          return c;
        });
        
        updateCustomers(updatedCustomersList).catch(console.error);
      }
      
      const updatedLedgerList = ledgerEntries.filter(l => l.id !== id);
      
      // Fire and forget
      updateLedgerEntries(updatedLedgerList).catch(console.error);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting ledger entry:', error);
      return { success: false, error: 'Failed to delete ledger entry' };
    }
  }, [customers, ledgerEntries, updateCustomers, updateLedgerEntries]);
  
  // Get customer by ID
  const getCustomerById = useCallback((id: string): Customer | undefined => {
    return customers.find(c => c.id === id);
  }, [customers]);
  
  // Get ledger entries for customer
  const getCustomerLedger = useCallback((customerId: string): LedgerEntry[] => {
    return ledgerEntries.filter(l => l.customerId === customerId);
  }, [ledgerEntries]);
  
  // Get statistics
  const getStatistics = useCallback(() => {
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => (c.balance || 0) > 0).length;
    const totalBalance = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
    const totalPositiveBalance = customers.reduce((sum, c) => Math.max(0, c.balance || 0) + sum, 0);
    const totalNegativeBalance = customers.reduce((sum, c) => Math.min(0, c.balance || 0) + sum, 0);
    const customersWithDebt = customers.filter(c => (c.balance || 0) > 0).length;
    
    return {
      totalCustomers,
      activeCustomers,
      totalBalance,
      totalPositiveBalance,
      totalNegativeBalance,
      customersWithDebt
    };
  }, [customers]);

  // Recalculate all running balances (to fix existing incorrect entries)
  const recalculateAllBalances = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('Starting balance recalculation for all customers...');
      
      // Group entries by customer
      const customerGroups = new Map<string, LedgerEntry[]>();
      ledgerEntries.forEach(entry => {
        if (!customerGroups.has(entry.customerId)) {
          customerGroups.set(entry.customerId, []);
        }
        customerGroups.get(entry.customerId)!.push(entry);
      });

      // Process each customer
      const updatedEntries: LedgerEntry[] = [];
      const updatedCustomersList: Customer[] = [...customers];

      customerGroups.forEach((entries, customerId) => {
        // Sort entries by date and creation time
        const sortedEntries = [...entries].sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA !== dateB) return dateA - dateB;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

        // Recalculate running balance for each entry
        let runningBalance = 0;
        sortedEntries.forEach(entry => {
          // Apply the transaction to the running balance
          runningBalance = runningBalance - entry.debit + entry.credit;
          
          // Update the entry with correct balance
          updatedEntries.push({
            ...entry,
            runningBalance,
            updatedAt: new Date()
          });
        });

        // Update the customer's final balance
        const customerIndex = updatedCustomersList.findIndex(c => c.id === customerId);
        if (customerIndex !== -1) {
          updatedCustomersList[customerIndex] = {
            ...updatedCustomersList[customerIndex],
            balance: runningBalance,
            updatedAt: new Date()
          };
        }
      });

      // Save the corrected data
      await Promise.all([
        updateLedgerEntries(updatedEntries),
        updateCustomers(updatedCustomersList)
      ]);

      console.log(`Successfully recalculated balances for ${customerGroups.size} customers`);
      return { success: true };
    } catch (error) {
      console.error('Error recalculating balances:', error);
      return { success: false, error: 'Failed to recalculate balances' };
    }
  }, [ledgerEntries, customers, updateLedgerEntries, updateCustomers]);
  
  return {
    // Data
    customers,
    ledgerEntries,
    
    // Status
    loading,
    error,
    isOnline,
    syncInProgress: isSyncing,
    pendingChanges: offlineQueueSize,
    lastSyncError: error,
    
    // Customer operations
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    getStatistics,
    
    // Ledger operations
    addLedgerEntry,
    deleteLedgerEntry,
    getCustomerLedger,
    recalculateAllBalances,
    
    // Sync operations
    forceSync,
    refreshData: refresh
  };
};