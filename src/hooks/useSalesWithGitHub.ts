import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import type { Sale, Product, Customer, InventoryMovement, LedgerEntry, BookedStock } from '../types';
import { storage, generateId } from '../utils/storage';
import { GitHubContext } from '../App';
import githubStorage from '../services/githubStorage';
import { globalSyncManager } from '../services/globalSyncManager';
import { generateOrderId, calculateSaleTotal } from '../utils/sales';
import { useBookedStockWithGitHub } from './useBookedStockWithGitHub';

const SALES_KEY = 'sales';
const PRODUCTS_KEY = 'products';
const CUSTOMERS_KEY = 'customers';
const MOVEMENTS_KEY = 'inventory_movements';
const LEDGER_KEY = 'ledger_entries';

export const useSalesWithGitHub = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncPending, setSyncPending] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const { isAuthenticated } = useContext(GitHubContext);
  const mountedRef = useRef(true);
  const isInitialLoad = useRef(true);
  
  // Integrate booked stock management
  const {
    addBookedStock,
    updateBookedStock,
    deleteBookedStock,
    getBookedStockBySale,
    bookedStock
  } = useBookedStockWithGitHub();

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
          setLedgerEntries(githubData.ledgerEntries || []);
          
          // Update localStorage with GitHub data as backup
          storage.set(SALES_KEY, githubData.sales || []);
          storage.set(PRODUCTS_KEY, githubData.products || []);
          storage.set(CUSTOMERS_KEY, githubData.customers || []);
          storage.set(MOVEMENTS_KEY, githubData.movements || []);
          storage.set(LEDGER_KEY, githubData.ledgerEntries || []);
        }
      } else {
        // Load from localStorage
        const storedSales = storage.get<Sale[]>(SALES_KEY) || [];
        const storedProducts = storage.get<Product[]>(PRODUCTS_KEY) || [];
        const storedCustomers = storage.get<Customer[]>(CUSTOMERS_KEY) || [];
        const storedMovements = storage.get<InventoryMovement[]>(MOVEMENTS_KEY) || [];
        const storedLedger = storage.get<LedgerEntry[]>(LEDGER_KEY) || [];
        setSales(storedSales);
        setProducts(storedProducts);
        setCustomers(storedCustomers);
        setMovements(storedMovements);
        setLedgerEntries(storedLedger);
      }
    } catch (error) {
      console.error('Error loading sales data:', error);
      // Fallback to localStorage on error
      const storedSales = storage.get<Sale[]>(SALES_KEY) || [];
      const storedProducts = storage.get<Product[]>(PRODUCTS_KEY) || [];
      const storedCustomers = storage.get<Customer[]>(CUSTOMERS_KEY) || [];
      const storedMovements = storage.get<InventoryMovement[]>(MOVEMENTS_KEY) || [];
      const storedLedger = storage.get<LedgerEntry[]>(LEDGER_KEY) || [];
      setSales(storedSales);
      setProducts(storedProducts);
      setCustomers(storedCustomers);
      setMovements(storedMovements);
      setLedgerEntries(storedLedger);
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

  // Listen for storage events to sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!mountedRef.current) return;
      
      if (e.key === `supreme_mgmt_${SALES_KEY}` && e.newValue) {
        try {
          const newData = JSON.parse(e.newValue);
          setSales(newData);
        } catch (error) {
          console.error('Error parsing sales from storage event:', error);
        }
      }
      if (e.key === `supreme_mgmt_${CUSTOMERS_KEY}` && e.newValue) {
        try {
          const newData = JSON.parse(e.newValue);
          setCustomers(newData);
        } catch (error) {
          console.error('Error parsing customers from storage event:', error);
        }
      }
      if (e.key === `supreme_mgmt_${PRODUCTS_KEY}` && e.newValue) {
        try {
          const newData = JSON.parse(e.newValue);
          setProducts(newData);
        } catch (error) {
          console.error('Error parsing products from storage event:', error);
        }
      }
      if (e.key === `supreme_mgmt_${MOVEMENTS_KEY}` && e.newValue) {
        try {
          const newData = JSON.parse(e.newValue);
          setMovements(newData);
        } catch (error) {
          console.error('Error parsing movements from storage event:', error);
        }
      }
      if (e.key === `supreme_mgmt_${LEDGER_KEY}` && e.newValue) {
        try {
          const newData = JSON.parse(e.newValue);
          setLedgerEntries(newData);
        } catch (error) {
          console.error('Error parsing ledger from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Notify global sync manager when data changes
  useEffect(() => {
    // Skip initial load to avoid marking as changed on mount
    if (mountedRef.current && isAuthenticated && !loading && !isInitialLoad.current) {
      globalSyncManager.markAsChanged();
    }
  }, [sales, isAuthenticated, loading]);

  const saveAllData = (newSales: Sale[], newProducts: Product[], newCustomers: Customer[], newMovements: InventoryMovement[], newLedgerEntries: LedgerEntry[]) => {
    // Save to local state immediately (optimistic update)
    setSales(newSales);
    setProducts(newProducts);
    setCustomers(newCustomers);
    setMovements(newMovements);
    setLedgerEntries(newLedgerEntries);
    
    // Save to localStorage - IMPORTANT: Use the correct keys that other hooks are listening to
    storage.set(SALES_KEY, newSales);
    storage.set(PRODUCTS_KEY, newProducts);
    storage.set(CUSTOMERS_KEY, newCustomers);
    storage.set(MOVEMENTS_KEY, newMovements);
    storage.set(LEDGER_KEY, newLedgerEntries);
    
    // Trigger storage events for other components to react
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'supreme_mgmt_sales',
      newValue: JSON.stringify(newSales),
      url: window.location.href
    }));
    
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
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'supreme_mgmt_ledger_entries',
      newValue: JSON.stringify(newLedgerEntries),
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
    status: 'pending' | 'processing' | 'completed' = 'pending', // Default to pending
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

        // Update product based on sale status
        if (status === 'completed') {
          // For completed sales, directly reduce on-hand quantity (no booking)
          updatedProducts[productIndex] = {
            ...product,
            quantityOnHand: product.quantityOnHand - item.quantity,
            availableQuantity: product.quantityOnHand - item.quantity - (product.quantityBooked || 0),
            status: (product.quantityOnHand - item.quantity) <= 0 ? 'out-of-stock' : 
                   (product.quantityOnHand - item.quantity) <= product.reorderLevel ? 'low-stock' : 'in-stock',
            updatedAt: new Date()
          };
        } else {
          // For pending/processing sales, update booked quantity (reserve stock)
          updatedProducts[productIndex] = {
            ...product,
            quantityBooked: (product.quantityBooked || 0) + item.quantity,
            availableQuantity: product.quantityOnHand - ((product.quantityBooked || 0) + item.quantity),
            updatedAt: new Date()
          };
        }
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
        const originalProduct = products.find(p => p.id === item.productId);
        const updatedProduct = updatedProducts.find(p => p.id === item.productId);
        if (originalProduct && updatedProduct) {
          const movement: InventoryMovement = {
            id: generateId(),
            productId: item.productId,
            productName: item.productName,
            movementType: 'sales',
            quantity: -item.quantity, // Negative for sales (stock reduction)
            previousQuantity: originalProduct.quantityOnHand,
            newQuantity: status === 'completed' 
              ? originalProduct.quantityOnHand - item.quantity // For completed sales, show actual reduction
              : originalProduct.quantityOnHand, // For pending/processing, on-hand doesn't change yet
            reference: `Sale: ${newSale.orderId}`,
            referenceId: newSale.id,
            notes: `${status === 'completed' ? 'Delivered to' : 'Booked for'} ${customer.name}`,
            date: date,
            createdAt: now,
            updatedAt: now
          };
          newMovements.push(movement);
        }
      }

      // Create ledger entry for the sale
      const newLedgerEntry: LedgerEntry = {
        id: generateId(),
        customerId,
        customerName: customer.name,
        date,
        transactionType: 'sale',
        referenceId: newSale.id,
        referenceNumber: newSale.orderId,
        description: `Sale Invoice #${newSale.orderId}`,
        debit: totalAmount, // Customer owes us money
        credit: 0,
        runningBalance: 0, // Will be recalculated
        notes: `${items.length} item(s) sold`,
        createdAt: now,
        updatedAt: now
      };

      // Create booked stock records for pending/processing sales
      if (status === 'pending' || status === 'processing') {
        for (const item of items) {
          addBookedStock(
            customerId,
            customer.name,
            newSale.id,
            newSale.orderId,
            item.productId,
            item.productName,
            item.quantity,
            item.unit,
            date,
            `Booked from sale ${newSale.orderId}`
          );
        }
      }

      // Add ledger entry and recalculate balances
      const allLedgerEntries = [...ledgerEntries, newLedgerEntry];
      const recalculatedLedger = recalculateBalances(allLedgerEntries, customerId);

      const updatedSales = [...sales, newSale];
      const updatedMovements = [...movements, ...newMovements];
      
      // Save all changes atomically
      saveAllData(updatedSales, updatedProducts, updatedCustomers, updatedMovements, recalculatedLedger);
      
      return { success: true, saleId: newSale.id };
    } catch (error) {
      console.error('Error adding sale:', error);
      return { success: false, errors: ['Failed to add sale'] };
    }
  }, [sales, products, customers, movements, ledgerEntries]);

  // Helper function to recalculate running balances for a customer
  const recalculateBalances = (entries: LedgerEntry[], customerId?: string): LedgerEntry[] => {
    // Filter entries for specific customer if provided
    const filteredEntries = customerId 
      ? entries.filter(e => e.customerId === customerId)
      : entries;
    
    // Group by customer
    const customerGroups = new Map<string, LedgerEntry[]>();
    entries.forEach(entry => {
      if (!customerGroups.has(entry.customerId)) {
        customerGroups.set(entry.customerId, []);
      }
      customerGroups.get(entry.customerId)!.push(entry);
    });
    
    // Recalculate balances for each customer
    const updatedEntries: LedgerEntry[] = [];
    
    customerGroups.forEach((customerEntries, custId) => {
      // Only recalculate for the specified customer or all if not specified
      if (!customerId || custId === customerId) {
        // Sort by date and then by creation time
        const sorted = [...customerEntries].sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA !== dateB) return dateA - dateB;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        
        let balance = 0;
        sorted.forEach(entry => {
          // For open book: credit increases balance (customer has credit), debit decreases (customer owes)
          balance = balance + entry.credit - entry.debit;
          updatedEntries.push({
            ...entry,
            runningBalance: balance
          });
        });
      } else {
        // Keep other customers' entries unchanged
        updatedEntries.push(...customerEntries);
      }
    });
    
    return updatedEntries;
  };

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
        // Reverse old sale's inventory effects based on old status
        for (const oldItem of oldSale.items) {
          const productIndex = updatedProducts.findIndex(p => p.id === oldItem.productId);
          if (productIndex !== -1) {
            const product = updatedProducts[productIndex];
            if (oldSale.status === 'completed') {
              // For completed sales, restore on-hand quantity
              updatedProducts[productIndex] = {
                ...product,
                quantityOnHand: product.quantityOnHand + oldItem.quantity,
                availableQuantity: (product.quantityOnHand + oldItem.quantity) - (product.quantityBooked || 0),
                updatedAt: new Date()
              };
            } else {
              // For pending/processing sales, reverse booking
              updatedProducts[productIndex] = {
                ...product,
                quantityBooked: Math.max(0, (product.quantityBooked || 0) - oldItem.quantity),
                availableQuantity: product.quantityOnHand - Math.max(0, (product.quantityBooked || 0) - oldItem.quantity),
                updatedAt: new Date()
              };
            }
          }
        }

        // Apply new items' effects based on new/current status
        const errors: string[] = [];
        const newStatus = updates.status || oldSale.status;
        
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

          if (newStatus === 'completed') {
            // For completed sales, directly reduce on-hand quantity
            updatedProducts[productIndex] = {
              ...product,
              quantityOnHand: product.quantityOnHand - newItem.quantity,
              availableQuantity: (product.quantityOnHand - newItem.quantity) - (product.quantityBooked || 0),
              status: (product.quantityOnHand - newItem.quantity) <= 0 ? 'out-of-stock' : 
                     (product.quantityOnHand - newItem.quantity) <= product.reorderLevel ? 'low-stock' : 'in-stock',
              updatedAt: new Date()
            };
          } else {
            // For pending/processing sales, update booking
            updatedProducts[productIndex] = {
              ...product,
              quantityBooked: (product.quantityBooked || 0) + newItem.quantity,
              availableQuantity: product.quantityOnHand - ((product.quantityBooked || 0) + newItem.quantity),
              updatedAt: new Date()
            };
          }
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

      // Update booked stock records if status or items changed
      const updatedSale = updatedSales.find(s => s.id === id);
      if (updatedSale) {
        const existingBookings = getBookedStockBySale(id);
        
        // If status changed to completed, cancel bookings
        if (updates.status === 'completed' && oldSale.status !== 'completed') {
          existingBookings.forEach(booking => {
            updateBookedStock(booking.id, { status: 'cancelled' });
          });
        }
        // If status changed to pending/processing from completed, recreate bookings
        else if ((updates.status === 'pending' || updates.status === 'processing') && 
                 oldSale.status === 'completed') {
          const items = updates.items || oldSale.items;
          items.forEach(item => {
            addBookedStock(
              updatedSale.customerId,
              updatedSale.customerName,
              updatedSale.id,
              updatedSale.orderId,
              item.productId,
              item.productName,
              item.quantity,
              item.unit,
              updatedSale.date,
              `Booked from sale ${updatedSale.orderId}`
            );
          });
        }
        // If items changed, update bookings
        else if (updates.items && (updatedSale.status === 'pending' || updatedSale.status === 'processing')) {
          // Remove old bookings
          existingBookings.forEach(booking => {
            deleteBookedStock(booking.id);
          });
          // Create new bookings
          updates.items.forEach(item => {
            addBookedStock(
              updatedSale.customerId,
              updatedSale.customerName,
              updatedSale.id,
              updatedSale.orderId,
              item.productId,
              item.productName,
              item.quantity,
              item.unit,
              updatedSale.date,
              `Booked from sale ${updatedSale.orderId}`
            );
          });
        }
      }

      // Update ledger entry if items/amount changed
      let updatedLedger = [...ledgerEntries];
      if (updates.items) {
        const newTotal = calculateSaleTotal(updates.items);
        const ledgerIndex = updatedLedger.findIndex(e => 
          e.referenceId === id && e.transactionType === 'sale'
        );
        
        if (ledgerIndex !== -1) {
          updatedLedger[ledgerIndex] = {
            ...updatedLedger[ledgerIndex],
            debit: newTotal,
            description: `Sale Invoice #${oldSale.orderId} (Updated)`,
            updatedAt: new Date()
          };
          
          // Recalculate balances for this customer
          updatedLedger = recalculateBalances(updatedLedger, oldSale.customerId);
        }
      }

      // Update inventory movements if items or status changed
      let updatedMovements = [...movements];
      if (updates.items || updates.status) {
        // Remove old movements for this sale
        updatedMovements = updatedMovements.filter(m => m.referenceId !== id);
        
        // Create new movements for updated items
        const now = new Date();
        const finalStatus = updates.status || oldSale.status;
        const finalItems = updates.items || oldSale.items;
        
        for (const item of finalItems) {
          const product = updatedProducts.find(p => p.id === item.productId);
          if (product) {
            // Find the original quantity for this product before this update
            const originalProduct = products.find(p => p.id === item.productId);
            const previousQty = originalProduct ? originalProduct.quantityOnHand : product.quantityOnHand;
            
            const movement: InventoryMovement = {
              id: generateId(),
              productId: item.productId,
              productName: item.productName,
              movementType: 'sales',
              quantity: -item.quantity, // Negative for sales
              previousQuantity: previousQty,
              newQuantity: finalStatus === 'completed' 
                ? previousQty - item.quantity  // For completed sales, show actual reduction
                : previousQty, // For pending/processing, on-hand doesn't change
              reference: `Sale: ${oldSale.orderId}${updates.items || updates.status ? ' (Updated)' : ''}`,
              referenceId: id,
              notes: `${finalStatus === 'completed' ? 'Delivered to' : 'Booked for'} ${oldSale.customerName}`,
              date: oldSale.date,
              createdAt: now,
              updatedAt: now
            };
            updatedMovements.push(movement);
          }
        }
      }

      saveAllData(updatedSales, updatedProducts, updatedCustomers, updatedMovements, updatedLedger);
      return { success: true };
    } catch (error) {
      console.error('Error updating sale:', error);
      return { success: false, errors: ['Failed to update sale'] };
    }
  }, [sales, products, customers, movements, ledgerEntries]);

  // Delete a sale
  const deleteSale = useCallback((id: string): { success: boolean; warning?: string } => {
    try {
      const sale = sales.find(s => s.id === id);
      if (!sale) {
        return { success: false };
      }

      // Reverse inventory changes based on sale status
      const updatedProducts = products.map(product => {
        const saleItem = sale.items.find(item => item.productId === product.id);
        if (saleItem) {
          if (sale.status === 'completed') {
            // For completed sales, restore the on-hand quantity
            return {
              ...product,
              quantityOnHand: product.quantityOnHand + saleItem.quantity,
              availableQuantity: (product.quantityOnHand + saleItem.quantity) - (product.quantityBooked || 0),
              status: (product.quantityOnHand + saleItem.quantity) > product.reorderLevel ? 'in-stock' : 'low-stock',
              updatedAt: new Date()
            };
          } else {
            // For pending/processing sales, only reverse the booking
            return {
              ...product,
              quantityBooked: Math.max(0, (product.quantityBooked || 0) - saleItem.quantity),
              availableQuantity: product.quantityOnHand - Math.max(0, (product.quantityBooked || 0) - saleItem.quantity),
              updatedAt: new Date()
            };
          }
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
      
      // Remove ledger entry related to this sale
      let updatedLedger = ledgerEntries.filter(e => 
        !(e.referenceId === id && e.transactionType === 'sale')
      );
      
      // Recalculate balances for this customer
      updatedLedger = recalculateBalances(updatedLedger, sale.customerId);
      
      // Delete booked stock records for this sale (if any)
      if (sale.status === 'pending' || sale.status === 'processing') {
        const saleBookings = getBookedStockBySale(id);
        saleBookings.forEach(booking => {
          deleteBookedStock(booking.id);
        });
      }
      
      saveAllData(updatedSales, updatedProducts, updatedCustomers, updatedMovements, updatedLedger);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting sale:', error);
      return { success: false };
    }
  }, [sales, products, customers, movements, ledgerEntries]);

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
    refreshData: loadData,
    bookedStock,
    getBookedStockBySale
  };
};