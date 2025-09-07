// Direct GitHub booked stock hook - no localStorage dependency
import { useCallback } from 'react';
import { useGitHubData } from './useGitHubData';
import { generateId } from '../utils/storage';
import type { BookedStock } from '../types';

export const useBookedStockDirect = () => {
  const {
    data: bookedStock,
    loading,
    error,
    updateData: updateBookedStock,
    isOnline,
    isSyncing,
    offlineQueueSize,
    refresh,
    forceSync
  } = useGitHubData<BookedStock>({ dataType: 'bookedStock', immediate: true });
  
  // Add booked stock
  const addBookedStock = useCallback((
    productId: string,
    productName: string,
    customerId: string,
    customerName: string,
    quantity: number,
    saleId: string,
    orderId: string
  ): { success: boolean; error?: string } => {
    try {
      const now = new Date();
      const newBookedStock: BookedStock = {
        id: generateId(),
        customerId,
        customerName,
        saleId,
        orderId,
        productId,
        productName,
        quantity,
        quantityLoaded: 0,
        unit: 'unit', // Default unit
        bookingDate: now,
        status: 'pending',
        createdAt: now,
        updatedAt: now
      };
      
      updateBookedStock([...bookedStock, newBookedStock]).catch(console.error);
      
      return { success: true };
    } catch (error) {
      console.error('Error adding booked stock:', error);
      return { success: false, error: 'Failed to add booked stock' };
    }
  }, [bookedStock, updateBookedStock]);
  
  // Add batch booked stock
  const addBatchBookedStock = useCallback((
    entries: Array<{
      productId: string;
      productName: string;
      customerId: string;
      customerName: string;
      quantity: number;
      saleId: string;
      orderId: string;
    }>
  ): { success: boolean; error?: string } => {
    try {
      const now = new Date();
      const newEntries: BookedStock[] = entries.map(entry => ({
        id: generateId(),
        customerId: entry.customerId,
        customerName: entry.customerName,
        saleId: entry.saleId,
        orderId: entry.orderId,
        productId: entry.productId,
        productName: entry.productName,
        quantity: entry.quantity,
        quantityLoaded: 0,
        unit: 'unit',
        bookingDate: now,
        status: 'pending',
        createdAt: now,
        updatedAt: now
      }));
      
      updateBookedStock([...bookedStock, ...newEntries]).catch(console.error);
      
      return { success: true };
    } catch (error) {
      console.error('Error adding batch booked stock:', error);
      return { success: false, error: 'Failed to add batch booked stock' };
    }
  }, [bookedStock, updateBookedStock]);
  
  // Update booked stock status
  const updateBookedStockStatus = useCallback((
    id: string,
    status: BookedStock['status']
  ): { success: boolean; error?: string } => {
    try {
      const now = new Date();
      const updatedList = bookedStock.map(item => {
        if (item.id === id) {
          return {
            ...item,
            status,
            quantityLoaded: status === 'fully-loaded' ? item.quantity : item.quantityLoaded,
            updatedAt: now
          };
        }
        return item;
      });
      
      updateBookedStock(updatedList).catch(console.error);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating booked stock status:', error);
      return { success: false, error: 'Failed to update status' };
    }
  }, [bookedStock, updateBookedStock]);
  
  // Delete booked stock
  const deleteBookedStock = useCallback((id: string): { success: boolean; error?: string } => {
    try {
      const updatedList = bookedStock.filter(item => item.id !== id);
      updateBookedStock(updatedList).catch(console.error);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting booked stock:', error);
      return { success: false, error: 'Failed to delete booked stock' };
    }
  }, [bookedStock, updateBookedStock]);
  
  // Get booked stock by sale
  const getBookedStockBySale = useCallback((saleId: string): BookedStock[] => {
    return bookedStock.filter(item => item.saleId === saleId);
  }, [bookedStock]);
  
  // Get booked stock by customer
  const getBookedStockByCustomer = useCallback((customerId: string): BookedStock[] => {
    return bookedStock.filter(item => item.customerId === customerId);
  }, [bookedStock]);
  
  // Get booked stock by product
  const getBookedStockByProduct = useCallback((productId: string): BookedStock[] => {
    return bookedStock.filter(item => item.productId === productId);
  }, [bookedStock]);
  
  // Get total booked quantity for a product
  const getTotalBookedQuantity = useCallback((productId: string): number => {
    return bookedStock
      .filter(item => item.productId === productId && (item.status === 'pending' || item.status === 'confirmed'))
      .reduce((total, item) => total + item.quantity, 0);
  }, [bookedStock]);
  
  // Mark booked stock as loaded
  const markAsLoaded = useCallback((ids: string[]): { success: boolean; error?: string } => {
    try {
      const now = new Date();
      const updatedList = bookedStock.map(item => {
        if (ids.includes(item.id)) {
          return {
            ...item,
            status: 'fully-loaded' as const,
            quantityLoaded: item.quantity,
            updatedAt: now
          };
        }
        return item;
      });
      
      updateBookedStock(updatedList).catch(console.error);
      
      return { success: true };
    } catch (error) {
      console.error('Error marking as loaded:', error);
      return { success: false, error: 'Failed to mark as loaded' };
    }
  }, [bookedStock, updateBookedStock]);
  
  return {
    // Data
    bookedStock,
    
    // Status
    loading,
    error,
    isOnline,
    syncInProgress: isSyncing,
    pendingChanges: offlineQueueSize,
    
    // Operations
    addBookedStock,
    addBatchBookedStock,
    updateBookedStockStatus,
    deleteBookedStock,
    markAsLoaded,
    
    // Queries
    getBookedStockBySale,
    getBookedStockByCustomer,
    getBookedStockByProduct,
    getTotalBookedQuantity,
    
    // Sync
    forceSync,
    refreshData: refresh
  };
};