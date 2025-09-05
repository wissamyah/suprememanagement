import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import type { Sale, Product, Customer, InventoryMovement } from '../types';
import { storage, generateId } from '../utils/storage';
import { GitHubContext } from '../App';
import githubStorage from '../services/githubStorage';
import { globalSyncManager } from '../services/globalSyncManager';
import { generateOrderId, calculateSaleTotal } from '../utils/sales';

const SALES_KEY = 'sales';
const PRODUCTS_KEY = 'products';
const CUSTOMERS_KEY = 'customers';
const MOVEMENTS_KEY = 'inventory_movements';

export const useSalesWithGitHub = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncPending, setSyncPending] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const { isAuthenticated } = useContext(GitHubContext);
  const mountedRef = useRef(true);
  const isInitialLoad = useRef(true);

  // Cleanup on unmount and subscribe to global sync
  useEffect(() => {
    mountedRef.current = true;
    
    // Subscribe to global sync state for UI updates
    const unsubscribe = globalSyncManager.subscribe((syncState) => {
      if (mountedRef.current) {
        setSyncPending(syncState.isPending);
        setPendingChanges(syncState.pendingChanges);
        setLastSyncError(syncState.error);
      }
    });
    
    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  // Define loadData function
  const loadData = async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      if (isAuthenticated) {
        // Load all data from GitHub
        const githubData = await githubStorage.loadAllData();
        
        if (githubData) {
          // Set sales data from GitHub
          setSales(githubData.sales || []);
          setProducts(githubData.products || []);
          setCustomers(githubData.customers || []);
          setMovements(githubData.movements || []);
          
          // Update localStorage with GitHub data as backup
          storage.set(SALES_KEY, githubData.sales || []);
          storage.set(PRODUCTS_KEY, githubData.products || []);
          storage.set(CUSTOMERS_KEY, githubData.customers || []);
          storage.set(MOVEMENTS_KEY, githubData.movements || []);
        }
      } else {
        // Load from localStorage
        const storedSales = storage.get<Sale[]>(SALES_KEY) || [];
        const storedProducts = storage.get<Product[]>(PRODUCTS_KEY) || [];
        const storedCustomers = storage.get<Customer[]>(CUSTOMERS_KEY) || [];
        const storedMovements = storage.get<InventoryMovement[]>(MOVEMENTS_KEY) || [];
        setSales(storedSales);
        setProducts(storedProducts);
        setCustomers(storedCustomers);
        setMovements(storedMovements);
      }
    } catch (error) {
      console.error('Error loading sales data:', error);
      // Fallback to localStorage on error
      const storedSales = storage.get<Sale[]>(SALES_KEY) || [];
      const storedProducts = storage.get<Product[]>(PRODUCTS_KEY) || [];
      const storedCustomers = storage.get<Customer[]>(CUSTOMERS_KEY) || [];
      const storedMovements = storage.get<InventoryMovement[]>(MOVEMENTS_KEY) || [];
      setSales(storedSales);
      setProducts(storedProducts);
      setCustomers(storedCustomers);
      setMovements(storedMovements);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        // Mark initial load as complete
        setTimeout(() => {
          isInitialLoad.current = false;
        }, 100);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  // Notify global sync manager when data changes
  useEffect(() => {
    // Skip initial load to avoid marking as changed on mount
    if (mountedRef.current && isAuthenticated && !loading && !isInitialLoad.current) {
      globalSyncManager.markAsChanged();
    }
  }, [sales, isAuthenticated, loading]);

  const saveAllData = (newSales: Sale[], newProducts: Product[], newCustomers: Customer[], newMovements: InventoryMovement[]) => {
    // Save to local state immediately (optimistic update)
    setSales(newSales);
    setProducts(newProducts);
    setCustomers(newCustomers);
    setMovements(newMovements);
    
    // Save to localStorage - IMPORTANT: Use the correct keys that other hooks are listening to
    storage.set(SALES_KEY, newSales);
    storage.set(PRODUCTS_KEY, newProducts);
    storage.set(CUSTOMERS_KEY, newCustomers);
    storage.set(MOVEMENTS_KEY, newMovements);
    
    // Trigger storage events for other components to react
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'supreme_mgmt_products',
      newValue: JSON.stringify(newProducts),
      url: window.location.href
    }));
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'supreme_mgmt_customers',
      newValue: JSON.stringify(newCustomers),
      url: window.location.href
    }));
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'supreme_mgmt_inventory_movements',
      newValue: JSON.stringify(newMovements),
      url: window.location.href
    }));
    
    // Notify global sync manager
    globalSyncManager.markAsChanged();
  };

  // Add a new sale
  const addSale = useCallback((
    customerId: string,
    date: Date,
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unit: string;
      price: number;
      total: number;
    }>,
    status: 'pending' | 'processing' | 'completed' = 'completed',
    paymentStatus: 'pending' | 'partial' | 'paid' = 'pending'
  ): { success: boolean; errors?: string[]; saleId?: string } => {
    try {
      // Find customer
      const customer = customers.find(c => c.id === customerId);
      if (!customer) {
        return { success: false, errors: ['Customer not found'] };
      }

      // Validate products and update inventory
      const updatedProducts = [...products];
      const errors: string[] = [];

      for (const item of items) {
        const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
        if (productIndex === -1) {
          errors.push(`Product ${item.productName} not found`);
          continue;
        }

        const product = updatedProducts[productIndex];
        
        // Check if enough stock is available
        const availableQty = product.quantityOnHand - (product.quantityBooked || 0);
        if (item.quantity > availableQty) {
          errors.push(`Insufficient stock for ${product.name}. Available: ${availableQty}`);
          continue;
        }

        // Update product booked quantity
        updatedProducts[productIndex] = {
          ...product,
          quantityBooked: (product.quantityBooked || 0) + item.quantity,
          availableQuantity: product.quantityOnHand - ((product.quantityBooked || 0) + item.quantity),
          updatedAt: new Date()
        };
      }

      if (errors.length > 0) {
        return { success: false, errors };
      }

      // Calculate total amount
      const totalAmount = calculateSaleTotal(items);

      // Update customer balance - customer owes us money (negative balance)
      const updatedCustomers = customers.map(c => {
        if (c.id === customerId) {
          return {
            ...c,
            balance: c.balance - totalAmount, // Subtract: customer now owes us money
            updatedAt: new Date()
          };
        }
        return c;
      });

      // Create new sale
      const now = new Date();
      const newSale: Sale = {
        id: generateId(),
        orderId: generateOrderId(),
        customerId,
        customerName: customer.name,
        date,
        items,
        totalAmount,
        status,
        paymentStatus,
        createdAt: now,
        updatedAt: now
      };

      // Create inventory movements for each item
      const newMovements: InventoryMovement[] = [];
      for (const item of items) {
        const product = updatedProducts.find(p => p.id === item.productId);
        if (product) {
          const movement: InventoryMovement = {
            id: generateId(),
            productId: item.productId,
            productName: item.productName,
            movementType: 'sales',
            quantity: -item.quantity, // Negative for sales (stock reduction)
            previousQuantity: product.quantityOnHand,
            newQuantity: product.quantityOnHand, // Quantity on hand doesn't change, only booked changes
            reference: `Sale: ${newSale.orderId}`,
            referenceId: newSale.id,
            notes: `Sold to ${customer.name}`,
            date: date,
            createdAt: now,
            updatedAt: now
          };
          newMovements.push(movement);
        }
      }

      const updatedSales = [...sales, newSale];
      const updatedMovements = [...movements, ...newMovements];
      
      // Save all changes atomically
      saveAllData(updatedSales, updatedProducts, updatedCustomers, updatedMovements);
      
      return { success: true, saleId: newSale.id };
    } catch (error) {
      console.error('Error adding sale:', error);
      return { success: false, errors: ['Failed to add sale'] };
    }
  }, [sales, products, customers, movements]);

  // Update an existing sale
  const updateSale = useCallback((
    id: string,
    updates: Partial<Omit<Sale, 'id' | 'orderId' | 'createdAt' | 'updatedAt'>>
  ): { success: boolean; errors?: string[] } => {
    try {
      const saleIndex = sales.findIndex(s => s.id === id);
      if (saleIndex === -1) {
        return { success: false, errors: ['Sale not found'] };
      }

      const oldSale = sales[saleIndex];
      let updatedProducts = [...products];
      let updatedCustomers = [...customers];

      // If items are being updated, handle inventory changes
      if (updates.items) {
        // Reverse old sale's inventory bookings
        for (const oldItem of oldSale.items) {
          const productIndex = updatedProducts.findIndex(p => p.id === oldItem.productId);
          if (productIndex !== -1) {
            const product = updatedProducts[productIndex];
            updatedProducts[productIndex] = {
              ...product,
              quantityBooked: Math.max(0, (product.quantityBooked || 0) - oldItem.quantity),
              availableQuantity: product.quantityOnHand - Math.max(0, (product.quantityBooked || 0) - oldItem.quantity),
              updatedAt: new Date()
            };
          }
        }

        // Apply new items' bookings
        const errors: string[] = [];
        for (const newItem of updates.items) {
          const productIndex = updatedProducts.findIndex(p => p.id === newItem.productId);
          if (productIndex === -1) {
            errors.push(`Product ${newItem.productName} not found`);
            continue;
          }

          const product = updatedProducts[productIndex];
          const availableQty = product.quantityOnHand - (product.quantityBooked || 0);
          
          if (newItem.quantity > availableQty) {
            errors.push(`Insufficient stock for ${product.name}. Available: ${availableQty}`);
            continue;
          }

          updatedProducts[productIndex] = {
            ...product,
            quantityBooked: (product.quantityBooked || 0) + newItem.quantity,
            availableQuantity: product.quantityOnHand - ((product.quantityBooked || 0) + newItem.quantity),
            updatedAt: new Date()
          };
        }

        if (errors.length > 0) {
          return { success: false, errors };
        }

        // Update customer balance - accounting for the difference
        const newTotal = calculateSaleTotal(updates.items);
        const balanceDiff = newTotal - oldSale.totalAmount;

        updatedCustomers = updatedCustomers.map(c => {
          if (c.id === oldSale.customerId) {
            return {
              ...c,
              balance: c.balance - balanceDiff, // Subtract difference: if sale increased, customer owes more
              updatedAt: new Date()
            };
          }
          return c;
        });
      }

      const updatedSales = sales.map(sale => {
        if (sale.id === id) {
          return {
            ...sale,
            ...updates,
            totalAmount: updates.items ? calculateSaleTotal(updates.items) : sale.totalAmount,
            updatedAt: new Date()
          };
        }
        return sale;
      });

      // For now, keep the same movements (TODO: could add update movements in future)
      saveAllData(updatedSales, updatedProducts, updatedCustomers, movements);
      return { success: true };
    } catch (error) {
      console.error('Error updating sale:', error);
      return { success: false, errors: ['Failed to update sale'] };
    }
  }, [sales, products, customers, movements]);

  // Delete a sale
  const deleteSale = useCallback((id: string): { success: boolean; warning?: string } => {
    try {
      const sale = sales.find(s => s.id === id);
      if (!sale) {
        return { success: false };
      }

      // Reverse inventory bookings
      const updatedProducts = products.map(product => {
        const saleItem = sale.items.find(item => item.productId === product.id);
        if (saleItem) {
          return {
            ...product,
            quantityBooked: Math.max(0, (product.quantityBooked || 0) - saleItem.quantity),
            availableQuantity: product.quantityOnHand - Math.max(0, (product.quantityBooked || 0) - saleItem.quantity),
            updatedAt: new Date()
          };
        }
        return product;
      });

      // Reverse customer balance - they no longer owe us this money
      const updatedCustomers = customers.map(c => {
        if (c.id === sale.customerId) {
          return {
            ...c,
            balance: c.balance + sale.totalAmount, // Add back: customer no longer owes this amount
            updatedAt: new Date()
          };
        }
        return c;
      });

      const updatedSales = sales.filter(s => s.id !== id);
      
      // Remove movements related to this sale
      const updatedMovements = movements.filter(m => m.referenceId !== id);
      
      saveAllData(updatedSales, updatedProducts, updatedCustomers, updatedMovements);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting sale:', error);
      return { success: false };
    }
  }, [sales, products, customers, movements]);

  // Get sale by ID
  const getSaleById = useCallback((id: string): Sale | undefined => {
    return sales.find(s => s.id === id);
  }, [sales]);

  // Search sales
  const searchSales = useCallback((query: string): Sale[] => {
    const searchTerm = query.toLowerCase();
    return sales.filter(sale => 
      sale.orderId.toLowerCase().includes(searchTerm) ||
      sale.customerName.toLowerCase().includes(searchTerm) ||
      sale.items.some(item => item.productName.toLowerCase().includes(searchTerm))
    );
  }, [sales]);

  // Get products for dropdown
  const getProducts = useCallback((): Product[] => {
    return products;
  }, [products]);

  // Get customers for dropdown
  const getCustomers = useCallback((): Customer[] => {
    return customers;
  }, [customers]);

  // Force sync method - delegate to global sync manager
  const forceSync = useCallback(async () => {
    if (isAuthenticated && mountedRef.current) {
      console.log('Force sync triggered for sales');
      await globalSyncManager.forceSync();
    }
  }, [isAuthenticated]);

  return {
    sales,
    loading,
    pendingChanges,
    lastSyncError,
    syncInProgress: syncPending,
    addSale,
    updateSale,
    deleteSale,
    getSaleById,
    searchSales,
    getProducts,
    getCustomers,
    forceSync,
    refreshData: loadData
  };
};