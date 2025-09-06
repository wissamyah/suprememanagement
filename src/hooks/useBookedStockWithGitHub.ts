import { useState, useEffect, useCallback } from 'react';
import githubStorage from '../services/githubStorage';
import type { BookedStock } from '../types';

const CACHE_KEY = 'suprememanagement_bookedStock';

export const useBookedStockWithGitHub = () => {
  const [bookedStock, setBookedStock] = useState<BookedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);

  // Load from localStorage
  const loadFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsedData = JSON.parse(cached);
        const bookedStockData = parsedData.map((item: any) => ({
          ...item,
          bookingDate: new Date(item.bookingDate),
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        }));
        setBookedStock(bookedStockData);
        return bookedStockData;
      }
    } catch (error) {
      console.error('Error loading booked stock from cache:', error);
    }
    return [];
  }, []);

  // Save to localStorage
  const saveToCache = useCallback((data: BookedStock[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving booked stock to cache:', error);
    }
  }, []);

  // Load from GitHub
  const loadFromGitHub = useCallback(async () => {
    try {
      setLoading(true);
      const allData = await githubStorage.loadAllData();
      
      if (allData && allData.bookedStock && Array.isArray(allData.bookedStock)) {
        const bookedStockData = allData.bookedStock.map((item: any) => ({
          ...item,
          bookingDate: new Date(item.bookingDate),
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        }));
        setBookedStock(bookedStockData);
        saveToCache(bookedStockData);
        return bookedStockData;
      }
      
      // If no data exists, return empty array
      return [];
    } catch (error) {
      console.error('Error loading booked stock from GitHub:', error);
      // Fall back to cache
      return loadFromCache();
    } finally {
      setLoading(false);
    }
  }, [loadFromCache, saveToCache]);

  // Sync with GitHub
  const syncWithGitHub = useCallback(async (data: BookedStock[]) => {
    try {
      setSyncInProgress(true);
      // Load existing data to preserve other data types
      const allData = await githubStorage.loadAllData() || {};
      // Update booked stock data
      allData.bookedStock = data;
      // Save all data back
      await githubStorage.saveAllData(allData);
      setPendingChanges(0);
      return { success: true };
    } catch (error) {
      console.error('Error syncing booked stock with GitHub:', error);
      setPendingChanges(prev => prev + 1);
      return { success: false, error };
    } finally {
      setSyncInProgress(false);
    }
  }, []);

  // Initialize data
  useEffect(() => {
    const initData = async () => {
      const cachedData = loadFromCache();
      if (cachedData.length > 0) {
        setLoading(false);
      }
      
      // Load from GitHub in background
      await loadFromGitHub();
    };
    
    initData();
  }, [loadFromCache, loadFromGitHub]);

  // Auto-sync when there are pending changes
  useEffect(() => {
    const syncTimer = setTimeout(() => {
      if (pendingChanges > 0 && !syncInProgress) {
        syncWithGitHub(bookedStock);
      }
    }, 3000); // Sync after 3 seconds of inactivity

    return () => clearTimeout(syncTimer);
  }, [bookedStock, pendingChanges, syncInProgress, syncWithGitHub]);

  // Add booked stock entry
  const addBookedStock = useCallback((
    customerId: string,
    customerName: string,
    saleId: string,
    orderId: string,
    productId: string,
    productName: string,
    quantity: number,
    unit: string,
    bookingDate: Date,
    notes?: string
  ) => {
    try {
      const newBooking: BookedStock = {
        id: `BS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        customerId,
        customerName,
        saleId,
        orderId,
        productId,
        productName,
        quantity,
        quantityLoaded: 0,
        unit,
        bookingDate,
        status: 'pending',
        notes,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedBookedStock = [...bookedStock, newBooking];
      setBookedStock(updatedBookedStock);
      saveToCache(updatedBookedStock);
      setPendingChanges(prev => prev + 1);
      
      // Sync in background
      syncWithGitHub(updatedBookedStock);
      
      return { success: true, data: newBooking };
    } catch (error) {
      console.error('Error adding booked stock:', error);
      return { success: false, error: (error as Error).message };
    }
  }, [bookedStock, saveToCache, syncWithGitHub]);

  // Update booked stock entry
  const updateBookedStock = useCallback((
    id: string,
    updates: Partial<Omit<BookedStock, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    try {
      const updatedBookedStock = bookedStock.map(item =>
        item.id === id
          ? { ...item, ...updates, updatedAt: new Date() }
          : item
      );
      
      setBookedStock(updatedBookedStock);
      saveToCache(updatedBookedStock);
      setPendingChanges(prev => prev + 1);
      
      // Sync in background
      syncWithGitHub(updatedBookedStock);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating booked stock:', error);
      return { success: false, error: (error as Error).message };
    }
  }, [bookedStock, saveToCache, syncWithGitHub]);

  // Delete booked stock entry
  const deleteBookedStock = useCallback((id: string) => {
    try {
      const updatedBookedStock = bookedStock.filter(item => item.id !== id);
      setBookedStock(updatedBookedStock);
      saveToCache(updatedBookedStock);
      setPendingChanges(prev => prev + 1);
      
      // Sync in background
      syncWithGitHub(updatedBookedStock);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting booked stock:', error);
      return { success: false, error: (error as Error).message };
    }
  }, [bookedStock, saveToCache, syncWithGitHub]);

  // Get booked stock by customer
  const getBookedStockByCustomer = useCallback((customerId: string) => {
    return bookedStock.filter(item => 
      item.customerId === customerId && 
      ['pending', 'confirmed', 'partial-loaded'].includes(item.status)
    );
  }, [bookedStock]);

  // Get booked stock by product
  const getBookedStockByProduct = useCallback((productId: string) => {
    return bookedStock.filter(item => 
      item.productId === productId && 
      ['pending', 'confirmed', 'partial-loaded'].includes(item.status)
    );
  }, [bookedStock]);

  // Get booked stock by sale
  const getBookedStockBySale = useCallback((saleId: string) => {
    return bookedStock.filter(item => item.saleId === saleId);
  }, [bookedStock]);

  // Calculate total booked quantity for a product
  const getTotalBookedQuantity = useCallback((productId: string) => {
    return bookedStock
      .filter(item => 
        item.productId === productId && 
        ['pending', 'confirmed', 'partial-loaded'].includes(item.status)
      )
      .reduce((total, item) => total + (item.quantity - item.quantityLoaded), 0);
  }, [bookedStock]);

  // Update loading status (for future loading implementation)
  const updateLoadingStatus = useCallback((
    id: string,
    quantityLoaded: number,
    status?: BookedStock['status']
  ) => {
    const booking = bookedStock.find(item => item.id === id);
    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    const newQuantityLoaded = Math.min(quantityLoaded, booking.quantity);
    const newStatus = status || (
      newQuantityLoaded === 0 ? 'pending' :
      newQuantityLoaded < booking.quantity ? 'partial-loaded' :
      'fully-loaded'
    );

    return updateBookedStock(id, {
      quantityLoaded: newQuantityLoaded,
      status: newStatus
    });
  }, [bookedStock, updateBookedStock]);

  // Force sync
  const forceSync = useCallback(async () => {
    if (!syncInProgress) {
      await syncWithGitHub(bookedStock);
    }
  }, [bookedStock, syncInProgress, syncWithGitHub]);

  // Refresh data from GitHub
  const refreshData = useCallback(async () => {
    await loadFromGitHub();
  }, [loadFromGitHub]);

  return {
    bookedStock,
    loading,
    syncInProgress,
    pendingChanges,
    addBookedStock,
    updateBookedStock,
    deleteBookedStock,
    getBookedStockByCustomer,
    getBookedStockByProduct,
    getBookedStockBySale,
    getTotalBookedQuantity,
    updateLoadingStatus,
    forceSync,
    refreshData
  };
};