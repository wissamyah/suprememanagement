// Direct GitHub loadings hook - no localStorage dependency
import { useCallback, useEffect, useRef } from 'react';
import { useGitHubData } from './useGitHubData';
import type { Loading, Product, Customer, InventoryMovement, BookedStock } from '../types';
import { generateId } from '../utils/storage';
import { githubDataManager } from '../services/githubDataManager';
import { fixDuplicateLoadingIds, hasDuplicateLoadingIds } from '../utils/fixDuplicateLoadingIds';

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
  const hasCheckedDuplicates = useRef(false);

  // Check and fix duplicate loading IDs on initial load
  useEffect(() => {
    if (!loading && loadings.length > 0 && !hasCheckedDuplicates.current) {
      hasCheckedDuplicates.current = true;

      if (hasDuplicateLoadingIds(loadings)) {
        console.log('🔍 Duplicate loading IDs detected. Fixing...');
        const fixedLoadings = fixDuplicateLoadingIds(loadings);

        // Update the loadings with fixed IDs
        updateLoadings(fixedLoadings).then(() => {
          console.log('✅ Successfully fixed duplicate loading IDs');
        }).catch(error => {
          console.error('❌ Error fixing duplicate loading IDs:', error);
        });
      }
    }
  }, [loading, loadings, updateLoadings]);
  
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

      // Find the highest existing loading number to ensure uniqueness
      let maxLoadingNumber = 0;
      loadings.forEach(loading => {
        const match = loading.loadingId.match(/^LD(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxLoadingNumber) {
            maxLoadingNumber = num;
          }
        }
      });
      const loadingNumber = `LD${String(maxLoadingNumber + 1).padStart(6, '0')}`;

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
      const existingLoading = loadings.find(l => l.id === id);
      if (!existingLoading) {
        return { success: false, error: 'Loading not found' };
      }
      
      // If items are being updated, handle booked stock adjustments
      if (updates.items) {
        const updatedProductsList = [...products];
        const updatedBookedStockList = [...bookedStock];
        const newMovements: InventoryMovement[] = [];
        
        // Step 1: Revert old loading quantities (add back to booked stock)
        existingLoading.items.forEach(oldItem => {
          if (oldItem.bookedStockId) {
            const bookedIndex = updatedBookedStockList.findIndex(
              b => b.id === oldItem.bookedStockId
            );
            if (bookedIndex !== -1) {
              const booking = updatedBookedStockList[bookedIndex];
              // Reduce loaded quantity (reverting the old loading)
              const revertedQuantityLoaded = Math.max(0, booking.quantityLoaded - oldItem.quantity);
              updatedBookedStockList[bookedIndex] = {
                ...booking,
                quantityLoaded: revertedQuantityLoaded,
                status: revertedQuantityLoaded === 0 ? 'pending' : 
                        revertedQuantityLoaded >= booking.quantity ? 'fully-loaded' : 'partial-loaded',
                updatedAt: now
              };
            }
            
            // Revert product booked quantity (add back since we're reverting the loading)
            const productIndex = updatedProductsList.findIndex(p => p.id === oldItem.productId);
            if (productIndex !== -1) {
              const product = updatedProductsList[productIndex];
              updatedProductsList[productIndex] = {
                ...product,
                quantityOnHand: product.quantityOnHand + oldItem.quantity,
                quantityBooked: (product.quantityBooked || 0) + oldItem.quantity,
                availableQuantity: (product.quantityOnHand + oldItem.quantity) - 
                  ((product.quantityBooked || 0) + oldItem.quantity),
                updatedAt: now
              };
            }
          }
        });
        
        // Step 2: Apply new loading quantities (subtract from booked stock)
        updates.items.forEach(newItem => {
          if (newItem.bookedStockId) {
            const bookedIndex = updatedBookedStockList.findIndex(
              b => b.id === newItem.bookedStockId
            );
            if (bookedIndex !== -1) {
              const booking = updatedBookedStockList[bookedIndex];
              // Increase loaded quantity (applying the new loading)
              const newQuantityLoaded = booking.quantityLoaded + newItem.quantity;
              const isFullyLoaded = newQuantityLoaded >= booking.quantity;
              
              updatedBookedStockList[bookedIndex] = {
                ...booking,
                quantityLoaded: newQuantityLoaded,
                status: isFullyLoaded ? 'fully-loaded' : 'partial-loaded',
                updatedAt: now
              };
            }
            
            // Update product quantities (subtract for the new loading)
            const productIndex = updatedProductsList.findIndex(p => p.id === newItem.productId);
            if (productIndex !== -1) {
              const product = updatedProductsList[productIndex];
              updatedProductsList[productIndex] = {
                ...product,
                quantityOnHand: product.quantityOnHand - newItem.quantity,
                quantityBooked: Math.max(0, (product.quantityBooked || 0) - newItem.quantity),
                availableQuantity: (product.quantityOnHand - newItem.quantity) - 
                  Math.max(0, (product.quantityBooked || 0) - newItem.quantity),
                updatedAt: now
              };
              
              // Create movement for the edit
              const movement: InventoryMovement = {
                id: generateId(),
                productId: newItem.productId,
                productName: newItem.productName,
                movementType: 'loading',
                quantity: newItem.quantity - (existingLoading.items.find(i => i.productId === newItem.productId)?.quantity || 0),
                previousQuantity: product.quantityOnHand,
                newQuantity: product.quantityOnHand - newItem.quantity,
                reference: `Loading Edit: ${existingLoading.loadingId}`,
                referenceId: existingLoading.id,
                notes: `Updated loading for ${existingLoading.customerName}`,
                date: new Date(updates.date || existingLoading.date),
                createdAt: now,
                updatedAt: now
              };
              if (movement.quantity !== 0) {
                newMovements.push(movement);
              }
            }
          }
        });
        
        // Update all data
        githubDataManager.startBatchUpdate();
        
        const batchUpdates = [
          updateProducts(updatedProductsList),
          updateBookedStock(updatedBookedStockList)
        ];
        
        if (newMovements.length > 0) {
          batchUpdates.push(updateMovements([...movements, ...newMovements]));
        }
        
        Promise.all(batchUpdates).then(() => {
          githubDataManager.endBatchUpdate();
        }).catch(error => {
          console.error('Error in batch update:', error);
          githubDataManager.endBatchUpdate();
        });
      }
      
      // Update the loading itself
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
  }, [loadings, products, bookedStock, movements, updateLoadings, updateProducts, updateBookedStock, updateMovements]);
  
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
      if (booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'partial-loaded') {
        customersWithBookings.add(booking.customerId);
      }
    });
    
    return customers.filter(c => customersWithBookings.has(c.id));
  }, [customers, bookedStock]);
  
  // Get customer booked products with additional fields for loading modal
  const getCustomerBookedProducts = useCallback((customerId: string) => {
    return bookedStock
      .filter(booking => 
        booking.customerId === customerId && (booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'partial-loaded')
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
  
  // Manual fix for duplicate IDs
  const fixDuplicateIds = useCallback((): Promise<boolean> => {
    if (hasDuplicateLoadingIds(loadings)) {
      console.log('🔍 Fixing duplicate loading IDs manually...');
      const fixedLoadings = fixDuplicateLoadingIds(loadings);
      return updateLoadings(fixedLoadings)
        .then(() => {
          console.log('✅ Successfully fixed duplicate loading IDs');
          return true;
        })
        .catch(error => {
          console.error('❌ Error fixing duplicate loading IDs:', error);
          return false;
        });
    }
    return Promise.resolve(false);
  }, [loadings, updateLoadings]);

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
    fixDuplicateIds,

    // Sync operations
    forceSync,
    refreshData: refresh
  };
};