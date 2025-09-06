import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import type { Loading, Product, Customer, InventoryMovement, Sale } from '../types';
import { storage, generateId } from '../utils/storage';
import { GitHubContext } from '../App';
import githubStorage from '../services/githubStorage';
import { globalSyncManager } from '../services/globalSyncManager';
import { useBookedStockWithGitHub } from './useBookedStockWithGitHub';

const LOADINGS_KEY = 'loadings';
const PRODUCTS_KEY = 'products';
const CUSTOMERS_KEY = 'customers';
const MOVEMENTS_KEY = 'inventory_movements';
const SALES_KEY = 'sales';

export const useLoadingsWithGitHub = () => {
  const [loadings, setLoadings] = useState<Loading[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncPending, setSyncPending] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const { isAuthenticated } = useContext(GitHubContext);
  const mountedRef = useRef(true);
  const isInitialLoad = useRef(true);
  
  // Integrate booked stock management
  const {
    bookedStock,
    updateLoadingStatus
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
          // Set loadings data from GitHub
          setLoadings(githubData.loadings || []);
          setProducts(githubData.products || []);
          setCustomers(githubData.customers || []);
          setMovements(githubData.movements || []);
          setSales(githubData.sales || []);
          
          // Update localStorage with GitHub data as backup
          storage.set(LOADINGS_KEY, githubData.loadings || []);
          storage.set(PRODUCTS_KEY, githubData.products || []);
          storage.set(CUSTOMERS_KEY, githubData.customers || []);
          storage.set(MOVEMENTS_KEY, githubData.movements || []);
          storage.set(SALES_KEY, githubData.sales || []);
        }
      } else {
        // Load from localStorage
        const storedLoadings = storage.get<Loading[]>(LOADINGS_KEY) || [];
        const storedProducts = storage.get<Product[]>(PRODUCTS_KEY) || [];
        const storedCustomers = storage.get<Customer[]>(CUSTOMERS_KEY) || [];
        const storedMovements = storage.get<InventoryMovement[]>(MOVEMENTS_KEY) || [];
        const storedSales = storage.get<Sale[]>(SALES_KEY) || [];
        setLoadings(storedLoadings);
        setProducts(storedProducts);
        setCustomers(storedCustomers);
        setMovements(storedMovements);
        setSales(storedSales);
      }
    } catch (error) {
      console.error('Error loading loadings data:', error);
      // Fallback to localStorage on error
      const storedLoadings = storage.get<Loading[]>(LOADINGS_KEY) || [];
      const storedProducts = storage.get<Product[]>(PRODUCTS_KEY) || [];
      const storedCustomers = storage.get<Customer[]>(CUSTOMERS_KEY) || [];
      const storedMovements = storage.get<InventoryMovement[]>(MOVEMENTS_KEY) || [];
      const storedSales = storage.get<Sale[]>(SALES_KEY) || [];
      setLoadings(storedLoadings);
      setProducts(storedProducts);
      setCustomers(storedCustomers);
      setMovements(storedMovements);
      setSales(storedSales);
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
      
      if (e.key === `supreme_mgmt_${LOADINGS_KEY}` && e.newValue) {
        try {
          const newData = JSON.parse(e.newValue);
          setLoadings(newData);
        } catch (error) {
          console.error('Error parsing loadings from storage event:', error);
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
      if (e.key === `supreme_mgmt_${SALES_KEY}` && e.newValue) {
        try {
          const newData = JSON.parse(e.newValue);
          setSales(newData);
        } catch (error) {
          console.error('Error parsing sales from storage event:', error);
        }
      }
      // Listen for booked stock changes
      if (e.key === 'suprememanagement_bookedStock' && e.newValue) {
        try {
          // Trigger a refresh of the booked stock data
          // The useBookedStockWithGitHub hook handles its own state, we just need to trigger re-render
          window.dispatchEvent(new Event('bookedStockUpdated'));
        } catch (error) {
          console.error('Error handling booked stock storage event:', error);
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
  }, [loadings, isAuthenticated, loading]);

  const saveAllData = (newLoadings: Loading[], newProducts: Product[], newMovements: InventoryMovement[], newSales?: Sale[]) => {
    // Save to local state immediately (optimistic update)
    setLoadings(newLoadings);
    setProducts(newProducts);
    setMovements(newMovements);
    if (newSales) {
      setSales(newSales);
    }
    
    // Save to localStorage
    storage.set(LOADINGS_KEY, newLoadings);
    storage.set(PRODUCTS_KEY, newProducts);
    storage.set(MOVEMENTS_KEY, newMovements);
    if (newSales) {
      storage.set(SALES_KEY, newSales);
    }
    
    // Trigger storage events for other components to react
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'supreme_mgmt_loadings',
      newValue: JSON.stringify(newLoadings),
      url: window.location.href
    }));
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'supreme_mgmt_products',
      newValue: JSON.stringify(newProducts),
      url: window.location.href
    }));
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'supreme_mgmt_inventory_movements',
      newValue: JSON.stringify(newMovements),
      url: window.location.href
    }));
    
    if (newSales) {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'supreme_mgmt_sales',
        newValue: JSON.stringify(newSales),
        url: window.location.href
      }));
    }
    
    // Mark for sync
    if (isAuthenticated) {
      globalSyncManager.markAsChanged();
    }
  };

  // Check if a sale is fully loaded and update its status
  const checkAndUpdateSaleStatus = useCallback((saleId: string): Sale[] => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale || sale.status === 'completed') {
      return sales; // No update needed
    }
    
    // Get all booked stock for this sale
    const saleBookings = bookedStock.filter(b => b.saleId === saleId);
    
    // Check if all bookings are fully loaded
    const allFullyLoaded = saleBookings.length > 0 && 
      saleBookings.every(b => b.status === 'fully-loaded' && b.quantityLoaded >= b.quantity);
    
    if (allFullyLoaded) {
      // Update sale status to completed
      const updatedSales = sales.map(s => {
        if (s.id === saleId) {
          return {
            ...s,
            status: 'completed' as const,
            updatedAt: new Date()
          };
        }
        return s;
      });
      return updatedSales;
    }
    
    return sales;
  }, [sales, bookedStock]);
  
  // Generate loading ID
  const generateLoadingId = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = loadings.filter(l => l.loadingId.startsWith(`LD-${year}-${month}`)).length + 1;
    return `LD-${year}-${month}-${String(count).padStart(3, '0')}`;
  };

  // Add loading
  const addLoading = useCallback((
    date: string,
    customerId: string,
    truckPlateNumber: string,
    wayBillNumber: string | undefined,
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      bookedStockId: string;
    }>
  ) => {
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }

      // Calculate total value
      const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

      const newLoading: Loading = {
        id: generateId(),
        loadingId: generateLoadingId(),
        date,
        customerId,
        customerName: customer.name,
        truckPlateNumber,
        wayBillNumber,
        items,
        totalValue,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updatedLoadings = [...loadings, newLoading];
      const updatedProducts = [...products];
      const updatedMovements = [...movements];

      // Update booked stock and inventory for each item
      for (const item of items) {
        // Update booked stock
        const booking = bookedStock.find(b => b.id === item.bookedStockId);
        const remainingToLoad = booking ? booking.quantity - booking.quantityLoaded : 0;
        const loadedQuantity = Math.min(item.quantity, remainingToLoad);
        const totalLoaded = booking ? booking.quantityLoaded + loadedQuantity : loadedQuantity;
        const status = booking && totalLoaded >= booking.quantity ? 'fully-loaded' : 'partial-loaded';
        
        console.log('[AddLoading] Updating booked stock:', {
          bookedStockId: item.bookedStockId,
          productName: item.productName,
          bookingQuantity: booking?.quantity,
          previouslyLoaded: booking?.quantityLoaded,
          nowLoading: loadedQuantity,
          totalLoaded,
          status
        });
        
        const bookingResult = updateLoadingStatus(
          item.bookedStockId,
          totalLoaded,
          status
        );
        
        if (!bookingResult.success) {
          console.error('Failed to update booked stock:', bookingResult.error);
        }

        // Update product inventory - IMPORTANT: Use loadedQuantity, not item.quantity
        const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) {
          const product = updatedProducts[productIndex];
          const previousQuantity = product.quantityOnHand;
          // FIX: Use loadedQuantity instead of item.quantity for partial loading
          const newQuantity = previousQuantity - loadedQuantity;
          
          console.log('[AddLoading] Updating product inventory:', {
            productId: item.productId,
            productName: item.productName,
            previousOnHand: previousQuantity,
            actualLoadedQuantity: loadedQuantity,  // Changed from item.quantity
            newOnHand: newQuantity
          });
          
          // Update product quantities
          // Note: Don't update quantityBooked or availableQuantity here as they are calculated from booked stock records
          updatedProducts[productIndex] = {
            ...product,
            quantityOnHand: newQuantity,
            status: newQuantity <= 0 ? 'out-of-stock' : 
                   newQuantity <= product.reorderLevel ? 'low-stock' : 'in-stock',
            updatedAt: new Date()
          };

          // Create inventory movement record - FIX: Use loadedQuantity
          const movement: InventoryMovement = {
            id: generateId(),
            productId: item.productId,
            productName: item.productName,
            movementType: 'loading',
            quantity: -loadedQuantity,  // FIX: Use loadedQuantity instead of item.quantity
            previousQuantity,
            newQuantity,
            reference: `Loading ${newLoading.loadingId}`,
            referenceId: newLoading.id,
            notes: `Loading for customer: ${customer.name}`,
            date: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          updatedMovements.push(movement);
        }
      }

      // Check if any sales should be marked as completed
      const salesToCheck = new Set<string>();
      for (const item of items) {
        const booking = bookedStock.find(b => b.id === item.bookedStockId);
        if (booking) {
          salesToCheck.add(booking.saleId);
        }
      }
      
      let updatedSales = sales;
      for (const saleId of salesToCheck) {
        updatedSales = checkAndUpdateSaleStatus(saleId);
      }
      
      saveAllData(updatedLoadings, updatedProducts, updatedMovements, updatedSales !== sales ? updatedSales : undefined);
      return { success: true, data: newLoading };
    } catch (error: any) {
      console.error('Error adding loading:', error);
      return { success: false, error: error.message };
    }
  }, [loadings, customers, products, movements, bookedStock, updateLoadingStatus, checkAndUpdateSaleStatus, sales]);

  // Update loading
  const updateLoading = useCallback((
    id: string,
    updates: Partial<Omit<Loading, 'id' | 'loadingId' | 'createdAt' | 'updatedAt'>>
  ) => {
    try {
      const existingLoading = loadings.find(l => l.id === id);
      if (!existingLoading) {
        return { success: false, error: 'Loading not found' };
      }

      const updatedLoadings = [...loadings];
      const updatedProducts = [...products];
      const updatedMovements = [...movements];

      // First, revert the previous loading's impact
      for (const item of existingLoading.items) {
        // Revert booked stock
        updateLoadingStatus(
          item.bookedStockId,
          0,
          'confirmed'
        );
        
        // Revert product inventory
        const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) {
          const product = updatedProducts[productIndex];
          const revertedQuantity = product.quantityOnHand + item.quantity;
          updatedProducts[productIndex] = {
            ...product,
            quantityOnHand: revertedQuantity,
            status: revertedQuantity > product.reorderLevel ? 'in-stock' :
                   revertedQuantity > 0 ? 'low-stock' : 'out-of-stock',
            updatedAt: new Date()
          };
        }
      }

      // Apply new loading quantities if items are updated
      if (updates.items) {
        for (const item of updates.items) {
          // Update booked stock
          const booking = bookedStock.find(b => b.id === item.bookedStockId);
          const previousBookingLoaded = booking ? booking.quantityLoaded : 0;
          const remainingToLoad = booking ? booking.quantity - previousBookingLoaded : 0;
          const loadedQuantity = Math.min(item.quantity, remainingToLoad);
          const totalLoaded = previousBookingLoaded + loadedQuantity;
          const status = booking && totalLoaded >= booking.quantity ? 'fully-loaded' : 'partial-loaded';
          
          updateLoadingStatus(
            item.bookedStockId,
            totalLoaded,
            status
          );
          
          // Update product inventory - FIX: Use actual loaded quantity
          const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
          if (productIndex !== -1) {
            const product = updatedProducts[productIndex];
            const previousQuantity = product.quantityOnHand;
            // FIX: Use loadedQuantity instead of item.quantity
            const newQuantity = previousQuantity - loadedQuantity;
            
            // Note: Don't update quantityBooked or availableQuantity here as they are calculated from booked stock records
            updatedProducts[productIndex] = {
              ...product,
              quantityOnHand: newQuantity,
              status: newQuantity <= 0 ? 'out-of-stock' : 
                     newQuantity <= product.reorderLevel ? 'low-stock' : 'in-stock',
              updatedAt: new Date()
            };

            // Create inventory movement record - FIX: Use loadedQuantity
            const movement: InventoryMovement = {
              id: generateId(),
              productId: item.productId,
              productName: item.productName,
              movementType: 'adjustment',
              quantity: -loadedQuantity,  // FIX: Use loadedQuantity instead of item.quantity
              previousQuantity,
              newQuantity,
              reference: `Loading Update ${existingLoading.loadingId}`,
              referenceId: existingLoading.id,
              notes: `Updated loading for customer: ${existingLoading.customerName}`,
              date: new Date(),
              createdAt: new Date(),
              updatedAt: new Date()
            };
            updatedMovements.push(movement);
          }
        }
      }

      // Calculate new total value if items updated
      const totalValue = updates.items 
        ? updates.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
        : existingLoading.totalValue;

      // Update the loading
      const loadingIndex = updatedLoadings.findIndex(l => l.id === id);
      updatedLoadings[loadingIndex] = {
        ...existingLoading,
        ...updates,
        totalValue,
        updatedAt: new Date().toISOString()
      };

      // Check if any sales should be marked as completed
      const salesToCheck = new Set<string>();
      if (updates.items) {
        for (const item of updates.items) {
          const booking = bookedStock.find(b => b.id === item.bookedStockId);
          if (booking) {
            salesToCheck.add(booking.saleId);
          }
        }
      }
      
      let updatedSales = sales;
      for (const saleId of salesToCheck) {
        updatedSales = checkAndUpdateSaleStatus(saleId);
      }
      
      saveAllData(updatedLoadings, updatedProducts, updatedMovements, updatedSales !== sales ? updatedSales : undefined);
      return { success: true };
    } catch (error: any) {
      console.error('Error updating loading:', error);
      return { success: false, error: error.message };
    }
  }, [loadings, products, movements, bookedStock, updateLoadingStatus, checkAndUpdateSaleStatus, sales]);

  // Delete loading
  const deleteLoading = useCallback((loadingId: string) => {
    try {
      const loading = loadings.find(l => l.id === loadingId);
      if (!loading) {
        return { success: false, error: 'Loading not found' };
      }

      const updatedLoadings = loadings.filter(l => l.id !== loadingId);
      const updatedProducts = [...products];
      const updatedMovements = [...movements];

      // Restore booked stock and inventory for each item
      for (const item of loading.items) {
        // Restore booked stock
        updateLoadingStatus(
          item.bookedStockId,
          0,
          'confirmed'
        );
        
        // Restore product inventory
        const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) {
          const product = updatedProducts[productIndex];
          const previousQuantity = product.quantityOnHand;
          const newQuantity = previousQuantity + item.quantity;
          
          // Note: Don't update quantityBooked or availableQuantity here as they are calculated from booked stock records
          updatedProducts[productIndex] = {
            ...product,
            quantityOnHand: newQuantity,
            status: newQuantity > product.reorderLevel ? 'in-stock' :
                   newQuantity > 0 ? 'low-stock' : 'out-of-stock',
            updatedAt: new Date()
          };

          // Create inventory movement record
          const movement: InventoryMovement = {
            id: generateId(),
            productId: item.productId,
            productName: item.productName,
            movementType: 'return',
            quantity: item.quantity,
            previousQuantity,
            newQuantity,
            reference: `Loading Deleted ${loading.loadingId}`,
            referenceId: loading.id,
            notes: `Loading deleted for customer: ${loading.customerName}`,
            date: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          updatedMovements.push(movement);
        }
      }

      saveAllData(updatedLoadings, updatedProducts, updatedMovements);
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting loading:', error);
      return { success: false, error: error.message };
    }
  }, [loadings, products, movements, updateLoadingStatus]);

  // Get customers with booked stock
  const getCustomersWithBookedStock = useCallback(() => {
    const customersWithBookings = new Set<string>();
    bookedStock
      .filter(booking => ['confirmed', 'partial-loaded'].includes(booking.status))
      .forEach(booking => customersWithBookings.add(booking.customerId));
    
    return customers.filter(customer => customersWithBookings.has(customer.id));
  }, [customers, bookedStock]);

  // Get booked products for a customer with available quantities and pricing
  const getCustomerBookedProducts = useCallback((customerId: string) => {
    return bookedStock
      .filter(booking => 
        booking.customerId === customerId && 
        ['confirmed', 'partial-loaded'].includes(booking.status) &&
        booking.quantity > booking.quantityLoaded
      )
      .map(booking => {
        // Find the sale to get the unit price
        const sale = sales.find(s => s.id === booking.saleId);
        const saleItem = sale?.items.find(item => item.productId === booking.productId);
        const unitPrice = saleItem?.price || 0;
        
        return {
          ...booking,
          availableQuantity: booking.quantity - booking.quantityLoaded,
          unitPrice
        };
      });
  }, [bookedStock, sales]);

  // Force sync
  const forceSync = useCallback(async () => {
    if (!syncPending && isAuthenticated) {
      await globalSyncManager.forceSync();
    }
  }, [syncPending, isAuthenticated]);

  // Refresh data from GitHub
  const refreshData = useCallback(async () => {
    await loadData();
  }, []);

  // Get statistics
  const getStatistics = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysLoadings = loadings.filter(l => l.date === today);
    const totalValue = loadings.reduce((sum, l) => sum + l.totalValue, 0);
    const todaysValue = todaysLoadings.reduce((sum, l) => sum + l.totalValue, 0);
    
    return {
      totalLoadings: loadings.length,
      todaysLoadings: todaysLoadings.length,
      totalValue,
      todaysValue,
      averageValue: loadings.length > 0 ? totalValue / loadings.length : 0
    };
  }, [loadings]);

  return {
    loadings,
    products,
    customers,
    movements,
    bookedStock,
    loading,
    syncPending,
    pendingChanges,
    lastSyncError,
    addLoading,
    updateLoading,
    deleteLoading,
    getCustomersWithBookedStock,
    getCustomerBookedProducts,
    getStatistics,
    forceSync,
    refreshData
  };
};