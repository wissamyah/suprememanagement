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
  const addSale = useCallback((
    customerId: string,
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unit: string;
      price: number;
      total: number;
    }>,
    date: Date = new Date()
  ): { success: boolean; sale?: Sale; error?: string } => {
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
        paymentStatus: 'pending',
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
          
          // Create movement
          const movement: InventoryMovement = {
            id: generateId(),
            productId: item.productId,
            productName: item.productName,
            movementType: 'sales',
            quantity: item.quantity,
            previousQuantity: product.quantityOnHand,
            newQuantity: product.quantityOnHand, // On-hand doesn't change until loading
            reference: `Sale: ${orderId}`,
            referenceId: newSale.id,
            notes: `Sold to ${customer.name}`,
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
      
      // Start batch update to avoid conflicts
      githubDataManager.startBatchUpdate();
      
      // Fire and forget - update all in background
      const updates = Promise.all([
        updateSales([...sales, newSale]),
        updateMovements([...movements, ...newMovements]),
        updateBookedStock([...bookedStock, ...newBookedStock]),
        updateProducts(updatedProductsList),
        updateLedgerEntries([...ledgerEntries, ledgerEntry]),
        updateCustomers(updatedCustomersList)
      ]);
      
      // End batch and save once
      updates.then(() => {
        githubDataManager.endBatchUpdate();
      }).catch(error => {
        console.error('Error in batch update:', error);
        githubDataManager.endBatchUpdate();
      });
      
      return { success: true, sale: newSale };
    } catch (error) {
      console.error('Error adding sale:', error);
      return { success: false, error: 'Failed to add sale' };
    }
  }, [sales, products, customers, movements, ledgerEntries, bookedStock, 
      updateSales, updateMovements, updateBookedStock, updateProducts, 
      updateLedgerEntries, updateCustomers]);
  
  // Update sale
  const updateSale = useCallback((
    id: string,
    updates: Partial<Sale>
  ): { success: boolean; error?: string } => {
    try {
      const now = new Date();
      
      // Find the existing sale
      const existingSale = sales.find(s => s.id === id);
      if (!existingSale) {
        return { success: false, error: 'Sale not found' };
      }
      
      // Update the sale
      const updatedSalesList = sales.map(sale => {
        if (sale.id === id) {
          return {
            ...sale,
            ...updates,
            updatedAt: now
          };
        }
        return sale;
      });
      
      // Initialize variables for booked stock and product updates
      let updatedBookedStock: any[] | undefined;
      let updatedProducts: any[] | undefined;
      
      // Handle item changes (booked stock and product quantities)
      if (updates.items && JSON.stringify(updates.items) !== JSON.stringify(existingSale.items)) {
        // Calculate quantity differences for each product
        const oldItemsMap = new Map(existingSale.items.map(item => [item.productId, item]));
        const newItemsMap = new Map(updates.items.map(item => [item.productId, item]));
        
        // Update booked stock entries
        const updatedBookedStockList = bookedStock.map(entry => {
          if (entry.saleId === id) {
            const newItem = newItemsMap.get(entry.productId);
            if (newItem) {
              // Update existing booked stock entry
              return {
                ...entry,
                quantity: newItem.quantity,
                productName: newItem.productName,
                unit: newItem.unit,
                updatedAt: now
              };
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
          bookedStock.filter(b => b.saleId === id).map(b => b.productId)
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
            
            return {
              ...product,
              quantityBooked: Math.max(0, (product.quantityBooked || 0) + quantityDiff),
              availableQuantity: product.quantityOnHand - Math.max(0, (product.quantityBooked || 0) + quantityDiff),
              updatedAt: now
            };
          }
          return product;
        });
        
        // Store references to updated data for combined update
        updatedBookedStock = updatedBookedStockList;
        updatedProducts = updatedProductsList;
      }
      
      // Prepare all updates
      const allUpdates = [updateSales(updatedSalesList)];
      
      // Add booked stock and product updates if items changed
      if (updatedBookedStock && updatedProducts) {
        allUpdates.push(updateBookedStock(updatedBookedStock));
        allUpdates.push(updateProducts(updatedProducts));
      }
      
      // If totalAmount changed, update the corresponding ledger entry
      if (updates.totalAmount !== undefined && updates.totalAmount !== existingSale.totalAmount) {
        const newTotalAmount = updates.totalAmount;
        
        // Get all ledger entries for this customer sorted by date
        const customerEntries = ledgerEntries
          .filter(e => e.customerId === existingSale.customerId)
          .sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });
        
        // Recalculate running balances
        let runningBalance = 0;
        const updatedCustomerEntries = customerEntries.map(entry => {
          // Update the debit amount if this is the sale entry being edited
          let debit = entry.debit;
          if (entry.referenceId === id && entry.transactionType === 'sale') {
            debit = newTotalAmount;
          }
          
          // Calculate new running balance
          runningBalance = runningBalance - debit + entry.credit;
          
          // Return updated entry if it changed
          if (entry.referenceId === id || entry.runningBalance !== runningBalance) {
            return {
              ...entry,
              debit,
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
        
        // Add ledger and customer updates
        allUpdates.push(updateLedgerEntries(updatedLedgerEntries));
        allUpdates.push(updateCustomers(updatedCustomersList));
      }
      
      // Fire and forget all updates together
      Promise.all(allUpdates).catch(console.error);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating sale:', error);
      return { success: false, error: 'Failed to update sale' };
    }
  }, [sales, customers, ledgerEntries, products, bookedStock, 
      updateSales, updateLedgerEntries, updateCustomers, updateBookedStock, updateProducts]);
  
  // Delete sale
  const deleteSale = useCallback((id: string): { success: boolean; error?: string } => {
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
      
      // Remove related ledger entries
      const updatedLedgerList = ledgerEntries.filter(l => l.referenceId !== id);
      
      // Update customer balance
      const updatedCustomersList = customers.map(c => {
        if (c.id === saleToDelete.customerId) {
          return {
            ...c,
            balance: (c.balance || 0) + saleToDelete.totalAmount,
            updatedAt: new Date()
          };
        }
        return c;
      });
      
      // Start batch update to avoid conflicts
      githubDataManager.startBatchUpdate();
      
      // Fire and forget - update all in background
      const updates = Promise.all([
        updateSales(updatedSalesList),
        updateMovements(updatedMovementsList),
        updateBookedStock(updatedBookedStockList),
        updateProducts(updatedProductsList),
        updateLedgerEntries(updatedLedgerList),
        updateCustomers(updatedCustomersList)
      ]);
      
      // End batch and save once
      updates.then(() => {
        githubDataManager.endBatchUpdate();
      }).catch(error => {
        console.error('Error in batch update:', error);
        githubDataManager.endBatchUpdate();
      });
      
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