export interface Customer {
  id: string;
  name: string;
  phone: string;
  state: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  agent: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  quantityOnHand: number;
  quantityBooked: number;
  availableQuantity: number;
  unit: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  reorderLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  movementType: 'production' | 'sales' | 'loading' | 'adjustment' | 'return' | 'damage';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reference?: string;
  referenceId?: string;
  notes?: string;
  userId?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductionEntry {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  date: Date;
  shift?: string;
  notes?: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Sale {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  date: Date;
  items: SaleItem[];
  totalAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

export interface Loading {
  id: string;
  loadingId: string;
  date: string;
  customerId: string;
  customerName: string;
  truckPlateNumber: string;
  wayBillNumber?: string;
  items: LoadingItem[];
  totalValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoadingItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  bookedStockId: string;
}

export interface PaddyTruck {
  id: string;
  date: Date;
  supplierId: string;
  supplierName: string;
  waybillNumber?: string;
  truckPlate: string;
  bags?: number;
  netWeight?: number;
  deduction?: number;
  weightAfterDeduction: number;
  moistureLevel: number;
  pricePerKg: number;
  totalAmount: number;
  agent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LedgerEntry {
  id: string;
  customerId: string;
  customerName: string;
  date: Date;
  type: 'credit' | 'debit';
  amount: number;
  transactionType: 'payment' | 'sale' | 'credit_note' | 'opening_balance' | 'adjustment';
  referenceId?: string; // Links to Sale ID or Payment ID
  referenceNumber?: string; // Receipt/Invoice number
  description: string;
  debit: number; // Money customer owes (sales)
  credit: number; // Money customer paid or credited
  runningBalance: number; // Balance after this transaction
  paymentMethod?: 'cash' | 'bank_transfer' | 'cheque'; // For payments only
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookedStock {
  id: string;
  customerId: string;
  customerName: string;
  saleId: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  quantityLoaded: number; // Track partial loadings
  unit: string;
  bookingDate: Date;
  status: 'pending' | 'confirmed' | 'partial-loaded' | 'fully-loaded' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Global Search Types
export type EntityType = 'customer' | 'supplier' | 'product' | 'sale' | 'loading' | 'paddyTruck';

export interface SearchResult<T = any> {
  type: EntityType;
  data: T;
  score?: number;
}

export interface GroupedSearchResults {
  customers: SearchResult<Customer>[];
  suppliers: SearchResult<Supplier>[];
  products: SearchResult<Product>[];
  sales: SearchResult<Sale>[];
  loadings: SearchResult<Loading>[];
  paddyTrucks: SearchResult<PaddyTruck>[];
}