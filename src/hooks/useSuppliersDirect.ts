// Direct GitHub suppliers hook - no localStorage dependency
import { useCallback } from 'react';
import { useGitHubData } from './useGitHubData';
import type { Supplier } from '../types';
import { generateId } from '../utils/storage';

export const useSuppliersDirect = () => {
  // Use the base hook for suppliers data
  const {
    data: suppliers = [], // Provide default empty array
    loading,
    error,
    updateData: updateSuppliers,
    isOnline,
    isSyncing,
    offlineQueueSize,
    refresh,
    forceSync
  } = useGitHubData<Supplier>({ dataType: 'suppliers', immediate: true });
  
  // Add supplier
  const addSupplier = useCallback(async (
    name: string,
    phone: string,
    agent: string
  ): Promise<{ success: boolean; supplier?: Supplier; errors?: string[] }> => {
    try {
      // Check for duplicate
      const existing = suppliers.find(s => 
        s.name.toLowerCase() === name.toLowerCase() || 
        s.phone === phone
      );
      
      if (existing) {
        return { 
          success: false, 
          errors: ['Supplier with this name or phone already exists'] 
        };
      }
      
      const now = new Date();
      const newSupplier: Supplier = {
        id: generateId(),
        name,
        phone,
        agent,
        createdAt: now,
        updatedAt: now
      };
      
      // Await update to ensure data is persisted
      await updateSuppliers([...suppliers, newSupplier]);
      
      return { success: true, supplier: newSupplier };
    } catch (error) {
      console.error('Error adding supplier:', error);
      return { success: false, errors: ['Failed to add supplier'] };
    }
  }, [suppliers, updateSuppliers]);
  
  // Update supplier
  const updateSupplier = useCallback(async (
    id: string,
    updates: Partial<Supplier>
  ): Promise<{ success: boolean; errors?: string[] }> => {
    try {
      // Check for duplicate if name or phone is being updated
      if (updates.name || updates.phone) {
        const existing = suppliers.find(s => 
          s.id !== id && (
            (updates.name && s.name.toLowerCase() === updates.name.toLowerCase()) ||
            (updates.phone && s.phone === updates.phone)
          )
        );
        
        if (existing) {
          return { 
            success: false, 
            errors: ['Another supplier with this name or phone already exists'] 
          };
        }
      }
      
      const updatedSuppliersList = suppliers.map(supplier => {
        if (supplier.id === id) {
          return {
            ...supplier,
            ...updates,
            updatedAt: new Date()
          };
        }
        return supplier;
      });

      // Await update to ensure data is persisted
      await updateSuppliers(updatedSuppliersList);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating supplier:', error);
      return { success: false, errors: ['Failed to update supplier'] };
    }
  }, [suppliers, updateSuppliers]);
  
  // Delete supplier
  const deleteSupplier = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const supplier = suppliers.find(s => s.id === id);
      if (!supplier) {
        return { success: false, error: 'Supplier not found' };
      }
      
      const updatedSuppliersList = suppliers.filter(s => s.id !== id);

      // Await update to ensure data is persisted
      await updateSuppliers(updatedSuppliersList);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting supplier:', error);
      return { success: false, error: 'Failed to delete supplier' };
    }
  }, [suppliers, updateSuppliers]);
  
  // Get supplier by ID
  const getSupplierById = useCallback((id: string): Supplier | undefined => {
    return suppliers.find(s => s.id === id);
  }, [suppliers]);
  
  // Get statistics
  const getStatistics = useCallback(() => {
    const totalSuppliers = suppliers.length;
    
    // Group suppliers by agent
    const agentCounts = suppliers.reduce((acc, supplier) => {
      acc[supplier.agent] = (acc[supplier.agent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Find most common agent
    const topAgent = Object.entries(agentCounts).sort(([,a], [,b]) => b - a)[0];
    
    return {
      totalSuppliers,
      uniqueAgents: Object.keys(agentCounts).length,
      topAgent: topAgent ? topAgent[0] : null,
      topAgentCount: topAgent ? topAgent[1] : 0
    };
  }, [suppliers]);
  
  return {
    // Data
    suppliers,
    
    // Status
    loading,
    error,
    isOnline,
    syncInProgress: isSyncing,
    pendingChanges: offlineQueueSize,
    lastSyncError: error,
    
    // Supplier operations
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierById,
    getStatistics,
    
    // Sync operations
    forceSync,
    refreshData: refresh
  };
};