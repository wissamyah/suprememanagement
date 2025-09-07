// Global Sync Manager - Handles syncing across all pages
import githubStorage from './githubStorage';
import { SYNC_CONFIG } from '../config/app.config';

interface SyncState {
  isPending: boolean;
  isInProgress: boolean;
  lastSync: Date | null;
  error: string | null;
  pendingChanges: number;
  pendingDetails?: {
    products?: boolean;
    categories?: boolean;
    movements?: boolean;
    productionEntries?: boolean;
    customers?: boolean;
    sales?: boolean;
    ledgerEntries?: boolean;
    bookedStock?: boolean;
    loadings?: boolean;
  };
}

type SyncListener = (state: SyncState) => void;

class GlobalSyncManager {
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private syncInProgress = false;
  private listeners: Set<SyncListener> = new Set();
  private state: SyncState = {
    isPending: false,
    isInProgress: false,
    lastSync: null,
    error: null,
    pendingChanges: 0,
    pendingDetails: {},
  };
  private isAuthenticated = false;
  private lastDataHash = '';
  private lastDataObject: any = null;

  // Initialize the sync manager
  initialize(isAuthenticated: boolean) {
    this.isAuthenticated = isAuthenticated;
    
    if (isAuthenticated) {
      // Listen for storage changes
      window.addEventListener('storage', this.handleStorageChange);
      
      // Listen for visibility changes (tab switching)
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      
      // Load initial hash to establish baseline
      const currentData = this.getAllData();
      this.lastDataHash = JSON.stringify(currentData);
      this.lastDataObject = currentData;
      
      // Start with no pending changes
      this.updateState({ isPending: false, pendingChanges: 0 });
    }
  }

  // Cleanup
  destroy() {
    window.removeEventListener('storage', this.handleStorageChange);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }
  }

  // Reset pending changes - used when clearing all data
  resetPendingChanges() {
    // Clear any pending sync timers
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    
    // Reset state
    this.updateState({ 
      isPending: false, 
      pendingChanges: 0,
      pendingDetails: {},
      error: null 
    });
    
    // Reset the data hash to reflect empty state
    const emptyData = {
      products: [],
      categories: [],
      movements: [],
      productionEntries: [],
      customers: [],
      sales: [],
      ledgerEntries: [],
      bookedStock: [],
      loadings: []
    };
    this.lastDataHash = JSON.stringify(emptyData);
    this.lastDataObject = emptyData;
  }

  // Handle storage changes from any component
  private handleStorageChange = (e: StorageEvent) => {
    // Only care about our data keys
    const dataKeys = ['supreme_mgmt_products', 'supreme_mgmt_product_categories', 
                     'supreme_mgmt_inventory_movements', 'supreme_mgmt_production_entries',
                     'supreme_mgmt_customers', 'supreme_mgmt_sales', 'supreme_mgmt_ledger_entries',
                     'supreme_mgmt_loadings', 'suprememanagement_bookedStock'];
    
    if (e.key && dataKeys.includes(e.key)) {
      this.scheduleSyncDebounced();
    }
  };

  // Handle visibility changes (tab switching)
  private handleVisibilityChange = () => {
    // When the tab becomes hidden (user switches away), sync immediately if there are pending changes
    if (document.hidden && this.state.isPending && !this.syncInProgress) {
      console.log('[GlobalSync] Tab hidden - syncing pending changes immediately');
      
      // Cancel pending timer
      if (this.syncTimer) {
        clearTimeout(this.syncTimer);
        this.syncTimer = null;
      }
      
      // Perform sync immediately
      this.performSync();
    }
  };

  // Check if there are pending changes by comparing with last sync
  private checkForPendingChanges() {
    const currentData = this.getAllData();
    const currentHash = JSON.stringify(currentData);
    
    if (currentHash !== this.lastDataHash) {
      const lastData = this.lastDataObject || currentData;
      const pendingDetails = this.detectChangedDataTypes(lastData, currentData);
      const changeCount = Object.values(pendingDetails).filter(v => v).length;
      
      this.updateState({ 
        isPending: true, 
        pendingChanges: changeCount,
        pendingDetails 
      });
      this.scheduleSyncDebounced();
    } else {
      this.updateState({ isPending: false, pendingChanges: 0, pendingDetails: {} });
    }
  }

  // Detect which data types have changes
  private detectChangedDataTypes(oldData: any, newData: any) {
    const details: any = {};
    
    if (JSON.stringify(oldData.products) !== JSON.stringify(newData.products)) {
      details.products = true;
    }
    if (JSON.stringify(oldData.categories) !== JSON.stringify(newData.categories)) {
      details.categories = true;
    }
    if (JSON.stringify(oldData.movements) !== JSON.stringify(newData.movements)) {
      details.movements = true;
    }
    if (JSON.stringify(oldData.productionEntries) !== JSON.stringify(newData.productionEntries)) {
      details.productionEntries = true;
    }
    if (JSON.stringify(oldData.customers) !== JSON.stringify(newData.customers)) {
      details.customers = true;
    }
    if (JSON.stringify(oldData.sales) !== JSON.stringify(newData.sales)) {
      details.sales = true;
    }
    if (JSON.stringify(oldData.ledgerEntries) !== JSON.stringify(newData.ledgerEntries)) {
      details.ledgerEntries = true;
    }
    if (JSON.stringify(oldData.bookedStock) !== JSON.stringify(newData.bookedStock)) {
      details.bookedStock = true;
    }
    if (JSON.stringify(oldData.loadings) !== JSON.stringify(newData.loadings)) {
      details.loadings = true;
    }
    
    return details;
  }

  // Get all data from localStorage
  private getAllData() {
    try {
      return {
        products: JSON.parse(localStorage.getItem('supreme_mgmt_products') || '[]'),
        categories: JSON.parse(localStorage.getItem('supreme_mgmt_product_categories') || '[]'),
        movements: JSON.parse(localStorage.getItem('supreme_mgmt_inventory_movements') || '[]'),
        productionEntries: JSON.parse(localStorage.getItem('supreme_mgmt_production_entries') || '[]'),
        customers: JSON.parse(localStorage.getItem('supreme_mgmt_customers') || '[]'),
        sales: JSON.parse(localStorage.getItem('supreme_mgmt_sales') || '[]'),
        ledgerEntries: JSON.parse(localStorage.getItem('supreme_mgmt_ledger_entries') || '[]'),
        bookedStock: JSON.parse(localStorage.getItem('suprememanagement_bookedStock') || '[]'),
        loadings: JSON.parse(localStorage.getItem('supreme_mgmt_loadings') || '[]'),
      };
    } catch (error) {
      console.error('Error reading localStorage:', error);
      return { products: [], categories: [], movements: [], productionEntries: [], customers: [], sales: [], ledgerEntries: [], bookedStock: [], loadings: [] };
    }
  }

  // Removed countChanges - no longer needed

  // Schedule sync with debouncing
  private scheduleSyncDebounced() {
    if (!this.isAuthenticated) return;

    // Clear existing timer
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    // Update state to show pending and check what changed
    const currentData = this.getAllData();
    const lastData = this.lastDataObject || currentData;
    const pendingDetails = this.detectChangedDataTypes(lastData, currentData);
    const changeCount = Object.values(pendingDetails).filter(v => v).length;
    
    this.updateState({ 
      isPending: true,
      pendingChanges: changeCount,
      pendingDetails
    });

    // Schedule new sync
    this.syncTimer = setTimeout(() => {
      this.performSync();
    }, SYNC_CONFIG.autoSyncDelay);
  }

  // Perform the actual sync
  private async performSync() {
    if (!this.isAuthenticated || this.syncInProgress) return;

    this.syncInProgress = true;
    this.updateState({ isInProgress: true, error: null });

    try {
      const data = this.getAllData();
      const dataHash = JSON.stringify(data);

      // Only sync if data has changed
      if (dataHash !== this.lastDataHash) {
        console.log('[GlobalSync] Syncing to GitHub...', {
          hasProducts: data.products?.length || 0,
          hasCategories: data.categories?.length || 0,
          hasLedgerEntries: data.ledgerEntries?.length || 0
        });
        await githubStorage.saveAllData(data);
        
        this.lastDataHash = dataHash;
        this.lastDataObject = data;
        this.updateState({
          isPending: false,
          isInProgress: false,
          lastSync: new Date(),
          error: null,
          pendingChanges: 0,
          pendingDetails: {},
        });
        
        console.log('[GlobalSync] Sync completed successfully');
      } else {
        console.log('[GlobalSync] No changes to sync');
        this.updateState({ isPending: false, isInProgress: false, pendingDetails: {} });
      }
    } catch (error: any) {
      console.error('[GlobalSync] Sync failed:', error);
      this.updateState({
        isInProgress: false,
        error: error?.message || 'Sync failed',
      });

      // Retry after delay
      setTimeout(() => {
        if (this.isAuthenticated) {
          this.scheduleSyncDebounced();
        }
      }, SYNC_CONFIG.retryDelay);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Force immediate sync (called by user action)
  async forceSync(): Promise<boolean> {
    if (!this.isAuthenticated) {
      console.warn('[GlobalSync] Cannot sync - not authenticated');
      return false;
    }

    // Cancel pending timer
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }

    // Perform sync immediately
    await this.performSync();
    return !this.state.error;
  }

  // Update state and notify listeners
  private updateState(partial: Partial<SyncState>) {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
  }

  // Notify all listeners of state change
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Subscribe to state changes
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.state);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Get current state
  getState(): SyncState {
    return { ...this.state };
  }

  // Mark data as changed (call this when data changes)
  markAsChanged(immediate: boolean = false) {
    // Check what actually changed
    const currentData = this.getAllData();
    const lastData = this.lastDataObject || currentData;
    const pendingDetails = this.detectChangedDataTypes(lastData, currentData);
    const changeCount = Object.values(pendingDetails).filter(v => v).length;
    
    this.updateState({ 
      isPending: true, 
      pendingChanges: changeCount,
      pendingDetails
    });
    
    if (immediate) {
      // Cancel pending timer and sync immediately
      if (this.syncTimer) {
        clearTimeout(this.syncTimer);
        this.syncTimer = null;
      }
      this.performSync();
    } else {
      this.scheduleSyncDebounced();
    }
  }

  // Update authentication status
  setAuthenticated(isAuthenticated: boolean) {
    this.isAuthenticated = isAuthenticated;
    
    if (isAuthenticated) {
      this.checkForPendingChanges();
    } else {
      // Clear sync state if logged out
      if (this.syncTimer) {
        clearTimeout(this.syncTimer);
      }
      this.updateState({
        isPending: false,
        isInProgress: false,
        error: null,
        pendingChanges: 0,
        pendingDetails: {},
      });
    }
  }
}

// Create singleton instance
export const globalSyncManager = new GlobalSyncManager();

// Export but don't auto-initialize - let App.tsx control initialization