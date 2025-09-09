// Direct GitHub loadings hook - no localStorage dependency
import { useCallback } from 'react';
import { useGitHubData } from './useGitHubData';
import type { Loading, Product, Customer, InventoryMovement, BookedStock } from '../types';
import { generateId } from '../utils/storage';
import { githubDataManager } from '../services/githubDataManager';

export const useLoadingsDirect = () => {
  // Use the base hook for each data type
  const {
    data: loadings,
    loading: loadingsLoading,
    error: loadingsError,
    updateData: updateLoadings,
    isOnline,
    isSyncing,
    offlineQueueSize,
    refresh,
    forceSync
  } = useGitHubData<Loading>({ dataType: 'loadings', immediate: true });
  
  const {
    data: products,
    updateData: updateProducts
  } = useGitHubData<Product>({ dataType: 'products', immediate: true });
  
  const {
    data: customers
  } = useGitHubData<Customer>({ dataType: 'customers', immediate: true });
  
  const {
    data: movements,
    updateData: updateMovements
  } = useGitHubData<InventoryMovement>({ dataType: 'movements', immediate: true });
  
  const {
    data: bookedStock,
    updateData: updateBookedStock
  } = useGitHubData<BookedStock>({ dataType: 'bookedStock', immediate: true });
  
  const {
    data: sales
  } = useGitHubData<import('../types').Sale>({ dataType: 'sales', immediate: true });
  
  const loading = loadingsLoading;
  const error = loadingsError;
  
  // Add loading
  const addLoading = useCallback((
    customerId: string,
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      bookedStockId: string;
      saleId?: string;
      orderId?: string;
    }>,
    vehicleNumber: string,
    _driverName: string,
    notes?: string,
    date: string = new Date().toISOString()
  ): { success: boolean; loading?: Loading; error?: string } => {
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }
      
      const now = new Date();
      const loadingNumber = `LD${String(loadings.length + 1).padStart(6, '0')}`;
      
      // Calculate total value
      const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      
      const newLoading: Loading = {
        id: generateId(),
        loadingId: loadingNumber,
        customerId,
        customerName: customer.name,
        truckPlateNumber: vehicleNumber,
        wayBillNumber: notes,
        items: items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          bookedStockId: item.bookedStockId
        })),
        totalValue,
        date,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
      
      // Create movements for each item
      const newMovements: InventoryMovement[] = [];
      const updatedProductsList = [...products];
      const updatedBookedStockList = [...bookedStock];
      
      items.forEach(item => {
        const productIndex = updatedProductsList.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) {
          const product = updatedProductsList[productIndex];
          
          // Create movement for loading (actual stock reduction)
          const movement: InventoryMovement = {
            id: generateId(),
            productId: item.productId,
            productName: item.productName,
            movementType: 'loading',
            quantity: -item.quantity, // Negative because it removes stock
            previousQuantity: product.quantityOnHand,
            newQuantity: product.quantityOnHand - item.quantity,
            reference: `Loading: ${loadingNumber}`,
            referenceId: newLoading.id,
            notes: `Loaded for ${customer.name}`,
            date: new Date(date),
            createdAt: now,
            updatedAt: now
          };
          newMovements.push(movement);
          
          // Update product on-hand quantity (actual reduction)
          updatedProductsList[productIndex] = {
            ...product,
            quantityOnHand: product.quantityOnHand - item.quantity,
            updatedAt: now
          };
          
          // Update booked stock status and loaded quantity
          if (item.bookedStockId) {
            const bookedIndex = updatedBookedStockList.findIndex(
              b => b.id === item.bookedStockId
            );
            if (bookedIndex !== -1) {
              const booking = updatedBookedStockList[bookedIndex];
              const newQuantityLoaded = booking.quantityLoaded + item.quantity;
              const isFullyLoaded = newQuantityLoaded >= booking.quantity;
              
              updatedBookedStockList[bookedIndex] = {
                ...booking,
                quantityLoaded: newQuantityLoaded,
                status: isFullyLoaded ? 'fully-loaded' : 'partial-loaded',
                updatedAt: now
              };
              
              // Update product booked quantity (reduce since it's now loaded)
              updatedProductsList[productIndex] = {
                ...updatedProductsList[productIndex],
                quantityBooked: Math.max(0, (product.quantityBooked || 0) - item.quantity),
                availableQuantity: (product.quantityOnHand - item.quantity) - 
                  Math.max(0, (product.quantityBooked || 0) - item.quantity)
              };
            }
          }
        }
      });
      
      // Start batch update to avoid conflicts
      githubDataManager.startBatchUpdate();
      
      // Fire and forget - update all in background
      const updates = [
        updateLoadings([...loadings, newLoading]),
        updateMovements([...movements, ...newMovements]),
        updateProducts(updatedProductsList)
      ];
      
      if (items.some(item => item.bookedStockId)) {
        updates.push(updateBookedStock(updatedBookedStockList));
      }
      
      Promise.all(updates).then(() => {
        githubDataManager.endBatchUpdate();
      }).catch(error => {
        console.error('Error in batch update:', error);
        githubDataManager.endBatchUpdate();
      });
      
      return { success: true, loading: newLoading };
    } catch (error) {
      console.error('Error adding loading:', error);
      return { success: false, error: 'Failed to add loading' };
    }
  }, [loadings, products, customers, movements, bookedStock,
      updateLoadings, updateMovements, updateProducts, updateBookedStock]);
  
  // Update loading
  const updateLoading = useCallback((
    id: string,
    updates: Partial<Loading>
  ): { success: boolean; error?: string } => {
    try {
      const now = new Date();
      const updatedLoadingsList = loadings.map(loading => {
        if (loading.id === id) {
          return {
            ...loading,
            ...updates,
            updatedAt: now.toISOString()
          };
        }
        return loading;
      });
      
      // Fire and forget
      updateLoadings(updatedLoadingsList).catch(console.error);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating loading:', error);
      return { success: false, error: 'Failed to update loading' };
    }
  }, [loadings, updateLoadings]);
  
  // Delete loading
  const deleteLoading = useCallback((id: string): { success: boolean; error?: string } => {
    try {
      const loadingToDelete = loadings.find(l => l.id === id);
      if (!loadingToDelete) {
        return { success: false, error: 'Loading not found' };
      }
      
      // Revert product quantities and booked stock
      const updatedProductsList = [...products];
      const updatedBookedStockList = [...bookedStock];
      
      loadingToDelete.items.forEach(item => {
        // Revert product quantities
        const productIndex = updatedProductsList.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) {
          const product = updatedProductsList[productIndex];
          updatedProductsList[productIndex] = {
            ...product,
            quantityOnHand: product.quantityOnHand + item.quantity,
            quantityBooked: (product.quantityBooked || 0) + item.quantity,
            availableQuantity: product.quantityOnHand + item.quantity - ((product.quantityBooked || 0) + item.quantity),
            updatedAt: new Date()
          };
        }
        
        // Revert booked stock
        if (item.bookedStockId) {
          const bookedIndex = updatedBookedStockList.findIndex(b => b.id === item.bookedStockId);
          if (bookedIndex !== -1) {
            const booking = updatedBookedStockList[bookedIndex];
            const newQuantityLoaded = Math.max(0, booking.quantityLoaded - item.quantity);
            updatedBookedStockList[bookedIndex] = {
              ...booking,
              quantityLoaded: newQuantityLoaded,
              status: newQuantityLoaded === 0 ? 'pending' : 'partial-loaded',
              updatedAt: new Date()
            };
          }
        }
      });
      
      // Remove loading
      const updatedLoadingsList = loadings.filter(l => l.id !== id);
      
      // Remove related movements
      const updatedMovementsList = movements.filter(m => m.referenceId !== id);
      
      // Fire and forget - update all
      updateLoadings(updatedLoadingsList).catch(console.error);
      updateMovements(updatedMovementsList).catch(console.error);
      updateProducts(updatedProductsList).catch(console.error);
      if (loadingToDelete.items.some(item => item.bookedStockId)) {
        updateBookedStock(updatedBookedStockList).catch(console.error);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting loading:', error);
      return { success: false, error: 'Failed to delete loading' };
    }
  }, [loadings, movements, products, bookedStock, updateLoadings, updateMovements, updateProducts, updateBookedStock]);
  
  // Get loading by ID
  const getLoadingById = useCallback((id: string): Loading | undefined => {
    return loadings.find(l => l.id === id);
  }, [loadings]);
  
  // Get loadings by customer
  const getLoadingsByCustomer = useCallback((customerId: string): Loading[] => {
    return loadings.filter(l => l.customerId === customerId);
  }, [loadings]);
  
  // Complete loading
  const completeLoading = useCallback((id: string): { success: boolean; error?: string } => {
    try {
      const now = new Date();
      const updatedLoadingsList = loadings.map(loading => {
        if (loading.id === id) {
          return {
            ...loading,
            updatedAt: now.toISOString()
          };
        }
        return loading;
      });
      
      // Fire and forget
      updateLoadings(updatedLoadingsList).catch(console.error);
      
      return { success: true };
    } catch (error) {
      console.error('Error completing loading:', error);
      return { success: false, error: 'Failed to complete loading' };
    }
  }, [loadings, updateLoadings]);
  
  // Get customers with booked stock
  const getCustomersWithBookedStock = useCallback(() => {
    const customersWithBookings = new Set<string>();
    bookedStock.forEach(booking => {
      if (booking.status === 'pending' || booking.status === 'confirmed') {
        customersWithBookings.add(booking.customerId);
      }
    });
    
    return customers.filter(c => customersWithBookings.has(c.id));
  }, [customers, bookedStock]);
  
  // Get customer booked products with additional fields for loading modal
  const getCustomerBookedProducts = useCallback((customerId: string) => {
    return bookedStock
      .filter(booking => 
        booking.customerId === customerId && (booking.status === 'pending' || booking.status === 'confirmed')
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
  
  return {
    // Data
    loadings,
    products,
    customers,
    movements,
    bookedStock,
    
    // Status
    loading,
    error,
    isOnline,
    syncInProgress: isSyncing,
    pendingChanges: offlineQueueSize,
    lastSyncError: error,
    
    // Operations
    addLoading,
    updateLoading,
    deleteLoading,
    completeLoading,
    getLoadingById,
    getLoadingsByCustomer,
    getCustomersWithBookedStock,
    getCustomerBookedProducts,
    
    // Sync operations
    forceSync,
    refreshData: refresh
  };
};