export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface DataState {
  products: any[];
  categories: any[];
  movements: any[];
  productionEntries: any[];
  customers: any[];
  sales: any[];
  ledgerEntries: any[];
  bookedStock: any[];
  loadings: any[];
  suppliers: any[];
  paddyTrucks: any[];
}

export interface OfflineOperation {
  id: string;
  type: keyof DataState;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

export type DataListener = (data: DataState) => void;
export type ConnectionListener = (isOnline: boolean) => void;

export interface GitHubConfig {
  owner: string;
  repo: string;
  path: string;
  branch: string;
  token: string | null;
  apiBase: string;
}