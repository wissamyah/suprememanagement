import type { OfflineOperation, DataState } from './types';

export class OfflineQueueManager {
  private queue: OfflineOperation[] = [];

  add(
    type: keyof DataState,
    operation: 'create' | 'update' | 'delete',
    data: any
  ): void {
    this.queue.push({
      id: Date.now().toString(),
      type,
      operation,
      data,
      timestamp: Date.now()
    });

    console.log(`Queued offline operation: ${operation} ${type}`);
  }

  getAll(): OfflineOperation[] {
    return [...this.queue];
  }

  clear(): void {
    const count = this.queue.length;
    this.queue = [];
    if (count > 0) {
      console.log(`Cleared ${count} offline operations`);
    }
  }

  getSize(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  removeById(id: string): boolean {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(op => op.id !== id);
    return this.queue.length < initialLength;
  }

  getOldestOperation(): OfflineOperation | null {
    return this.queue.length > 0 ? this.queue[0] : null;
  }

  getNewestOperation(): OfflineOperation | null {
    return this.queue.length > 0 ? this.queue[this.queue.length - 1] : null;
  }
}