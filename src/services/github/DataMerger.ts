import type { DataState } from './types';

export class DataMerger {
  mergeArrays<T extends { id: string }>(
    remote: T[],
    local: T[],
    idField: keyof T = 'id' as keyof T
  ): T[] {
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

  mergeDataStates(remote: DataState, local: DataState): DataState {
    return {
      products: this.mergeArrays(remote.products, local.products, 'id'),
      categories: this.mergeArrays(remote.categories, local.categories, 'id'),
      movements: this.mergeArrays(remote.movements, local.movements, 'id'),
      productionEntries: this.mergeArrays(remote.productionEntries, local.productionEntries, 'id'),
      customers: this.mergeArrays(remote.customers, local.customers, 'id'),
      sales: this.mergeArrays(remote.sales, local.sales, 'id'),
      ledgerEntries: this.mergeArrays(remote.ledgerEntries, local.ledgerEntries, 'id'),
      bookedStock: this.mergeArrays(remote.bookedStock, local.bookedStock, 'id'),
      loadings: this.mergeArrays(remote.loadings, local.loadings, 'id'),
      suppliers: this.mergeArrays(remote.suppliers, local.suppliers, 'id'),
      paddyTrucks: this.mergeArrays(remote.paddyTrucks, local.paddyTrucks, 'id')
    };
  }

  getDefaultDataState(): DataState {
    return {
      products: [],
      categories: [],
      movements: [],
      productionEntries: [],
      customers: [],
      sales: [],
      ledgerEntries: [],
      bookedStock: [],
      loadings: [],
      suppliers: [],
      paddyTrucks: []
    };
  }
}