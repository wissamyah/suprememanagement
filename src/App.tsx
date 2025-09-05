import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { CustomerList } from './pages/customers/CustomerList';
import { Sales } from './pages/customers/Sales';
import { Loadings } from './pages/customers/Loadings';
import { CustomerLedger } from './pages/customers/CustomerLedger';
import { SupplierList } from './pages/suppliers/SupplierList';
import { PaddyTrucks } from './pages/suppliers/PaddyTrucks';
import { SupplierLedger } from './pages/suppliers/SupplierLedger';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import GitHubAuthModal from './components/GitHubAuthModal';
import githubStorage from './services/githubStorage';
import { globalSyncManager } from './services/globalSyncManager';

// Context for GitHub storage
interface GitHubContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSync: string | null;
  pendingChanges?: number;
  syncError?: string | null;
  syncInProgress?: boolean;
  syncData: () => Promise<void>;
  logout: () => void;
}

export const GitHubContext = React.createContext<GitHubContextType>({
  isAuthenticated: false,
  isLoading: true,
  syncStatus: 'idle',
  lastSync: null,
  syncData: async () => {},
  logout: () => {}
});

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<number>(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    // Subscribe to global sync state
    const unsubscribe = globalSyncManager.subscribe((syncState) => {
      if (mountedRef.current) {
        setPendingChanges(syncState.pendingChanges);
        setSyncError(syncState.error);
        setSyncInProgress(syncState.isInProgress);
        
        // Update sync status based on state
        if (syncState.isInProgress) {
          setSyncStatus('syncing');
        } else if (syncState.error) {
          setSyncStatus('error');
        } else if (syncState.lastSync && Date.now() - syncState.lastSync.getTime() < 3000) {
          setSyncStatus('success');
          setTimeout(() => {
            if (mountedRef.current) setSyncStatus('idle');
          }, 3000);
        }
        
        if (syncState.lastSync) {
          setLastSync(syncState.lastSync.toISOString());
        }
      }
    });
    
    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
    
    // Cleanup global sync on unmount
    return () => {
      globalSyncManager.destroy();
    };
  }, []);

  const checkAuth = async () => {
    if (!mountedRef.current) return;
    setIsLoading(true);
    try {
      const authenticated = await githubStorage.checkAuthentication();
      if (mountedRef.current) {
        setIsAuthenticated(authenticated);
        // Initialize global sync manager
        globalSyncManager.initialize(authenticated);
        
        if (!authenticated) {
          // Show auth modal immediately without delay
          setShowAuthModal(true);
        } else {
          // Load initial data from GitHub
          await loadDataFromGitHub();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      if (mountedRef.current) {
        setShowAuthModal(true);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const loadDataFromGitHub = async () => {
    if (!mountedRef.current) return;
    
    try {
      setSyncStatus('syncing');
      const allData = await githubStorage.loadAllData();
      
      // Update local storage with all data types
      if (allData.products) localStorage.setItem('products', JSON.stringify(allData.products));
      if (allData.categories) localStorage.setItem('product_categories', JSON.stringify(allData.categories));
      if (allData.movements) localStorage.setItem('inventory_movements', JSON.stringify(allData.movements));
      if (allData.productionEntries) localStorage.setItem('production_entries', JSON.stringify(allData.productionEntries));
      
      if (mountedRef.current) {
        setLastSync(new Date().toISOString());
        setSyncStatus('success');
        
        // Reset status after 3 seconds
        setTimeout(() => {
          if (mountedRef.current) setSyncStatus('idle');
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to load data from GitHub:', error);
      if (mountedRef.current) {
        setSyncStatus('error');
        setSyncError(error instanceof Error ? error.message : 'Failed to load data');
        setTimeout(() => {
          if (mountedRef.current) setSyncStatus('idle');
        }, 5000);
      }
    }
  };

  const syncData = async () => {
    if (!isAuthenticated || !mountedRef.current) {
      if (mountedRef.current) setShowAuthModal(true);
      return;
    }

    // Use global sync manager for syncing
    const success = await globalSyncManager.forceSync();
    
    if (!success && mountedRef.current) {
      setSyncStatus('error');
      setTimeout(() => {
        if (mountedRef.current) setSyncStatus('idle');
      }, 5000);
    }
  };

  const handleAuthSuccess = async () => {
    if (mountedRef.current) {
      setIsAuthenticated(true);
      // Initialize global sync manager on successful auth
      globalSyncManager.initialize(true);
      setShowAuthModal(false);
      await loadDataFromGitHub();
    }
  };

  const handleLogout = () => {
    githubStorage.clearAuthentication();
    // Destroy global sync manager on logout
    globalSyncManager.destroy();
    if (mountedRef.current) {
      setIsAuthenticated(false);
      setLastSync(null);
      setSyncStatus('idle');
      setSyncError(null);
      setPendingChanges(0);
      // Immediately show the auth modal after logout
      setShowAuthModal(true);
    }
  };

  const contextValue = {
    isAuthenticated,
    isLoading,
    syncStatus,
    lastSync,
    pendingChanges,
    syncError,
    syncInProgress,
    syncData,
    logout: handleLogout
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <GitHubContext.Provider value={contextValue}>
      <BrowserRouter basename="/suprememanagement">
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="customers" element={<CustomerList />} />
            <Route path="customers/sales" element={<Sales />} />
            <Route path="customers/loadings" element={<Loadings />} />
            <Route path="customers/ledger" element={<CustomerLedger />} />
            <Route path="suppliers" element={<SupplierList />} />
            <Route path="suppliers/paddy-trucks" element={<PaddyTrucks />} />
            <Route path="suppliers/ledger" element={<SupplierLedger />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
        
        <GitHubAuthModal
          isOpen={showAuthModal}
          onSuccess={handleAuthSuccess}
          onClose={() => setShowAuthModal(false)}
        />
      </BrowserRouter>
    </GitHubContext.Provider>
  );
}

export default App;