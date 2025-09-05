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
  email: string;
  phone: string;
  address: string;
  category: 'Paddy Supplier' | 'Rice Mill' | 'Grain Supplier' | 'Other';
  totalBusiness: number;
  status: 'active' | 'inactive';
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
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
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
  orderId: string;
  customerId: string;
  customerName: string;
  vehicle: string;
  driver: string;
  date: Date;
  status: 'scheduled' | 'loading' | 'in-transit' | 'completed';
  items: LoadingItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LoadingItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
}

export interface PaddyTruck {
  id: string;
  truckNo: string;
  supplierId: string;
  supplierName: string;
  driver: string;
  arrivalDate: Date;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  moistureLevel: number;
  quality: 'Grade A' | 'Grade B' | 'Grade C';
  pricePerKg: number;
  totalAmount: number;
  status: 'waiting' | 'weighing' | 'unloaded' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface LedgerEntry {
  id: string;
  date: Date;
  entityId: string;
  entityName: string;
  entityType: 'customer' | 'supplier';
  description: string;
  debit: number;
  credit: number;
  balance: number;
  referenceType: 'sale' | 'purchase' | 'payment' | 'adjustment';
  referenceId?: string;
  createdAt: Date;
  updatedAt: Date;
}