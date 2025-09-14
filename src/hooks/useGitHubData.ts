// Base hook for GitHub-direct data access
// This replaces localStorage-based hooks with GitHub as the primary store

import { useState, useEffect, useCallback, useRef } from 'react';
import { githubDataManager } from '../services/githubDataManager';
import { useDataContext } from '../contexts/DataContext';

// Define the data types available
type DataType = 'products' | 'categories' | 'movements' | 'productionEntries' | 
                'customers' | 'sales' | 'ledgerEntries' | 'bookedStock' | 'loadings' | 'suppliers' | 'paddyTrucks';

interface UseGitHubDataOptions {
  dataType: DataType;
  immediate?: boolean; // Whether to save immediately or debounce
}

export function useGitHubData<T>(options: UseGitHubDataOptions) {
  const { dataType, immediate = false } = options;

  // Try to use context if available
  let contextData: T[] | null = null;
  let contextIsOnline: boolean | null = null;
  let contextRefreshKey: number | null = null;

  try {
    const context = useDataContext();
    contextData = context.data[dataType] as T[];
    contextIsOnline = context.isOnline;
    contextRefreshKey = context.refreshKey;
  } catch {
    // Context not available, fall back to direct subscription
  }

  const [localData, setLocalData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localIsOnline, setLocalIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineQueueSize, setOfflineQueueSize] = useState(0);

  // Use context data if available, otherwise use local state
  const data = contextData !== null ? contextData : localData;
  const isOnline = contextIsOnline !== null ? contextIsOnline : localIsOnline;

  const mountedRef = useRef(true);
  const unsubscribeDataRef = useRef<(() => void) | null>(null);
  const unsubscribeConnectionRef = useRef<(() => void) | null>(null);
  
  // Initialize and subscribe to data changes (only if context is not available)
  useEffect(() => {
    mountedRef.current = true;

    // If using context, we get updates through context refresh key
    if (contextData !== null) {
      setLoading(false);
      return () => {
        mountedRef.current = false;
      };
    }

    // Only subscribe directly if not using context
    unsubscribeDataRef.current = githubDataManager.subscribeToData((allData) => {
      if (mountedRef.current) {
        setLocalData(allData[dataType] as T[]);
        setLoading(false);
      }
    });

    // Subscribe to connection status
    unsubscribeConnectionRef.current = githubDataManager.subscribeToConnection((online) => {
      if (mountedRef.current) {
        setLocalIsOnline(online);
        setOfflineQueueSize(githubDataManager.getOfflineQueueSize());
      }
    });

    // Initial load
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const currentData = githubDataManager.getData(dataType);
        setLocalData(currentData as T[]);
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
  }, [dataType, contextData, contextRefreshKey]); // Include contextRefreshKey to force updates
  
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