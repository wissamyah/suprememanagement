import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
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
import { githubDataManager } from './services/githubDataManager';

// Context for GitHub storage
interface GitHubContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSync: string | null;
  pendingChanges?: number;
  pendingDetails?: any;
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
  const [pendingDetails, setPendingDetails] = useState<any>({});
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
        setPendingDetails(syncState.pendingDetails || {});
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
    
    // Cleanup on unmount
    return () => {
      githubDataManager.destroy();
    };
  }, []);

  const checkAuth = async () => {
    if (!mountedRef.current) return;
    setIsLoading(true);
    try {
      const authenticated = await githubStorage.checkAuthentication();
      if (mountedRef.current) {
        setIsAuthenticated(authenticated);
        
        if (authenticated) {
          // Always initialize GitHub data manager (direct mode only)
          const token = sessionStorage.getItem('gh_token');
          if (token) {
            const decryptedToken = await githubStorage.decryptToken(token);
            if (decryptedToken) {
              await githubDataManager.initialize(decryptedToken);
              console.log('[App] GitHub Direct mode initialized');
            }
          }
        }
        
        if (!authenticated) {
          // Show auth modal immediately without delay
          setShowAuthModal(true);
          setIsLoading(false); // Stop loading immediately if not authenticated
        } else {
          // Set loading to false first to show the UI
          setIsLoading(false);
          // Data is loaded automatically by githubDataManager
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      if (mountedRef.current) {
        setShowAuthModal(true);
        setIsLoading(false);
      }
    }
  };

  const loadDataFromGitHub = async () => {
    if (!mountedRef.current) return;
    
    try {
      setSyncStatus('syncing');
      await githubStorage.loadAllData();
      
      // In GitHub Direct mode, data is loaded directly into githubDataManager
      // No need to update localStorage anymore
      
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
      setPendingDetails({});
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
    pendingDetails,
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
      <HashRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="customers" element={<CustomerList />} />
            <Route path="customers/sales" element={<Sales />} />
            <Route path="customers/loadings" element={<Loadings />} />
            <Route path="customers/ledger" element={<CustomerLedger />} />
            <Route path="customers/ledger/:customerId" element={<CustomerLedger />} />
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
      </HashRouter>
    </GitHubContext.Provider>
  );
}

export default App;