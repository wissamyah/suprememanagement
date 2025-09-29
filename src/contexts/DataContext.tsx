import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { githubDataManager } from '../services/githubDataManager';
import { useCustomers } from '../hooks/useCustomers';

interface DataState {
  products: any[];
  categories: any[];
  movements: any[];
  productionEntries: any[];
  customers: any[];
  sales: any[];
  ledgerEntries: any[];
  bookedStock: any[];
  loadings: any[];
  suppliers: any[];
  paddyTrucks: any[];
}

interface DataContextType {
  data: DataState;
  isOnline: boolean;
  refreshKey: number;
  triggerRefresh: () => void;
  // Customer operations from useCustomers hook
  customersHook: ReturnType<typeof useCustomers>;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize useCustomers hook once at the provider level
  const customersHook = useCustomers();

  const [data, setData] = useState<DataState>({
    products: [],
    categories: [],
    movements: [],
    productionEntries: [],
    customers: [],
    sales: [],
    ledgerEntries: [],
    bookedStock: [],
    loadings: [],
    suppliers: [],
    paddyTrucks: []
  });

  const [isOnline, setIsOnline] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Subscribe to data changes from githubDataManager
    const unsubscribeData = githubDataManager.subscribeToData((newData) => {
      if (!mountedRef.current) return;

      // Use functional update to ensure React processes the state change correctly
      setData(() => {
        // Force a new object reference
        return { ...newData };
      });

      // Use functional update for refresh key
      setRefreshKey(prev => prev + 1);
    });

    // Subscribe to connection status
    const unsubscribeConnection = githubDataManager.subscribeToConnection((online) => {
      if (mountedRef.current) {
        setIsOnline(online);
      }
    });

    // Load initial data
    const loadInitialData = async () => {
      try {
        // Get current data from the manager
        const currentData = {
          products: githubDataManager.getData('products'),
          categories: githubDataManager.getData('categories'),
          movements: githubDataManager.getData('movements'),
          productionEntries: githubDataManager.getData('productionEntries'),
          customers: githubDataManager.getData('customers'),
          sales: githubDataManager.getData('sales'),
          ledgerEntries: githubDataManager.getData('ledgerEntries'),
          bookedStock: githubDataManager.getData('bookedStock'),
          loadings: githubDataManager.getData('loadings'),
          suppliers: githubDataManager.getData('suppliers'),
          paddyTrucks: githubDataManager.getData('paddyTrucks')
        };
        setData(currentData);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();

    return () => {
      mountedRef.current = false;
      unsubscribeData();
      unsubscribeConnection();
    };
  }, []);

  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Note: Removed data override to prevent race conditions with batch updates
  // The githubDataManager subscription handles all data updates consistently

  return (
    <DataContext.Provider value={{ data, isOnline, refreshKey, triggerRefresh, customersHook }}>
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};