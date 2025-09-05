import React, { useContext, useEffect } from 'react';
import { GitHubContext } from '../App';
import { useInventoryWithGitHub } from '../hooks/useInventoryWithGitHub';

interface InventoryProviderProps {
  children: React.ReactNode;
}

export const InventoryContext = React.createContext<ReturnType<typeof useInventoryWithGitHub> | null>(null);

export const InventoryProvider: React.FC<InventoryProviderProps> = ({ children }) => {
  const inventory = useInventoryWithGitHub();
  const githubContext = useContext(GitHubContext);
  
  // Update GitHub context with pending changes
  useEffect(() => {
    if (githubContext && 'setPendingChanges' in githubContext) {
      (githubContext as any).setPendingChanges?.(inventory.pendingChanges);
    }
  }, [inventory.pendingChanges]);

  // Update GitHub context with sync error
  useEffect(() => {
    if (githubContext && 'setSyncError' in githubContext) {
      (githubContext as any).setSyncError?.(inventory.lastSyncError);
    }
  }, [inventory.lastSyncError]);

  return (
    <InventoryContext.Provider value={inventory}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within InventoryProvider');
  }
  return context;
};