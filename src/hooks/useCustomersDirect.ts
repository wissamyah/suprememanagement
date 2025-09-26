// Direct GitHub customers hook - no localStorage dependency
import { useCallback } from 'react';
import { useGitHubData } from './useGitHubData';
import type { Customer, LedgerEntry } from '../types';
import { generateId } from '../utils/storage';
import { githubDataManager } from '../services/githubDataManager';

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
  const addLedgerEntry = useCallback(async (
    customerId: string,
    transactionType: 'sale' | 'payment' | 'credit_note' | 'opening_balance' | 'adjustment',
    description: string,
    debit: number,
    credit: number,
    referenceId?: string,
    referenceNumber?: string,
    date: Date = new Date(),
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
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
        date,
        transactionType,
        referenceId,
        referenceNumber,
        description,
        debit,
        credit,
        runningBalance: 0, // Will be calculated below
        notes,
        createdAt: now,
        updatedAt: now
      };

      // Get all entries for this customer including the new one
      const allCustomerEntries = [
        ...ledgerEntries.filter(e => e.customerId === customerId),
        newEntry
      ];

      // Sort all entries chronologically (oldest first)
      allCustomerEntries.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      // Recalculate running balances for all entries
      let runningBalance = 0;
      const recalculatedEntries = allCustomerEntries.map(entry => {
        runningBalance = runningBalance - entry.debit + entry.credit;
        return {
          ...entry,
          runningBalance,
          updatedAt: entry.id === newEntry.id ? now : entry.updatedAt
        };
      });

      // Update all ledger entries (replacing the customer's entries with recalculated ones)
      const otherEntries = ledgerEntries.filter(e => e.customerId !== customerId);
      const finalLedgerList = [...otherEntries, ...recalculatedEntries];

      // Update customer balance (should be the last entry's running balance)
      const lastEntry = recalculatedEntries[recalculatedEntries.length - 1];
      const customerBalance = lastEntry ? lastEntry.runningBalance : 0;

      const updatedCustomersList = customers.map(c => {
        if (c.id === customerId) {
          return {
            ...c,
            balance: customerBalance,
            updatedAt: now
          };
        }
        return c;
      });

      // Start batch update to avoid conflicts
      githubDataManager.startBatchUpdate();

      // Await all updates to ensure data is persisted before returning
      await Promise.all([
        updateLedgerEntries(finalLedgerList),
        updateCustomers(updatedCustomersList)
      ]);

      // End batch and save once
      await githubDataManager.endBatchUpdate();

      return { success: true };
    } catch (error) {
      console.error('Error adding ledger entry:', error);
      return { success: false, error: 'Failed to add ledger entry' };
    }
  }, [customers, ledgerEntries, updateCustomers, updateLedgerEntries]);
  
  // Delete ledger entry
  const deleteLedgerEntry = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const entry = ledgerEntries.find(l => l.id === id);
      if (!entry) {
        return { success: false, error: 'Ledger entry not found' };
      }

      // Don't allow deletion of sale-related entries
      if (entry.referenceId) {
        return { success: false, error: 'Cannot delete entries with references' };
      }


      // Remove the entry from the list
      const remainingEntries = ledgerEntries.filter(l => l.id !== id);

      // Get all entries for this customer (from the remaining entries)
      const customerEntries = remainingEntries.filter(e => e.customerId === entry.customerId);

      // Sort entries by date and creation time (oldest first)
      const sortedEntries = [...customerEntries].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      // Recalculate running balances for this customer's entries
      let runningBalance = 0;
      const updatedCustomerEntries = sortedEntries.map(entry => {
        // Balance is negative when customer owes money, positive when they have credit
        // Debit increases what they owe (makes balance more negative)
        // Credit reduces what they owe (makes balance more positive)
        runningBalance = runningBalance - entry.debit + entry.credit;
        return {
          ...entry,
          runningBalance,
          updatedAt: new Date()
        };
      });

      // Merge the updated customer entries back with other entries
      const finalLedgerList = remainingEntries.map(e => {
        if (e.customerId === entry.customerId) {
          const updated = updatedCustomerEntries.find(ue => ue.id === e.id);
          return updated || e;
        }
        return e;
      });

      // Update customer's current balance
      let updatedCustomersList = customers;
      const customer = customers.find(c => c.id === entry.customerId);
      if (customer) {
        // The customer's balance should be the running balance of their last entry
        // or 0 if they have no entries left
        const lastEntry = updatedCustomerEntries[updatedCustomerEntries.length - 1];
        const newBalance = lastEntry ? lastEntry.runningBalance : 0;

        updatedCustomersList = customers.map(c => {
          if (c.id === entry.customerId) {
            return {
              ...c,
              balance: newBalance,
              updatedAt: new Date()
            };
          }
          return c;
        });
      }

      // Start batch update to avoid conflicts
      githubDataManager.startBatchUpdate();

      // Await all updates to ensure data is persisted before returning
      await Promise.all([
        updateCustomers(updatedCustomersList),
        updateLedgerEntries(finalLedgerList)
      ]);

      // End batch and save once
      await githubDataManager.endBatchUpdate();

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
      // Starting balance recalculation for all customers
      
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

      // Successfully recalculated balances
      return { success: true };
    } catch (error) {
      console.error('Error recalculating balances:', error);
      return { success: false, error: 'Failed to recalculate balances' };
    }
  }, [ledgerEntries, customers, updateLedgerEntries, updateCustomers]);
  
  // Import customers with full data preservation
  const importCustomers = useCallback(async (
    importedCustomers: Customer[],
    options: {
      mode: 'merge' | 'replace' | 'add-new';
      preserveExisting?: boolean;
    } = { mode: 'merge' }
  ): Promise<{ success: boolean; imported: number; updated: number; skipped: number; errors?: string[] }> => {
    try {
      let newCustomersList: Customer[] = [];
      let imported = 0;
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];

      if (options.mode === 'replace') {
        // Replace all existing customers with imported ones
        newCustomersList = importedCustomers;
        imported = importedCustomers.length;
      } else if (options.mode === 'add-new') {
        // Only add customers that don't exist (by ID)
        const existingIds = new Set(customers.map(c => c.id));
        newCustomersList = [...customers];

        for (const customer of importedCustomers) {
          if (!existingIds.has(customer.id)) {
            newCustomersList.push(customer);
            imported++;
          } else {
            skipped++;
          }
        }
      } else {
        // Merge mode: Update existing, add new
        const customerMap = new Map(customers.map(c => [c.id, c]));

        for (const importedCustomer of importedCustomers) {
          const existing = customerMap.get(importedCustomer.id);

          if (existing) {
            // Update existing customer, preserving ID and merging data
            if (options.preserveExisting) {
              // Keep existing data, only update if imported has newer updatedAt
              if (new Date(importedCustomer.updatedAt) > new Date(existing.updatedAt)) {
                customerMap.set(importedCustomer.id, importedCustomer);
                updated++;
              } else {
                skipped++;
              }
            } else {
              // Overwrite with imported data
              customerMap.set(importedCustomer.id, importedCustomer);
              updated++;
            }
          } else {
            // Add new customer
            customerMap.set(importedCustomer.id, importedCustomer);
            imported++;
          }
        }

        newCustomersList = Array.from(customerMap.values());
      }

      // Save the updated customer list
      await updateCustomers(newCustomersList);

      return {
        success: true,
        imported,
        updated,
        skipped,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('Error importing customers:', error);
      return {
        success: false,
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: ['Failed to import customers: ' + (error instanceof Error ? error.message : 'Unknown error')]
      };
    }
  }, [customers, updateCustomers]);

  // Import related data (ledger entries, etc.)
  const importRelatedData = useCallback(async (
    relatedData: {
      ledgerEntries?: LedgerEntry[];
    }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (relatedData.ledgerEntries) {
        // Merge ledger entries (avoid duplicates by ID)
        const existingIds = new Set(ledgerEntries.map(e => e.id));
        const newEntries = relatedData.ledgerEntries.filter(e => !existingIds.has(e.id));
        const mergedEntries = [...ledgerEntries, ...newEntries];

        // Sort by date and recalculate balances
        mergedEntries.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA !== dateB) return dateA - dateB;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

        await updateLedgerEntries(mergedEntries);
      }

      return { success: true };
    } catch (error) {
      console.error('Error importing related data:', error);
      return {
        success: false,
        error: 'Failed to import related data: ' + (error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }, [ledgerEntries, updateLedgerEntries]);

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
    importCustomers,
    importRelatedData,

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