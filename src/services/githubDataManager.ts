// GitHub Data Manager - Direct GitHub operations with in-memory cache
// This replaces localStorage as the primary data store

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

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
}

interface OfflineOperation {
  id: string;
  type: keyof DataState;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

type DataListener = (data: DataState) => void;
type ConnectionListener = (isOnline: boolean) => void;

class GitHubDataManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private memoryData: DataState = {
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
  
  private offlineQueue: OfflineOperation[] = [];
  private isOnline: boolean = navigator.onLine;
  private dataListeners: Set<DataListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSaves: Set<keyof DataState> = new Set();
  private batchUpdateInProgress: boolean = false;
  private batchUpdateQueue: Array<{ type: keyof DataState; data: any }> = [];
  
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly DEBOUNCE_DELAY = 2000; // 2 seconds
  private owner: string = 'wissamyah';
  private repo: string = 'suprememanagement';
  private path: string = 'data/data.json';
  private branch: string = 'data';
  private token: string | null = null;
  private apiBase: string = 'https://api.github.com';
  
  constructor() {
    // Monitor online/offline status
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Check connection periodically
    setInterval(() => this.checkConnection(), 30000); // Every 30 seconds
  }
  
  // Initialize with GitHub token
  async initialize(token: string): Promise<boolean> {
    this.token = token;
    
    // Verify token and load initial data
    const isValid = await this.verifyToken();
    if (!isValid) {
      throw new Error('Invalid GitHub token');
    }
    
    // Load all data from GitHub
    await this.loadAllData();
    
    return true;
  }
  
  // Verify token with GitHub API
  private async verifyToken(): Promise<boolean> {
    if (!this.token) return false;
    
    try {
      const response = await fetch(`${this.apiBase}/user`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }
  
  // Load all data from GitHub
  async loadAllData(forceRefresh: boolean = false): Promise<DataState> {
    const cacheKey = 'all_data';
    
    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cached = this.getFromCache<DataState>(cacheKey);
      if (cached) {
        this.memoryData = cached;
        this.notifyDataListeners();
        return cached;
      }
    }
    
    try {
      // Fetch from GitHub
      const response = await fetch(
        `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.path}?ref=${this.branch}&t=${Date.now()}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      
      if (response.status === 404) {
        // File doesn't exist, use empty data
        this.memoryData = this.getDefaultData();
      } else if (response.ok) {
        const fileData = await response.json();
        const content = atob(fileData.content);
        const data = JSON.parse(content);
        
        // Store SHA for updates
        this.cache.set('github_sha', {
          data: fileData.sha,
          timestamp: Date.now(),
          ttl: Infinity
        });
        
        // Update memory data
        this.memoryData = {
          products: data.products || [],
          categories: data.categories || [],
          movements: data.movements || [],
          productionEntries: data.productionEntries || [],
          customers: data.customers || [],
          sales: data.sales || [],
          ledgerEntries: data.ledgerEntries || [],
          bookedStock: data.bookedStock || [],
          loadings: data.loadings || []
        };
      } else {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      // Cache the result
      this.setCache(cacheKey, this.memoryData);
      
      // Notify listeners
      this.notifyDataListeners();
      
      return this.memoryData;
    } catch (error) {
      console.error('Error loading data from GitHub:', error);
      
      // If offline, return memory data
      if (!this.isOnline) {
        return this.memoryData;
      }
      
      throw error;
    }
  }
  
  // Get specific data type
  getData<K extends keyof DataState>(type: K): DataState[K] {
    return this.memoryData[type];
  }
  
  // Update specific data type with optimistic updates
  async updateData<K extends keyof DataState>(
    type: K,
    data: DataState[K],
    immediate: boolean = false
  ): Promise<void> {
    // Optimistic update - update memory immediately
    const previousData = this.memoryData[type];
    this.memoryData[type] = data;
    
    // Notify listeners immediately for responsive UI
    this.notifyDataListeners();
    
    // Mark as pending save
    this.pendingSaves.add(type);
    
    try {
      if (this.isOnline) {
        if (immediate) {
          // If we're in a batch update, queue it instead of saving immediately
          if (this.batchUpdateInProgress) {
            this.batchUpdateQueue.push({ type, data });
            return; // Don't save yet, wait for batch to complete
          }
          
          // Save immediately
          await this.saveToGitHub();
        } else {
          // Debounce the save
          this.scheduleDebouncedSave();
        }
      } else {
        // Queue for offline sync
        this.queueOfflineOperation(type, 'update', data);
      }
    } catch (error) {
      // Rollback on failure
      console.error(`Failed to update ${type}:`, error);
      this.memoryData[type] = previousData;
      this.notifyDataListeners();
      throw error;
    }
  }
  
  // Start a batch update - multiple updates will be combined into one save
  startBatchUpdate(): void {
    this.batchUpdateInProgress = true;
    this.batchUpdateQueue = [];
  }
  
  // End batch update and save all changes at once
  async endBatchUpdate(): Promise<void> {
    if (!this.batchUpdateInProgress) return;
    
    this.batchUpdateInProgress = false;
    
    // If we have pending updates, save them now
    if (this.batchUpdateQueue.length > 0 && this.isOnline) {
      try {
        await this.saveToGitHub();
      } catch (error) {
        console.error('Batch update save failed:', error);
        // Don't throw here - the data is already updated optimistically
      }
    }
    
    this.batchUpdateQueue = [];
  }
  
  // Save to GitHub
  private async saveToGitHub(): Promise<void> {
    if (!this.token || !this.isOnline) {
      throw new Error('Cannot save: not authenticated or offline');
    }
    
    // Clear pending saves
    this.pendingSaves.clear();
    
    try {
      // Get current SHA
      let sha = this.getFromCache<string>('github_sha');
      
      // If no cached SHA, fetch it
      if (!sha) {
        await this.loadAllData(true);
        sha = this.getFromCache<string>('github_sha');
      }
      
      // Prepare data
      const fullData = {
        ...this.memoryData,
        metadata: {
          lastUpdated: new Date().toISOString(),
          version: '3.0.0' // New version for GitHub-first architecture
        }
      };
      
      const content = btoa(JSON.stringify(fullData, null, 2));
      
      const body: any = {
        message: `Update data - ${new Date().toISOString()}`,
        content: content,
        branch: this.branch
      };
      
      if (sha) {
        body.sha = sha;
      }
      
      // Save to GitHub
      const response = await fetch(
        `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.path}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );
      
      if (!response.ok) {
        // Handle SHA mismatch by retrying with fresh SHA
        if (response.status === 409) {
          console.log('SHA mismatch detected, merging changes...');
          
          // Store current local changes
          const localData = { ...this.memoryData };
          
          // Load fresh data from GitHub
          await this.loadAllData(true);
          const freshSha = this.getFromCache<string>('github_sha');
          
          // Merge local changes with remote data
          // This is a simple merge strategy - you might want to make this more sophisticated
          this.memoryData = {
            ...this.memoryData, // Start with remote data
            ...localData, // Override with local changes
            // For arrays, we need to be more careful to avoid duplicates
            products: this.mergeArrays(this.memoryData.products, localData.products, 'id'),
            categories: this.mergeArrays(this.memoryData.categories, localData.categories, 'id'),
            movements: this.mergeArrays(this.memoryData.movements, localData.movements, 'id'),
            productionEntries: this.mergeArrays(this.memoryData.productionEntries, localData.productionEntries, 'id'),
            customers: this.mergeArrays(this.memoryData.customers, localData.customers, 'id'),
            sales: this.mergeArrays(this.memoryData.sales, localData.sales, 'id'),
            ledgerEntries: this.mergeArrays(this.memoryData.ledgerEntries, localData.ledgerEntries, 'id'),
            bookedStock: this.mergeArrays(this.memoryData.bookedStock, localData.bookedStock, 'id'),
            loadings: this.mergeArrays(this.memoryData.loadings, localData.loadings, 'id')
          };
          
          // Update the content with merged data
          const mergedData = {
            ...this.memoryData,
            metadata: {
              lastUpdated: new Date().toISOString(),
              version: '3.0.0'
            }
          };
          const mergedContent = btoa(JSON.stringify(mergedData, null, 2));
          
          if (freshSha) {
            const retryBody = {
              message: `Update data (merged) - ${new Date().toISOString()}`,
              content: mergedContent,
              branch: this.branch,
              sha: freshSha
            };
            
            const retryResponse = await fetch(
              `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.path}`,
              {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${this.token}`,
                  'Accept': 'application/vnd.github.v3+json',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(retryBody)
              }
            );
            
            if (!retryResponse.ok) {
              throw new Error(`GitHub save failed after retry: ${retryResponse.status}`);
            }
            
            const result = await retryResponse.json();
            // Update cached SHA
            this.setCache('github_sha', result.content.sha);
            console.log('Data saved to GitHub successfully after merge');
            return;
          }
        }
        
        throw new Error(`GitHub save failed: ${response.status}`);
      }
      
      const result = await response.json();
      // Update cached SHA
      this.setCache('github_sha', result.content.sha);
      
      console.log('Data saved to GitHub successfully');
    } catch (error) {
      console.error('Failed to save to GitHub:', error);
      throw error;
    }
  }
  
  // Schedule debounced save
  private scheduleDebouncedSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    
    this.saveDebounceTimer = setTimeout(() => {
      this.saveToGitHub().catch(error => {
        console.error('Debounced save failed:', error);
      });
    }, this.DEBOUNCE_DELAY);
  }
  
  // Queue offline operation
  private queueOfflineOperation(
    type: keyof DataState,
    operation: 'create' | 'update' | 'delete',
    data: any
  ): void {
    this.offlineQueue.push({
      id: Date.now().toString(),
      type,
      operation,
      data,
      timestamp: Date.now()
    });
    
    console.log(`Queued offline operation: ${operation} ${type}`);
  }
  
  // Process offline queue when back online
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;
    
    console.log(`Processing ${this.offlineQueue.length} offline operations`);
    
    try {
      // Save all pending changes at once
      await this.saveToGitHub();
      
      // Clear the queue on success
      this.offlineQueue = [];
      console.log('Offline queue processed successfully');
    } catch (error) {
      console.error('Failed to process offline queue:', error);
    }
  }
  
  // Handle online event
  private handleOnline = (): void => {
    console.log('Connection restored');
    this.isOnline = true;
    this.notifyConnectionListeners();
    
    // Process offline queue
    this.processOfflineQueue();
  };
  
  // Handle offline event
  private handleOffline = (): void => {
    console.log('Connection lost');
    this.isOnline = false;
    this.notifyConnectionListeners();
  };
  
  // Check connection status
  private async checkConnection(): Promise<void> {
    try {
      // If we don't have a token, just check navigator.onLine
      if (!this.token) {
        const wasOffline = !this.isOnline;
        this.isOnline = navigator.onLine;
        
        if (wasOffline && this.isOnline) {
          this.handleOnline();
        } else if (!wasOffline && !this.isOnline) {
          this.handleOffline();
        }
        return;
      }
      
      // Use authenticated request to check connection
      const response = await fetch(`${this.apiBase}/user`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        cache: 'no-cache'
      });
      
      const wasOffline = !this.isOnline;
      this.isOnline = response.ok;
      
      if (wasOffline && this.isOnline) {
        this.handleOnline();
      } else if (!wasOffline && !this.isOnline) {
        this.handleOffline();
      }
    } catch {
      if (this.isOnline) {
        this.handleOffline();
      }
    }
  }
  
  // Merge arrays by ID to avoid duplicates
  private mergeArrays<T extends { id: string }>(remote: T[], local: T[], idField: keyof T = 'id' as keyof T): T[] {
    const merged = new Map<string, T>();
    
    // Add all remote items first
    remote.forEach(item => {
      merged.set(item[idField] as string, item);
    });
    
    // Override/add local items (local changes take precedence)
    local.forEach(item => {
      merged.set(item[idField] as string, item);
    });
    
    return Array.from(merged.values());
  }
  
  // Cache management
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  private setCache<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  // Get default data structure
  private getDefaultData(): DataState {
    return {
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
  }
  
  // Subscribe to data changes
  subscribeToData(listener: DataListener): () => void {
    this.dataListeners.add(listener);
    // Immediately call with current data
    listener(this.memoryData);
    
    return () => {
      this.dataListeners.delete(listener);
    };
  }
  
  // Subscribe to connection changes
  subscribeToConnection(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    // Immediately call with current status
    listener(this.isOnline);
    
    return () => {
      this.connectionListeners.delete(listener);
    };
  }
  
  // Notify data listeners
  private notifyDataListeners(): void {
    this.dataListeners.forEach(listener => listener(this.memoryData));
  }
  
  // Notify connection listeners
  private notifyConnectionListeners(): void {
    this.connectionListeners.forEach(listener => listener(this.isOnline));
  }
  
  // Check if authenticated
  isAuthenticated(): boolean {
    return this.token !== null;
  }
  
  // Get connection status
  getConnectionStatus(): boolean {
    return this.isOnline;
  }
  
  // Get offline queue size
  getOfflineQueueSize(): number {
    return this.offlineQueue.length;
  }
  
  // Force sync (user action)
  async forceSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    
    // Clear debounce timer
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
    
    // Save immediately
    await this.saveToGitHub();
    
    // Process offline queue if any
    if (this.offlineQueue.length > 0) {
      await this.processOfflineQueue();
    }
  }
  
  // Clear all data
  async clearAllData(): Promise<void> {
    this.memoryData = this.getDefaultData();
    this.notifyDataListeners();
    
    if (this.isOnline) {
      await this.saveToGitHub();
    }
  }
  
  // Cleanup
  destroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    
    this.dataListeners.clear();
    this.connectionListeners.clear();
    this.cache.clear();
  }
}

// Create singleton instance
export const githubDataManager = new GitHubDataManager();