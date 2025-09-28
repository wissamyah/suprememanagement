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
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import GitHubAuthModal from './components/GitHubAuthModal';
import githubStorage from './services/githubStorage';
import { githubDataManager } from './services/githubDataManager';
import { DataProvider } from './contexts/DataContext';

// Context for GitHub storage
interface GitHubContextType {
  isAuthenticated: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSync: string | null;
  syncData: () => Promise<void>;
  logout: () => void;
}

export const GitHubContext = React.createContext<GitHubContextType>({
  isAuthenticated: false,
  syncStatus: 'idle',
  lastSync: null,
  syncData: async () => {},
  logout: () => {}
});

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Check authentication on mount (simplified since initialization already happened)
  useEffect(() => {
    checkAuth();

    // Cleanup on unmount
    return () => {
      githubDataManager.destroy();
    };
  }, []);

  const checkAuth = async () => {
    if (!mountedRef.current) return;
    try {
      const authenticated = await githubStorage.checkAuthentication();
      if (mountedRef.current) {
        setIsAuthenticated(authenticated);

        if (!authenticated) {
          setShowAuthModal(true);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      if (mountedRef.current) {
        setShowAuthModal(true);
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

    // Direct sync with GitHub
    try {
      setSyncStatus('syncing');
      await githubStorage.loadAllData();
      
      if (mountedRef.current) {
        setLastSync(new Date().toISOString());
        setSyncStatus('success');
        setTimeout(() => {
          if (mountedRef.current) setSyncStatus('idle');
        }, 3000);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      if (mountedRef.current) {
        setSyncStatus('error');
        setTimeout(() => {
          if (mountedRef.current) setSyncStatus('idle');
        }, 5000);
      }
    }
  };

  const handleAuthSuccess = async () => {
    if (mountedRef.current) {
      setIsAuthenticated(true);
      setShowAuthModal(false);
      await loadDataFromGitHub();
    }
  };

  const handleLogout = () => {
    githubStorage.clearAuthentication();
    if (mountedRef.current) {
      setIsAuthenticated(false);
      setLastSync(null);
      setSyncStatus('idle');
      // Immediately show the auth modal after logout
      setShowAuthModal(true);
    }
  };

  const contextValue = {
    isAuthenticated,
    syncStatus,
    lastSync,
    syncData,
    logout: handleLogout
  };

  return (
    <GitHubContext.Provider value={contextValue}>
      <DataProvider>
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
      </DataProvider>
    </GitHubContext.Provider>
  );
}

export default App;