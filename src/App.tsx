import React, { useState, useEffect } from 'react';
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
import GitHubAuthModal from './components/GitHubAuthModal';
import githubStorage from './services/githubStorage';

// Context for GitHub storage
interface GitHubContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSync: string | null;
  pendingChanges?: number;
  syncError?: string | null;
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
  const [pendingChanges, _setPendingChanges] = useState<number>(0);
  const [syncError, _setSyncError] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const authenticated = await githubStorage.checkAuthentication();
      setIsAuthenticated(authenticated);
      
      if (!authenticated) {
        // Show auth modal after a short delay for better UX
        setTimeout(() => setShowAuthModal(true), 500);
      } else {
        // Load initial data from GitHub
        await loadDataFromGitHub();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setShowAuthModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDataFromGitHub = async () => {
    try {
      setSyncStatus('syncing');
      const inventory = await githubStorage.loadInventory();
      
      // Update local state/storage
      localStorage.setItem('inventory', JSON.stringify(inventory));
      setLastSync(new Date().toISOString());
      setSyncStatus('success');
      
      // Reset status after 3 seconds
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to load data from GitHub:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  const syncData = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    try {
      setSyncStatus('syncing');
      
      // Get current inventory from localStorage
      const localInventory = localStorage.getItem('inventory');
      const inventory = localInventory ? JSON.parse(localInventory) : [];
      
      // Save to GitHub
      await githubStorage.saveInventory(inventory);
      
      setLastSync(new Date().toISOString());
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  const handleAuthSuccess = async () => {
    setIsAuthenticated(true);
    setShowAuthModal(false);
    await loadDataFromGitHub();
  };

  const handleLogout = () => {
    githubStorage.clearAuthentication();
    setIsAuthenticated(false);
    setLastSync(null);
    setSyncStatus('idle');
    // Optionally clear local data or keep it as offline backup
  };

  const contextValue = {
    isAuthenticated,
    isLoading,
    syncStatus,
    lastSync,
    pendingChanges,
    syncError,
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