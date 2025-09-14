import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { githubDataManager } from '../services/githubDataManager';

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
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
      if (mountedRef.current) {
        setData(newData);
        // Trigger a refresh key change to force re-renders
        setRefreshKey(prev => prev + 1);
      }
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

  return (
    <DataContext.Provider value={{ data, isOnline, refreshKey, triggerRefresh }}>
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