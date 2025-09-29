import type { Product, InventoryMovement, ProductCategory, ProductionEntry } from '../types';
import { storage, generateId } from './storage';

const PRODUCTS_KEY = 'products';
const CATEGORIES_KEY = 'product_categories';
const MOVEMENTS_KEY = 'inventory_movements';
const PRODUCTION_KEY = 'production_entries';

export const calculateAvailableQuantity = (quantityOnHand: number, quantityBooked: number): number => {
  return Math.max(0, quantityOnHand - quantityBooked);
};

export const getStockStatus = (available: number, reorderLevel: number): 'in-stock' | 'low-stock' | 'out-of-stock' => {
  if (available <= 0) return 'out-of-stock';
  if (available <= reorderLevel) return 'low-stock';
  return 'in-stock';
};

export const formatMovementType = (type: InventoryMovement['movementType']): string => {
  const typeMap = {
    production: 'Production',
    sales: 'Sales',
    loading: 'Loading',
    adjustment: 'Adjustment',
    return: 'Return',
    damage: 'Damage'
  };
  return typeMap[type] || type;
};

export const getMovementColor = (type: InventoryMovement['movementType']): string => {
  const colorMap = {
    production: 'text-green-400',
    sales: 'text-blue-400',
    loading: 'text-orange-400',
    adjustment: 'text-purple-400',
    return: 'text-yellow-400',
    damage: 'text-red-400'
  };
  return colorMap[type] || 'text-gray-400';
};

export const createMovement = (
  productId: string,
  productName: string,
  movementType: InventoryMovement['movementType'],
  quantity: number,
  previousQuantity: number,
  newQuantity: number,
  reference?: string,
  referenceId?: string,
  notes?: string
): InventoryMovement => {
  const now = new Date();
  return {
    id: generateId(),
    productId,
    productName,
    movementType,
    quantity,
    previousQuantity,
    newQuantity,
    reference,
    referenceId,
    notes,
    date: now,
    createdAt: now,
    updatedAt: now
  };
};

export const exportInventoryToJSON = (products: Product[]): string => {
  return JSON.stringify(products, null, 2);
};

export const exportInventoryToCSV = (products: Product[]): string => {
  const headers = ['ID', 'Name', 'Category', 'On Hand', 'Booked', 'Available', 'Unit', 'Status', 'Reorder Level'];
  const rows = products.map(p => [
    p.id,
    p.name,
    p.category,
    p.quantityOnHand,
    p.quantityBooked,
    p.availableQuantity,
    p.unit,
    p.status,
    p.reorderLevel
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  return csvContent;
};

export const importInventoryFromJSON = (jsonString: string): Product[] | null => {
  try {
    const data = JSON.parse(jsonString);
    if (!Array.isArray(data)) return null;
    
    const products: Product[] = data.map(item => ({
      id: item.id || generateId(),
      name: item.name || '',
      category: item.category || 'Uncategorized',
      quantityOnHand: Number(item.quantityOnHand || item.quantity || 0),
      quantityBooked: Number(item.quantityBooked || 0),
      availableQuantity: calculateAvailableQuantity(
        Number(item.quantityOnHand || item.quantity || 0),
        Number(item.quantityBooked || 0)
      ),
      unit: item.unit || 'pcs',
      reorderLevel: Number(item.reorderLevel || 10),
      status: item.status || 'in-stock',
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
    }));
    
    return products;
  } catch (error) {
    console.error('Error importing inventory:', error);
    return null;
  }
};

export const validateProduct = (product: Partial<Product>): string[] => {
  const errors: string[] = [];
  
  if (!product.name || product.name.trim() === '') {
    errors.push('Product name is required');
  }
  
  if (!product.category || product.category.trim() === '') {
    errors.push('Product category is required');
  }
  
  if (product.quantityOnHand !== undefined && product.quantityOnHand < 0) {
    errors.push('Quantity on hand cannot be negative');
  }
  
  if (product.quantityBooked !== undefined && product.quantityBooked < 0) {
    errors.push('Quantity booked cannot be negative');
  }
  
  
  if (product.reorderLevel !== undefined && product.reorderLevel < 0) {
    errors.push('Reorder level cannot be negative');
  }
  
  return errors;
};

export const filterMovements = (
  movements: InventoryMovement[],
  filters: {
    productId?: string;
    movementType?: InventoryMovement['movementType'];
    dateFrom?: Date;
    dateTo?: Date;
    minQuantity?: number;
    maxQuantity?: number;
    searchTerm?: string;
  }
): InventoryMovement[] => {
  let filtered = [...movements];
  
  if (filters.productId) {
    filtered = filtered.filter(m => m.productId === filters.productId);
  }
  
  if (filters.movementType) {
    filtered = filtered.filter(m => m.movementType === filters.movementType);
  }
  
  if (filters.dateFrom) {
    filtered = filtered.filter(m => new Date(m.date) >= filters.dateFrom!);
  }
  
  if (filters.dateTo) {
    filtered = filtered.filter(m => new Date(m.date) <= filters.dateTo!);
  }
  
  if (filters.minQuantity !== undefined) {
    filtered = filtered.filter(m => Math.abs(m.quantity) >= filters.minQuantity!);
  }
  
  if (filters.maxQuantity !== undefined) {
    filtered = filtered.filter(m => Math.abs(m.quantity) <= filters.maxQuantity!);
  }
  
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    filtered = filtered.filter(m => 
      m.productName.toLowerCase().includes(term) ||
      m.notes?.toLowerCase().includes(term) ||
      m.reference?.toLowerCase().includes(term)
    );
  }
  
  return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const backupInventoryData = () => {
  const products = storage.get<Product[]>(PRODUCTS_KEY) || [];
  const categories = storage.get<ProductCategory[]>(CATEGORIES_KEY) || [];
  const movements = storage.get<InventoryMovement[]>(MOVEMENTS_KEY) || [];
  const production = storage.get<ProductionEntry[]>(PRODUCTION_KEY) || [];
  
  const backupData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: {
      products,
      categories,
      movements,
      production
    }
  };
  
  return JSON.stringify(backupData, null, 2);
};

export const restoreInventoryData = (backupJson: string): boolean => {
  try {
    const backup = JSON.parse(backupJson);
    
    if (!backup.data) {
      throw new Error('Invalid backup format');
    }
    
    if (backup.data.products) {
      storage.set(PRODUCTS_KEY, backup.data.products);
    }
    
    if (backup.data.categories) {
      storage.set(CATEGORIES_KEY, backup.data.categories);
    }
    
    if (backup.data.movements) {
      storage.set(MOVEMENTS_KEY, backup.data.movements);
    }
    
    if (backup.data.production) {
      storage.set(PRODUCTION_KEY, backup.data.production);
    }
    
    return true;
  } catch (error) {
    console.error('Error restoring backup:', error);
    return false;
  }
};

export const downloadFile = (content: string, filename: string, type: 'json' | 'csv') => {
  const mimeType = type === 'json' ? 'application/json' : 'text/csv';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};