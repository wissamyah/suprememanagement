// Direct GitHub paddy trucks hook - no localStorage dependency
import { useCallback } from 'react';
import { useGitHubData } from './useGitHubData';
import type { PaddyTruck } from '../types';
import { generateId } from '../utils/storage';

export const usePaddyTrucksDirect = () => {
  // Use the base hook for paddy trucks data
  const {
    data: paddyTrucks,
    loading,
    error,
    updateData: updatePaddyTrucks,
    isOnline,
    isSyncing,
    offlineQueueSize,
    refresh,
    forceSync
  } = useGitHubData<PaddyTruck>({ dataType: 'paddyTrucks', immediate: true });
  
  // Add paddy truck
  const addPaddyTruck = useCallback(async (
    date: Date,
    supplierId: string,
    supplierName: string,
    truckPlate: string,
    pricePerKg: number,
    agent: string,
    moistureLevel: number,
    waybillNumber?: string,
    netWeight?: number,
    deduction?: number,
    bags?: number
  ): Promise<{ success: boolean; truck?: PaddyTruck; errors?: string[] }> => {
    try {
      // Check for duplicate truck plate on the same date
      const existingTruck = paddyTrucks.find(t => 
        t.truckPlate.toLowerCase() === truckPlate.toLowerCase() &&
        new Date(t.date).toDateString() === new Date(date).toDateString()
      );
      
      if (existingTruck) {
        return { 
          success: false, 
          errors: ['A truck with this plate number already exists for this date'] 
        };
      }
      
      // Calculate weight after deduction
      const weightAfterDeduction = (netWeight || 0) - (deduction || 0);
      
      // Calculate total amount
      const totalAmount = weightAfterDeduction * pricePerKg;
      
      const now = new Date();
      const newTruck: PaddyTruck = {
        id: generateId(),
        date,
        supplierId,
        supplierName,
        waybillNumber,
        truckPlate,
        bags,
        netWeight,
        deduction,
        weightAfterDeduction,
        moistureLevel,
        pricePerKg,
        totalAmount,
        agent: agent.trim() || undefined,
        createdAt: now,
        updatedAt: now
      };

      // Await update to ensure data is persisted
      await updatePaddyTrucks([...paddyTrucks, newTruck]);
      
      return { success: true, truck: newTruck };
    } catch (error) {
      console.error('Error adding paddy truck:', error);
      return { success: false, errors: ['Failed to add paddy truck'] };
    }
  }, [paddyTrucks, updatePaddyTrucks]);
  
  // Update paddy truck
  const updatePaddyTruck = useCallback(async (
    id: string,
    updates: Partial<Omit<PaddyTruck, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<{ success: boolean; errors?: string[] }> => {
    try {
      // Check for duplicate truck plate if updating
      if (updates.truckPlate || updates.date) {
        const truck = paddyTrucks.find(t => t.id === id);
        const checkPlate = updates.truckPlate || truck?.truckPlate;
        const checkDate = updates.date || truck?.date;
        
        const existing = paddyTrucks.find(t => 
          t.id !== id &&
          t.truckPlate.toLowerCase() === checkPlate?.toLowerCase() &&
          new Date(t.date).toDateString() === new Date(checkDate!).toDateString()
        );
        
        if (existing) {
          return { 
            success: false, 
            errors: ['Another truck with this plate number already exists for this date'] 
          };
        }
      }
      
      const updatedTrucksList = paddyTrucks.map(truck => {
        if (truck.id === id) {
          // If weightAfterDeduction and totalAmount are provided in updates, use them
          // Otherwise, recalculate based on the new values
          let weightAfterDeduction = updates.weightAfterDeduction;
          let totalAmount = updates.totalAmount;
          
          // Only recalculate if not provided in updates
          if (weightAfterDeduction === undefined || totalAmount === undefined) {
            const netWeight = updates.netWeight !== undefined ? updates.netWeight : truck.netWeight;
            const deduction = updates.deduction !== undefined ? updates.deduction : truck.deduction;
            const pricePerKg = updates.pricePerKg !== undefined ? updates.pricePerKg : truck.pricePerKg;
            
            weightAfterDeduction = (netWeight || 0) - (deduction || 0);
            totalAmount = weightAfterDeduction * pricePerKg;
          }
          
          return {
            ...truck,
            ...updates,
            // Only override if we calculated new values
            ...(weightAfterDeduction !== undefined ? { weightAfterDeduction } : {}),
            ...(totalAmount !== undefined ? { totalAmount } : {}),
            updatedAt: new Date()
          };
        }
        return truck;
      });

      // Await update to ensure data is persisted
      await updatePaddyTrucks(updatedTrucksList);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating paddy truck:', error);
      return { success: false, errors: ['Failed to update paddy truck'] };
    }
  }, [paddyTrucks, updatePaddyTrucks]);
  
  // Delete paddy truck
  const deletePaddyTruck = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const truck = paddyTrucks.find(t => t.id === id);
      if (!truck) {
        return { success: false, error: 'Paddy truck not found' };
      }
      
      const updatedTrucksList = paddyTrucks.filter(t => t.id !== id);

      // Await update to ensure data is persisted
      await updatePaddyTrucks(updatedTrucksList);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting paddy truck:', error);
      return { success: false, error: 'Failed to delete paddy truck' };
    }
  }, [paddyTrucks, updatePaddyTrucks]);
  
  // Get paddy truck by ID
  const getPaddyTruckById = useCallback((id: string): PaddyTruck | undefined => {
    return paddyTrucks.find(t => t.id === id);
  }, [paddyTrucks]);
  
  // Get statistics
  const getStatistics = useCallback(() => {
    const totalTrucks = paddyTrucks.length;
    const todayTrucks = paddyTrucks.filter(t => 
      new Date(t.date).toDateString() === new Date().toDateString()
    ).length;
    const totalWeight = paddyTrucks.reduce((sum, t) => sum + t.weightAfterDeduction, 0);
    const totalValue = paddyTrucks.reduce((sum, t) => sum + t.totalAmount, 0);
    
    return {
      totalTrucks,
      todayTrucks,
      totalWeight,
      totalValue
    };
  }, [paddyTrucks]);
  
  return {
    // Data
    paddyTrucks,
    
    // Status
    loading,
    error,
    isOnline,
    syncInProgress: isSyncing,
    pendingChanges: offlineQueueSize,
    lastSyncError: error,
    
    // Operations
    addPaddyTruck,
    updatePaddyTruck,
    deletePaddyTruck,
    getPaddyTruckById,
    getStatistics,
    
    // Sync operations
    forceSync,
    refreshData: refresh
  };
};