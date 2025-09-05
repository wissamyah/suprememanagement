// Sync Queue Service for managing pending changes
export interface QueueItem {
  id: string;
  type: 'product' | 'category' | 'movement' | 'production';
  operation: 'add' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  retryCount: number;
}

class SyncQueue {
  private queue: QueueItem[] = [];
  private processing = false;
  private maxRetries = 3;

  constructor() {
    // Load pending queue from localStorage on init
    this.loadQueue();
  }

  private loadQueue() {
    const saved = localStorage.getItem('sync_queue');
    if (saved) {
      try {
        this.queue = JSON.parse(saved);
      } catch (error) {
        console.error('Failed to load sync queue:', error);
        this.queue = [];
      }
    }
  }

  private saveQueue() {
    localStorage.setItem('sync_queue', JSON.stringify(this.queue));
  }

  addToQueue(item: Omit<QueueItem, 'id' | 'timestamp' | 'retryCount'>) {
    const queueItem: QueueItem = {
      ...item,
      id: `queue_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      retryCount: 0
    };
    
    this.queue.push(queueItem);
    this.saveQueue();
    return queueItem;
  }

  getQueue(): QueueItem[] {
    return [...this.queue];
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  removeFromQueue(id: string) {
    this.queue = this.queue.filter(item => item.id !== id);
    this.saveQueue();
  }

  incrementRetry(id: string): boolean {
    const item = this.queue.find(i => i.id === id);
    if (item) {
      item.retryCount++;
      this.saveQueue();
      return item.retryCount < this.maxRetries;
    }
    return false;
  }

  clearQueue() {
    this.queue = [];
    this.saveQueue();
  }

  isProcessing(): boolean {
    return this.processing;
  }

  setProcessing(value: boolean) {
    this.processing = value;
  }

  // Get items that haven't exceeded retry limit
  getRetryableItems(): QueueItem[] {
    return this.queue.filter(item => item.retryCount < this.maxRetries);
  }

  // Mark failed items
  getFailedItems(): QueueItem[] {
    return this.queue.filter(item => item.retryCount >= this.maxRetries);
  }
}

// Create singleton instance
export const syncQueue = new SyncQueue();