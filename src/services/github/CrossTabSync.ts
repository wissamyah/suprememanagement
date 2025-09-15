import type { DataState } from './types';

interface SyncMessage {
  type: 'data_update';
  data: DataState;
  timestamp: number;
}

export class CrossTabSync {
  private broadcastChannel: BroadcastChannel | null = null;
  private onDataUpdate: ((data: DataState) => void) | null = null;
  private storageListener: ((event: StorageEvent) => void) | null = null;

  constructor() {
    this.setupSync();
  }

  private setupSync(): void {
    try {
      // Use BroadcastChannel if available
      if ('BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('supreme_data_sync');

        this.broadcastChannel.onmessage = (event) => {
          if (event.data.type === 'data_update' && this.onDataUpdate) {
            this.onDataUpdate(event.data.data);
          }
        };
      }

      // Setup localStorage fallback
      this.storageListener = (event: StorageEvent) => {
        if (event.key === 'supreme_data_sync' && event.newValue) {
          try {
            const update = JSON.parse(event.newValue);
            // Only process recent updates (within 1 second)
            if (update.timestamp > Date.now() - 1000 && this.onDataUpdate) {
              this.onDataUpdate(update.data);
            }
          } catch (error) {
            console.error('Failed to parse cross-tab update:', error);
          }
        }
      };

      window.addEventListener('storage', this.storageListener);
    } catch (error) {
      console.error('Failed to setup cross-tab sync:', error);
    }
  }

  broadcast(data: DataState): void {
    try {
      const updateMessage: SyncMessage = {
        type: 'data_update',
        data,
        timestamp: Date.now()
      };

      // Use BroadcastChannel if available
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage(updateMessage);
      }

      // Also use localStorage for additional sync
      localStorage.setItem('supreme_data_sync', JSON.stringify({
        data,
        timestamp: Date.now()
      }));

      // Clean up after a short delay
      setTimeout(() => {
        localStorage.removeItem('supreme_data_sync');
      }, 100);
    } catch (error) {
      console.error('Failed to broadcast data change:', error);
    }
  }

  onUpdate(callback: (data: DataState) => void): void {
    this.onDataUpdate = callback;
  }

  destroy(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }

    this.onDataUpdate = null;
  }
}