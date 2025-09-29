// Direct GitHub sales hook - no localStorage dependency
import { useCallback } from 'react';
import { useGitHubData } from './useGitHubData';
import type { Sale, Product, Customer, InventoryMovement, LedgerEntry, BookedStock } from '../types';
import { generateId } from '../utils/storage';
import { generateOrderId } from '../utils/sales';
import { githubDataManager } from '../services/githubDataManager';

export const useSalesDirect = () => {
  // Use the base hook for each data type
  const {
    data: sales,
    loading: salesLoading,
    error: salesError,
    updateData: updateSales,
    isOnline,
    isSyncing,
    offlineQueueSize,
    refresh,
    forceSync
  } = useGitHubData<Sale>({ dataType: 'sales', immediate: true });
  
  const {
    data: products,
    updateData: updateProducts
  } = useGitHubData<Product>({ dataType: 'products', immediate: true });
  
  const {
    data: customers,
    updateData: updateCustomers
  } = useGitHubData<Customer>({ dataType: 'customers', immediate: true });
  
  const {
    data: movements,
    updateData: updateMovements
  } = useGitHubData<InventoryMovement>({ dataType: 'movements', immediate: true });
  
  const {
    data: ledgerEntries,
    updateData: updateLedgerEntries
  } = useGitHubData<LedgerEntry>({ dataType: 'ledgerEntries', immediate: true });
  
  const {
    data: bookedStock,
    updateData: updateBookedStock
  } = useGitHubData<BookedStock>({ dataType: 'bookedStock', immediate: true });
  
  const loading = salesLoading;
  const error = salesError;
  
  // Add sale
  const addSale = useCallback(async (
    customerId: string,
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unit: string;
      price: number;
      total: number;
    }>,
    date: Date = new Date(),
    paymentStatus: 'pending' | 'partial' | 'paid' = 'pending'
  ): Promise<{ success: boolean; sale?: Sale; error?: string }> => {
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }
      
      const now = new Date();
      const orderId = generateOrderId(sales);
      const total = items.reduce((sum, item) => sum + item.total, 0);
      
      const newSale: Sale = {
        id: generateId(),
        orderId,
        customerId,
        customerName: customer.name,
        items,
        totalAmount: total,
        paymentStatus,
        date,
        createdAt: now,
        updatedAt: now
      };
      
      // Create movements for each item
      const newMovements: InventoryMovement[] = [];
      const newBookedStock: BookedStock[] = [];
      const updatedProductsList = [...products];
      
      items.forEach(item => {
        const productIndex = updatedProductsList.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) {
          const product = updatedProductsList[productIndex];
          
          // Create movement (sales don't affect physical stock, only book it)
          const movement: InventoryMovement = {
            id: generateId(),
            productId: item.productId,
            productName: item.productName,
            movementType: 'sales',
            quantity: 0, // No physical stock change, only booking
            previousQuantity: product.quantityOnHand,
            newQuantity: product.quantityOnHand, // On-hand doesn't change until loading
            reference: `Sale: ${orderId}`,
            referenceId: newSale.id,
            notes: `Booked ${item.quantity} ${item.unit} for ${customer.name} (no physical stock change)`,
            date,
            createdAt: now,
            updatedAt: now
          };
          newMovements.push(movement);
          
          // Create booked stock entry with all required fields
          const bookedEntry = {
            id: generateId(),
            customerId,
            customerName: customer.name,
            saleId: newSale.id,
            orderId,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            quantityLoaded: 0, // Initially nothing is loaded
            unit: item.unit,
            bookingDate: now,
            status: 'pending' as const, // Match the type definition
            createdAt: now,
            updatedAt: now
          };
          newBookedStock.push(bookedEntry);
          
          // Update product booked quantity
          updatedProductsList[productIndex] = {
            ...product,
            quantityBooked: (product.quantityBooked || 0) + item.quantity,
            availableQuantity: product.quantityOnHand - ((product.quantityBooked || 0) + item.quantity),
            updatedAt: now
          };
        }
      });
      
      // Get the previous balance from the most recent ledger entry
      const customerLedgerEntries = ledgerEntries.filter(e => e.customerId === customerId);
      const sortedLedgerEntries = customerLedgerEntries.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateB - dateA; // Most recent first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      const previousBalance = sortedLedgerEntries.length > 0 ? sortedLedgerEntries[0].runningBalance : 0;
      
      // Create ledger entry
      const ledgerEntry: LedgerEntry = {
        id: generateId(),
        customerId,
        customerName: customer.name,
        date,
        transactionType: 'sale',
        referenceId: newSale.id,
        referenceNumber: orderId,
        description: `Sale ${orderId}`,
        debit: total, // Customer owes this amount
        credit: 0,
        runningBalance: previousBalance - total, // Debit reduces balance (makes it more negative)
        createdAt: now,
        updatedAt: now
      };
      
      // Update customer balance to match the ledger entry
      const updatedCustomersList = customers.map(c => {
        if (c.id === customerId) {
          return {
            ...c,
            balance: previousBalance - total, // Use the same calculated balance
            updatedAt: now
          };
        }
        return c;
      });
      
      // Do ALL updates in a single batch to prevent React state confusion
      githubDataManager.startBatchUpdate();

      // Update all data at once
      await Promise.all([
        updateSales([...sales, newSale]),
        updateMovements([...movements, ...newMovements]),
        updateBookedStock([...bookedStock, ...newBookedStock]),
        updateProducts(updatedProductsList),
        updateLedgerEntries([...ledgerEntries, ledgerEntry]),
        updateCustomers(updatedCustomersList)
      ]);

      // End batch and save once
      await githubDataManager.endBatchUpdate();

      return { success: true, sale: newSale };
    } catch (error) {
      console.error('Error adding sale:', error);
      return { success: false, error: 'Failed to add sale' };
    }
  }, [sales, products, customers, movements, ledgerEntries, bookedStock, 
      updateSales, updateMovements, updateBookedStock, updateProducts, 
      updateLedgerEntries, updateCustomers]);
  
  // Update sale
  const updateSale = useCallback(async (
    id: string,
    updates: Partial<Sale>
  ): Promise<{ success: boolean; error?: string; errors?: string[] }> => {
    try {
      console.log('🔄 UpdateSale starting:', { id, updates });
      console.log('📊 Current sales count:', sales.length);

      const now = new Date();

      // Find the existing sale
      const existingSale = sales.find(s => s.id === id);
      if (!existingSale) {
        console.error('❌ Sale not found:', id);
        return { success: false, error: 'Sale not found' };
      }

      console.log('📄 Found existing sale:', existingSale);

      // Update the sale
      const updatedSalesList = sales.map(sale => {
        if (sale.id === id) {
          const updatedSale = {
            ...sale,
            ...updates,
            updatedAt: now
          };
          console.log('✏️ Updated sale object:', updatedSale);
          return updatedSale;
        }
        return sale;
      });

      console.log('📋 Updated sales list length:', updatedSalesList.length);
      console.log('🎯 Updated sale in list:', updatedSalesList.find(s => s.id === id));
      
      // Initialize variables for booked stock, product, and movement updates
      let updatedBookedStock: any[] | undefined;
      let updatedProducts: any[] | undefined;
      let updatedMovements: any[] | undefined;
      
      // Handle item changes (booked stock, movements, and product quantities)
      if (updates.items && JSON.stringify(updates.items) !== JSON.stringify(existingSale.items)) {
        // Calculate quantity differences for each product
        const oldItemsMap = new Map(existingSale.items.map(item => [item.productId, item]));
        const newItemsMap = new Map(updates.items.map(item => [item.productId, item]));

        // Validation: Check if any items are being reduced below loaded quantities
        const validationErrors: string[] = [];

        // Check for quantity reduction below loaded amount
        for (const [productId, newItem] of newItemsMap) {
          const existingBooking = bookedStock.find(
            b => b.saleId === id && b.productId === productId
          );

          if (existingBooking && existingBooking.quantityLoaded > 0) {
            // Prevent reduction below loaded amount
            if (newItem.quantity < existingBooking.quantityLoaded) {
              validationErrors.push(
                `Cannot reduce ${newItem.productName} to ${newItem.quantity} ${newItem.unit}. ` +
                `Already loaded: ${existingBooking.quantityLoaded} ${newItem.unit}`
              );
            }
            // Allow increases - the additional quantity becomes available for future loadings
            // This is valid and should not cause any issues
          }
        }

        // Check for removed products that have been loaded
        for (const [productId, oldItem] of oldItemsMap) {
          if (!newItemsMap.has(productId)) {
            const existingBooking = bookedStock.find(
              b => b.saleId === id && b.productId === productId
            );

            if (existingBooking && existingBooking.quantityLoaded > 0) {
              validationErrors.push(
                `Cannot remove ${oldItem.productName}. ` +
                `Already loaded: ${existingBooking.quantityLoaded} ${oldItem.unit}`
              );
            }
          }
        }

        // If validation fails, return errors
        if (validationErrors.length > 0) {
          return { success: false, errors: validationErrors };
        }

        // Update booked stock entries
        const updatedBookedStockList = bookedStock.map(entry => {
          if (entry.saleId === id) {
            const newItem = newItemsMap.get(entry.productId);
            if (newItem) {
              // Update existing booked stock entry
              // IMPORTANT: When quantity increases after partial loading,
              // the additional quantity becomes available for future loadings
              // quantityLoaded remains unchanged to preserve loading history
              const updatedEntry = {
                ...entry,
                quantity: newItem.quantity,
                productName: newItem.productName,
                unit: newItem.unit,
                updatedAt: now
              };

              // Adjust status based on new quantity vs loaded quantity
              if (entry.quantityLoaded >= newItem.quantity) {
                updatedEntry.status = 'fully-loaded' as const;
              } else if (entry.quantityLoaded > 0) {
                updatedEntry.status = 'partial-loaded' as const;
              } else {
                updatedEntry.status = 'pending' as const;
              }

              return updatedEntry;
            }
            // If product not in new items, it will be removed below
          }
          return entry;
        }).filter(entry => {
          // Remove booked stock entries for products no longer in the sale
          if (entry.saleId === id) {
            return newItemsMap.has(entry.productId);
          }
          return true;
        });
        
        // Add new booked stock entries for new products
        const existingBookedProductIds = new Set(
          updatedBookedStockList.filter(b => b.saleId === id).map(b => b.productId)
        );
        
        updates.items.forEach(item => {
          if (!existingBookedProductIds.has(item.productId)) {
            // Create new booked stock entry for new product
            const newBookedEntry = {
              id: generateId(),
              customerId: existingSale.customerId,
              customerName: existingSale.customerName,
              saleId: id,
              orderId: existingSale.orderId,
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              quantityLoaded: 0,
              unit: item.unit,
              bookingDate: existingSale.date,
              status: 'pending' as const,
              createdAt: now,
              updatedAt: now
            };
            updatedBookedStockList.push(newBookedEntry);
          }
        });
        
        // Update product quantities
        const updatedProductsList = products.map(product => {
          const oldItem = oldItemsMap.get(product.id);
          const newItem = newItemsMap.get(product.id);

          if (oldItem || newItem) {
            const oldQuantity = oldItem?.quantity || 0;
            const newQuantity = newItem?.quantity || 0;
            const quantityDiff = newQuantity - oldQuantity;

            // Find the booked stock entry to check loaded quantities
            const booking = updatedBookedStockList.find(
              b => b.saleId === id && b.productId === product.id
            );

            // Calculate the actual booked quantity:
            // For partially loaded items, only the unloaded portion should be counted as booked
            let actualBookedChange = quantityDiff;
            if (booking && booking.quantityLoaded > 0 && quantityDiff > 0) {
              // When increasing quantity after partial loading,
              // only the additional quantity (beyond what's loaded) affects booked quantity
              actualBookedChange = quantityDiff; // The increase is all new booked quantity
            }

            return {
              ...product,
              quantityBooked: Math.max(0, (product.quantityBooked || 0) + actualBookedChange),
              availableQuantity: product.quantityOnHand - Math.max(0, (product.quantityBooked || 0) + actualBookedChange),
              updatedAt: now
            };
          }
          return product;
        });
        
        // Update movements for this sale
        const updatedMovementsList = movements.map(movement => {
          if (movement.referenceId === id && movement.movementType === 'sales') {
            const newItem = newItemsMap.get(movement.productId);
            if (newItem) {
              // Find the booked stock to get loaded quantity
              const booking = updatedBookedStockList.find(
                b => b.saleId === id && b.productId === movement.productId
              );

              // Update existing movement entry
              // Note: Sales movements don't affect physical stock (quantity: 0)
              // They only track bookings, not actual stock movement
              return {
                ...movement,
                quantity: 0, // Sales movements don't physically move stock
                productName: newItem.productName,
                notes: `Booked ${newItem.quantity} ${newItem.unit} for ${existingSale.customerName}` +
                  (booking && booking.quantityLoaded > 0
                    ? ` (${booking.quantityLoaded} already loaded)`
                    : ' (no physical stock change)'),
                updatedAt: now
              };
            }
            // If product not in new items, it will be removed below
          }
          return movement;
        }).filter(movement => {
          // Remove movements for products no longer in the sale
          if (movement.referenceId === id && movement.movementType === 'sales') {
            return newItemsMap.has(movement.productId);
          }
          return true;
        });
        
        // Add new movements for new products
        const existingMovementProductIds = new Set(
          updatedMovementsList.filter(m => m.referenceId === id && m.movementType === 'sales').map(m => m.productId)
        );
        
        updates.items.forEach(item => {
          if (!existingMovementProductIds.has(item.productId)) {
            const product = products.find(p => p.id === item.productId);
            if (product) {
              // Create new movement entry for new product (sales don't affect physical stock)
              const newMovement: InventoryMovement = {
                id: generateId(),
                productId: item.productId,
                productName: item.productName,
                movementType: 'sales',
                quantity: 0, // No physical stock change, only booking
                previousQuantity: product.quantityOnHand,
                newQuantity: product.quantityOnHand, // On-hand doesn't change until loading
                reference: `Sale: ${existingSale.orderId}`,
                referenceId: id,
                notes: `Booked ${item.quantity} ${item.unit} for ${existingSale.customerName} (no physical stock change)`,
                date: existingSale.date,
                createdAt: now,
                updatedAt: now
              };
              updatedMovementsList.push(newMovement);
            }
          }
        });
        
        // Store references to updated data for combined update
        updatedBookedStock = updatedBookedStockList;
        updatedProducts = updatedProductsList;
        updatedMovements = updatedMovementsList;
      }
      
      // Initialize all data arrays for potential updates
      let finalSales = updatedSalesList;
      let finalBookedStock = bookedStock;
      let finalProducts = products;
      let finalMovements = movements;
      let finalLedgerEntries = ledgerEntries;
      let finalCustomers = customers;

      // Apply booked stock, movement, and product updates if items changed
      if (updatedBookedStock && updatedProducts && updatedMovements) {
        finalBookedStock = updatedBookedStock;
        finalProducts = updatedProducts;
        finalMovements = updatedMovements;
      }

      // If totalAmount or date changed, update the corresponding ledger entry
      const dateChanged = updates.date && new Date(updates.date).getTime() !== new Date(existingSale.date).getTime();
      const amountChanged = updates.totalAmount !== undefined && updates.totalAmount !== existingSale.totalAmount;

      if (dateChanged || amountChanged) {
        const newTotalAmount = updates.totalAmount !== undefined ? updates.totalAmount : existingSale.totalAmount;
        const newDate = updates.date || existingSale.date;

        // Get all ledger entries for this customer sorted by date
        const customerEntries = ledgerEntries
          .filter(e => e.customerId === existingSale.customerId)
          .sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });

        // First update the sale's ledger entry with new date/amount
        const updatedEntriesWithDate = customerEntries.map(entry => {
          if (entry.referenceId === id && entry.transactionType === 'sale') {
            return {
              ...entry,
              date: newDate,
              debit: newTotalAmount,
              updatedAt: now
            };
          }
          return entry;
        });

        // Re-sort entries by date since date might have changed
        const resortedEntries = updatedEntriesWithDate.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA !== dateB) return dateA - dateB;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

        // Recalculate all running balances from scratch
        let runningBalance = 0;
        const updatedCustomerEntries = resortedEntries.map(entry => {
          // Calculate new running balance
          runningBalance = runningBalance - entry.debit + entry.credit;

          // Return updated entry with new running balance
          if (entry.runningBalance !== runningBalance) {
            return {
              ...entry,
              runningBalance,
              updatedAt: now
            };
          }
          return entry;
        });

        // Merge updated customer entries back into the full list
        const updatedLedgerEntries = ledgerEntries.map(entry => {
          const updated = updatedCustomerEntries.find(e => e.id === entry.id);
          return updated || entry;
        });

        // Update customer's final balance
        const updatedCustomersList = customers.map(c => {
          if (c.id === existingSale.customerId) {
            return {
              ...c,
              balance: runningBalance, // Use the final running balance
              updatedAt: now
            };
          }
          return c;
        });

        finalLedgerEntries = updatedLedgerEntries;
        finalCustomers = updatedCustomersList;
      }

      console.log('🚀 Starting single atomic update for all data');

      // Do ALL updates in a single batch to prevent React state confusion
      githubDataManager.startBatchUpdate();

      // Update all data at once
      await Promise.all([
        updateSales(finalSales),
        updateBookedStock(finalBookedStock),
        updateProducts(finalProducts),
        updateMovements(finalMovements),
        updateLedgerEntries(finalLedgerEntries),
        updateCustomers(finalCustomers)
      ]);

      // End batch and save once
      await githubDataManager.endBatchUpdate();
      console.log('✅ Atomic update completed');

      console.log('🎉 UpdateSale completed successfully');
      return { success: true };
    } catch (error) {
      console.error('Error updating sale:', error);
      return { success: false, error: 'Failed to update sale' };
    }
  }, [sales, customers, ledgerEntries, products, bookedStock, movements,
      updateSales, updateLedgerEntries, updateCustomers, updateBookedStock, updateProducts, updateMovements]);
  
  // Delete sale
  const deleteSale = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const saleToDelete = sales.find(s => s.id === id);
      if (!saleToDelete) {
        return { success: false, error: 'Sale not found' };
      }

      // Remove sale
      const updatedSalesList = sales.filter(s => s.id !== id);

      // Remove related movements
      const updatedMovementsList = movements.filter(m => m.referenceId !== id);

      // Remove booked stock entries
      const updatedBookedStockList = bookedStock.filter(b => b.saleId !== id);

      // Update products to release booked quantities
      const updatedProductsList = products.map(product => {
        const bookedForThisSale = saleToDelete.items.find(item => item.productId === product.id);
        if (bookedForThisSale) {
          return {
            ...product,
            quantityBooked: Math.max(0, (product.quantityBooked || 0) - bookedForThisSale.quantity),
            availableQuantity: product.quantityOnHand - Math.max(0, (product.quantityBooked || 0) - bookedForThisSale.quantity),
            updatedAt: new Date()
          };
        }
        return product;
      });

      // Remove related ledger entries and recalculate running balances
      const updatedLedgerList = ledgerEntries.filter(l => l.referenceId !== id);

      // Get all remaining entries for this customer and recalculate running balances
      const customerEntries = updatedLedgerList
        .filter(e => e.customerId === saleToDelete.customerId)
        .sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA !== dateB) return dateA - dateB;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

      // Recalculate running balances
      let runningBalance = 0;
      const recalculatedEntries = customerEntries.map(entry => {
        runningBalance = runningBalance - entry.debit + entry.credit;
        if (entry.runningBalance !== runningBalance) {
          return {
            ...entry,
            runningBalance,
            updatedAt: new Date()
          };
        }
        return entry;
      });

      // Merge recalculated entries back into the full list
      const finalLedgerList = updatedLedgerList.map(entry => {
        const recalculated = recalculatedEntries.find(e => e.id === entry.id);
        return recalculated || entry;
      });

      // Update customer balance with final running balance
      const updatedCustomersList = customers.map(c => {
        if (c.id === saleToDelete.customerId) {
          const finalBalance = recalculatedEntries.length > 0
            ? recalculatedEntries[recalculatedEntries.length - 1].runningBalance
            : 0;
          return {
            ...c,
            balance: finalBalance,
            updatedAt: new Date()
          };
        }
        return c;
      });

      // Start batch update to avoid conflicts
      githubDataManager.startBatchUpdate();

      // Await all updates to ensure data is persisted before returning
      await Promise.all([
        updateSales(updatedSalesList),
        updateMovements(updatedMovementsList),
        updateBookedStock(updatedBookedStockList),
        updateProducts(updatedProductsList),
        updateLedgerEntries(finalLedgerList),
        updateCustomers(updatedCustomersList)
      ]);

      // End batch and save once
      await githubDataManager.endBatchUpdate();

      return { success: true };
    } catch (error) {
      console.error('Error deleting sale:', error);
      return { success: false, error: 'Failed to delete sale' };
    }
  }, [sales, products, customers, movements, ledgerEntries, bookedStock,
      updateSales, updateMovements, updateBookedStock, updateProducts,
      updateLedgerEntries, updateCustomers]);
  
  // Get sale by ID
  const getSaleById = useCallback((id: string): Sale | undefined => {
    return sales.find(s => s.id === id);
  }, [sales]);
  
  // Get sales by customer
  const getSalesByCustomer = useCallback((customerId: string): Sale[] => {
    return sales.filter(s => s.customerId === customerId);
  }, [sales]);
  
  // Get booked stock by sale
  const getBookedStockBySale = useCallback((saleId: string): BookedStock[] => {
    return bookedStock.filter(b => b.saleId === saleId);
  }, [bookedStock]);
  
  // Helper methods for compatibility
  const getProducts = useCallback(() => products, [products]);
  const getCustomers = useCallback(() => customers, [customers]);
  
  return {
    // Data
    sales,
    products,
    customers,
    movements,
    ledgerEntries,
    bookedStock,
    
    // Status
    loading,
    error,
    isOnline,
    syncInProgress: isSyncing,
    pendingChanges: offlineQueueSize,
    lastSyncError: error,
    
    // Operations
    addSale,
    updateSale,
    deleteSale,
    getSaleById,
    getSalesByCustomer,
    getBookedStockBySale,
    
    // Helper methods
    getProducts,
    getCustomers,
    
    // Sync operations
    forceSync,
    refreshData: refresh
  };
};