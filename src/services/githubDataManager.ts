// GitHub Data Manager - Refactored with modular architecture
// Direct GitHub operations with in-memory cache

import { CacheManager } from './github/CacheManager';
import { OfflineQueueManager } from './github/OfflineQueueManager';
import { CrossTabSync } from './github/CrossTabSync';
import { GitHubAPIClient } from './github/GitHubAPIClient';
import { DataMerger } from './github/DataMerger';
import type { DataState, DataListener, ConnectionListener, GitHubConfig } from './github/types';

class GitHubDataManager {
  // Core modules
  private cacheManager: CacheManager;
  private offlineQueue: OfflineQueueManager;
  private crossTabSync: CrossTabSync;
  private githubAPI: GitHubAPIClient;
  private dataMerger: DataMerger;

  // State management
  private memoryData: DataState;
  private dataListeners: Set<DataListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private isOnline: boolean = navigator.onLine;

  // Debouncing and batching
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSaves: Set<keyof DataState> = new Set();
  private batchUpdateInProgress: boolean = false;
  private batchUpdateQueue: Array<{ type: keyof DataState; data: any }> = [];
  private saveLock: boolean = false;
  private saveQueue: Promise<void> = Promise.resolve();

  // Configuration
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly DEBOUNCE_DELAY = 2000; // 2 seconds
  private connectionCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Initialize modules
    this.cacheManager = new CacheManager();
    this.offlineQueue = new OfflineQueueManager();
    this.crossTabSync = new CrossTabSync();
    this.dataMerger = new DataMerger();

    // Initialize GitHub API client with default config
    const config: GitHubConfig = {
      owner: 'wissamyah',
      repo: 'suprememanagement-data',
      path: 'data/data.json',
      branch: 'main',
      token: null,
      apiBase: 'https://api.github.com'
    };
    this.githubAPI = new GitHubAPIClient(config);

    // Initialize memory data
    this.memoryData = this.dataMerger.getDefaultDataState();

    // Setup event listeners
    this.setupEventListeners();

    // Setup cross-tab sync callback
    // DISABLED: This was causing old data to overwrite new data
    // The cross-tab sync would broadcast data, then receive its own broadcast
    // and overwrite the memoryData with stale data from localStorage
    /*
    this.crossTabSync.onUpdate((data) => {
      this.memoryData = data;
      this.dataListeners.forEach(listener => listener(this.memoryData));
    });
    */
  }

  private setupEventListeners(): void {
    // Monitor online/offline status
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Check connection periodically
    this.connectionCheckInterval = setInterval(() => this.checkConnection(), 30000);
  }

  // Initialize with GitHub token
  async initialize(token: string): Promise<boolean> {
    this.githubAPI.updateToken(token);

    // Verify token and load initial data
    const isValid = await this.githubAPI.verifyToken();
    if (!isValid) {
      throw new Error('Invalid GitHub token');
    }

    // Load all data from GitHub
    await this.loadAllData();

    return true;
  }

  // Load all data from GitHub
  async loadAllData(forceRefresh: boolean = false, silent: boolean = false): Promise<DataState> {
    const cacheKey = 'all_data';

    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cached = this.cacheManager.get<DataState>(cacheKey);
      if (cached) {
        this.memoryData = cached;
        if (!silent) {
          this.notifyDataListeners();
        }
        return cached;
      }
    }

    try {
      const result = await this.githubAPI.fetchData();

      if (result) {
        // Only update memoryData if not in silent mode (for SHA fetch only)
        if (silent) {
          // Store SHA but don't update memoryData
          this.cacheManager.set('github_sha', result.sha, Infinity);
          return this.memoryData;
        } else {
          this.memoryData = result.data;
          this.cacheManager.set('github_sha', result.sha, Infinity);
        }
      } else {
        // File doesn't exist, use default data
        if (!silent) {
          this.memoryData = this.dataMerger.getDefaultDataState();
        }
      }

      // Cache the result
      this.cacheManager.set(cacheKey, this.memoryData, this.CACHE_TTL);

      // Notify listeners only if not silent
      if (!silent) {
        this.notifyDataListeners();
      }

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

    // Only notify listeners if NOT in batch mode
    if (!this.batchUpdateInProgress) {
      this.notifyDataListeners();
    }

    // Mark as pending save
    this.pendingSaves.add(type);

    try {
      // If we're in a batch update, queue it instead of saving
      if (this.batchUpdateInProgress) {
        this.batchUpdateQueue.push({ type, data });
        return;
      }

      if (this.isOnline) {
        if (immediate) {
          // Save immediately
          await this.saveToGitHub();
        } else {
          // Debounce the save
          this.scheduleDebouncedSave();
        }
      } else {
        // Queue for offline sync
        this.offlineQueue.add(type, 'update', data);
      }
    } catch (error) {
      // Rollback on failure
      console.error(`Failed to update ${type}, rolling back:`, error);
      this.memoryData[type] = previousData;
      this.notifyDataListeners();
      throw error;
    }
  }

  // Start a batch update
  startBatchUpdate(): void {
    this.batchUpdateInProgress = true;
    this.batchUpdateQueue = [];
  }

  // End batch update and save all changes at once
  async endBatchUpdate(): Promise<void> {
    if (!this.batchUpdateInProgress) return;

    this.batchUpdateInProgress = false;

    // Notify listeners once at the end of batch
    this.notifyDataListeners();

    // Clear the queue
    const hadUpdates = this.batchUpdateQueue.length > 0;
    this.batchUpdateQueue = [];

    // Wait for any in-progress saves to complete
    await this.saveQueue;

    // If we have pending updates, save them now
    if (hadUpdates && this.isOnline) {
      try {
        await this.saveToGitHub();
      } catch (error) {
        console.error('Batch update save failed:', error);
        // Don't throw here - the data is already updated optimistically
      }
    }
  }

  // Save to GitHub with lock mechanism
  private async saveToGitHub(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot save: offline');
    }

    // If batch update is in progress, don't save
    if (this.batchUpdateInProgress) {
      return;
    }

    // Queue this save operation to prevent concurrent saves
    this.saveQueue = this.saveQueue.then(async () => {
      // Double-check batch mode in case it changed while waiting
      if (this.batchUpdateInProgress) {
        return;
      }

      // Acquire lock
      if (this.saveLock) {
        return; // Another save is in progress
      }
      this.saveLock = true;

      try {
        // Clear pending saves
        this.pendingSaves.clear();

        // Get current SHA from cache
        let sha = this.cacheManager.get<string>('github_sha');

        // If no cached SHA, fetch it (silent mode to not overwrite memoryData)
        if (!sha) {
          await this.loadAllData(true, true); // force refresh, silent mode
          sha = this.cacheManager.get<string>('github_sha');
        }

        try {
          const newSha = await this.githubAPI.saveData(this.memoryData, sha || undefined);
          this.cacheManager.set('github_sha', newSha, Infinity);
          console.log('Data saved to GitHub successfully');
        } catch (error: any) {
          // Handle SHA conflict
          if (error.message === 'SHA_CONFLICT') {
            console.log('SHA mismatch detected, merging changes...');
            await this.handleShaConflict();
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.error('Failed to save to GitHub:', error);
        throw error;
      } finally {
        // Release lock
        this.saveLock = false;
      }
    });

    return this.saveQueue;
  }

  // Handle SHA conflict by merging changes
  private async handleShaConflict(): Promise<void> {
    // Store current local changes
    const localData = { ...this.memoryData };

    // Load fresh data from GitHub (non-silent to get remote data for merging)
    const remoteData = await this.loadAllData(true, true);
    const freshSha = this.cacheManager.get<string>('github_sha');

    // Merge local changes with remote data
    this.memoryData = this.dataMerger.mergeDataStates(remoteData, localData);

    // Try to save again with fresh SHA
    if (freshSha) {
      const newSha = await this.githubAPI.saveData(this.memoryData, freshSha || undefined);
      this.cacheManager.set('github_sha', newSha, Infinity);
      console.log('Data saved to GitHub successfully after merge');
      // Notify listeners after successful merge
      this.notifyDataListeners();
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

  // Process offline queue when back online
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.isEmpty()) return;

    console.log(`Processing ${this.offlineQueue.getSize()} offline operations`);

    try {
      // Save all pending changes at once
      await this.saveToGitHub();

      // Clear the queue on success
      this.offlineQueue.clear();
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
    const wasOffline = !this.isOnline;
    this.isOnline = await this.githubAPI.checkConnection();

    if (wasOffline && this.isOnline) {
      this.handleOnline();
    } else if (!wasOffline && !this.isOnline) {
      this.handleOffline();
    }
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

  // Debounce timer for listener notifications
  private notifyDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Notify data listeners with debouncing to prevent rapid successive calls
  private notifyDataListeners(): void {
    // Clear any pending notification
    if (this.notifyDebounceTimer) {
      clearTimeout(this.notifyDebounceTimer);
    }

    // Debounce notifications to prevent React state confusion
    this.notifyDebounceTimer = setTimeout(() => {
      const currentData = { ...this.memoryData };

      this.dataListeners.forEach(listener => {
        try {
          listener(currentData);
        } catch (error) {
          console.error('Error in data listener:', error);
        }
      });

      // Broadcast changes to other tabs
      this.crossTabSync.broadcast(currentData);
      this.notifyDebounceTimer = null;
    }, 10);
  }

  // Notify connection listeners
  private notifyConnectionListeners(): void {
    this.connectionListeners.forEach(listener => listener(this.isOnline));
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return this.githubAPI.verifyToken().then(valid => valid).catch(() => false) as unknown as boolean;
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isOnline;
  }

  // Get offline queue size
  getOfflineQueueSize(): number {
    return this.offlineQueue.getSize();
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
    if (!this.offlineQueue.isEmpty()) {
      await this.processOfflineQueue();
    }
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    this.memoryData = this.dataMerger.getDefaultDataState();
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

    if (this.notifyDebounceTimer) {
      clearTimeout(this.notifyDebounceTimer);
    }

    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    this.dataListeners.clear();
    this.connectionListeners.clear();
    this.cacheManager.clear();
    this.crossTabSync.destroy();
  }
}

// Create singleton instance
export const githubDataManager = new GitHubDataManager();