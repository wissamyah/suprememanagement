// Base hook for GitHub-direct data access
// This replaces localStorage-based hooks with GitHub as the primary store

import { useState, useEffect, useCallback, useRef } from 'react';
import { githubDataManager } from '../services/githubDataManager';

// Define the data types available
type DataType = 'products' | 'categories' | 'movements' | 'productionEntries' | 
                'customers' | 'sales' | 'ledgerEntries' | 'bookedStock' | 'loadings';

interface UseGitHubDataOptions {
  dataType: DataType;
  immediate?: boolean; // Whether to save immediately or debounce
}

export function useGitHubData<T>(options: UseGitHubDataOptions) {
  const { dataType, immediate = false } = options;
  
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineQueueSize, setOfflineQueueSize] = useState(0);
  
  const mountedRef = useRef(true);
  const unsubscribeDataRef = useRef<(() => void) | null>(null);
  const unsubscribeConnectionRef = useRef<(() => void) | null>(null);
  
  // Initialize and subscribe to data changes
  useEffect(() => {
    mountedRef.current = true;
    
    // Subscribe to data changes
    unsubscribeDataRef.current = githubDataManager.subscribeToData((allData) => {
      if (mountedRef.current) {
        setData(allData[dataType] as T[]);
        setLoading(false);
      }
    });
    
    // Subscribe to connection status
    unsubscribeConnectionRef.current = githubDataManager.subscribeToConnection((online) => {
      if (mountedRef.current) {
        setIsOnline(online);
        setOfflineQueueSize(githubDataManager.getOfflineQueueSize());
      }
    });
    
    // Initial load
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const currentData = githubDataManager.getData(dataType);
        setData(currentData as T[]);
      } catch (err) {
        console.error(`Error loading ${String(dataType)}:`, err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };
    
    loadInitialData();
    
    return () => {
      mountedRef.current = false;
      unsubscribeDataRef.current?.();
      unsubscribeConnectionRef.current?.();
    };
  }, [dataType]);
  
  // Update data
  const updateData = useCallback(async (newData: T[]) => {
    try {
      setIsSyncing(true);
      setError(null);
      
      // Optimistic update happens inside githubDataManager
      await githubDataManager.updateData(dataType, newData, immediate);
      
      // Update offline queue size
      setOfflineQueueSize(githubDataManager.getOfflineQueueSize());
    } catch (err) {
      console.error(`Error updating ${String(dataType)}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to update data');
      throw err; // Re-throw for caller to handle
    } finally {
      if (mountedRef.current) {
        setIsSyncing(false);
      }
    }
  }, [dataType, immediate]);
  
  // Force refresh from GitHub
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await githubDataManager.loadAllData(true);
    } catch (err) {
      console.error(`Error refreshing ${String(dataType)}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [dataType]);
  
  // Force sync to GitHub
  const forceSync = useCallback(async () => {
    try {
      setIsSyncing(true);
      setError(null);
      await githubDataManager.forceSync();
      setOfflineQueueSize(0);
    } catch (err) {
      console.error('Error forcing sync:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync');
      throw err;
    } finally {
      if (mountedRef.current) {
        setIsSyncing(false);
      }
    }
  }, []);
  
  // Add item
  const addItem = useCallback(async (item: T) => {
    const newData = [...data, item];
    await updateData(newData);
  }, [data, updateData]);
  
  // Update item
  const updateItem = useCallback(async (id: string, updates: Partial<T>) => {
    const newData = data.map((item: any) =>
      item.id === id ? { ...item, ...updates, updatedAt: new Date() } : item
    );
    await updateData(newData);
  }, [data, updateData]);
  
  // Delete item
  const deleteItem = useCallback(async (id: string) => {
    const newData = data.filter((item: any) => item.id !== id);
    await updateData(newData);
  }, [data, updateData]);
  
  // Find item by ID
  const findById = useCallback((id: string): T | undefined => {
    return data.find((item: any) => item.id === id);
  }, [data]);
  
  // Batch update
  const batchUpdate = useCallback(async (updates: { id: string; changes: Partial<T> }[]) => {
    const updateMap = new Map(updates.map(u => [u.id, u.changes]));
    const newData = data.map((item: any) => {
      const changes = updateMap.get(item.id);
      return changes ? { ...item, ...changes, updatedAt: new Date() } : item;
    });
    await updateData(newData);
  }, [data, updateData]);
  
  return {
    // Data
    data,
    loading,
    error,
    
    // Connection status
    isOnline,
    isSyncing,
    offlineQueueSize,
    
    // Operations
    updateData,
    addItem,
    updateItem,
    deleteItem,
    findById,
    batchUpdate,
    
    // Sync operations
    refresh,
    forceSync
  };
}