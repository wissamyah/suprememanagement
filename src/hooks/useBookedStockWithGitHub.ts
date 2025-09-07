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
      console.log('[SaveToCache] Saved', data.length, 'booked stock entries to cache');
      
      // Verify the save
      const saved = localStorage.getItem(CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('[SaveToCache] Verified cache contains', parsed.length, 'entries');
      }
      
      // Dispatch storage event for cross-tab synchronization
      window.dispatchEvent(new StorageEvent('storage', {
        key: CACHE_KEY,
        newValue: JSON.stringify(data),
        url: window.location.href
      }));
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

  // Listen for storage events to sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CACHE_KEY && e.newValue) {
        try {
          const parsedData = JSON.parse(e.newValue);
          const bookedStockData = parsedData.map((item: any) => ({
            ...item,
            bookingDate: new Date(item.bookingDate),
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
          }));
          setBookedStock(bookedStockData);
        } catch (error) {
          console.error('Error parsing booked stock from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
        status: 'confirmed',
        notes,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Use functional setState to ensure we have the latest state
      setBookedStock(prevBookedStock => {
        const updatedBookedStock = [...prevBookedStock, newBooking];
        
        // Save to cache with the updated data
        saveToCache(updatedBookedStock);
        
        // Sync in background
        syncWithGitHub(updatedBookedStock);
        
        return updatedBookedStock;
      });
      
      setPendingChanges(prev => prev + 1);
      
      return { success: true, data: newBooking };
    } catch (error) {
      console.error('Error adding booked stock:', error);
      return { success: false, error: (error as Error).message };
    }
  }, [saveToCache, syncWithGitHub]);

  // Add multiple booked stock entries at once (batch operation)
  const addBatchBookedStock = useCallback((
    bookings: Array<{
      customerId: string;
      customerName: string;
      saleId: string;
      orderId: string;
      productId: string;
      productName: string;
      quantity: number;
      unit: string;
      bookingDate: Date;
      notes?: string;
    }>
  ) => {
    try {
      console.log('[AddBatchBookedStock] Adding bookings:', bookings.length);
      console.log('[AddBatchBookedStock] Bookings details:', bookings.map(b => ({
        product: b.productName,
        qty: b.quantity,
        orderId: b.orderId
      })));
      
      const timestamp = Date.now();
      const newBookings: BookedStock[] = bookings.map((booking, index) => ({
        id: `BS-${timestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        customerId: booking.customerId,
        customerName: booking.customerName,
        saleId: booking.saleId,
        orderId: booking.orderId,
        productId: booking.productId,
        productName: booking.productName,
        quantity: booking.quantity,
        quantityLoaded: 0,
        unit: booking.unit,
        bookingDate: booking.bookingDate,
        status: 'confirmed' as const,
        notes: booking.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      console.log('[AddBatchBookedStock] Created new bookings:', newBookings.map(b => ({
        id: b.id,
        productName: b.productName,
        quantity: b.quantity
      })));

      // Use functional setState to ensure we have the latest state
      setBookedStock(prevBookedStock => {
        const updatedBookedStock = [...prevBookedStock, ...newBookings];
        
        // Save to cache with the updated data
        saveToCache(updatedBookedStock);
        
        // Immediate sync for reliability
        syncWithGitHub(updatedBookedStock).then(result => {
          console.log('[AddBatchBookedStock] Sync result:', result);
        });
        
        return updatedBookedStock;
      });
      
      setPendingChanges(prev => prev + 1);
      
      return { success: true, data: newBookings };
    } catch (error) {
      console.error('Error adding batch booked stock:', error);
      return { success: false, error: (error as Error).message };
    }
  }, [saveToCache, syncWithGitHub]);

  // Update booked stock entry
  const updateBookedStock = useCallback((
    id: string,
    updates: Partial<Omit<BookedStock, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    try {
      setBookedStock(prevBookedStock => {
        const updatedBookedStock = prevBookedStock.map(item =>
          item.id === id
            ? { ...item, ...updates, updatedAt: new Date() }
            : item
        );
        
        saveToCache(updatedBookedStock);
        syncWithGitHub(updatedBookedStock);
        
        return updatedBookedStock;
      });
      
      setPendingChanges(prev => prev + 1);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating booked stock:', error);
      return { success: false, error: (error as Error).message };
    }
  }, [saveToCache, syncWithGitHub]);

  // Delete booked stock entry
  const deleteBookedStock = useCallback((id: string) => {
    try {
      setBookedStock(prevBookedStock => {
        const updatedBookedStock = prevBookedStock.filter(item => item.id !== id);
        
        saveToCache(updatedBookedStock);
        syncWithGitHub(updatedBookedStock);
        
        return updatedBookedStock;
      });
      
      setPendingChanges(prev => prev + 1);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting booked stock:', error);
      return { success: false, error: (error as Error).message };
    }
  }, [saveToCache, syncWithGitHub]);

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
    const activeBookings = bookedStock.filter(item => 
      item.productId === productId && 
      ['pending', 'confirmed', 'partial-loaded'].includes(item.status)
    );
    
    const total = activeBookings.reduce((sum, item) => sum + (item.quantity - item.quantityLoaded), 0);
    
    if (activeBookings.length > 0) {
      console.log(`[GetTotalBookedQuantity] Product ${productId}: ${activeBookings.length} bookings, total: ${total}`);
    }
    
    return total;
  }, [bookedStock]);

  // Update loading status (for future loading implementation)
  const updateLoadingStatus = useCallback((
    id: string,
    quantityLoaded: number,
    status?: BookedStock['status']
  ) => {
    const booking = bookedStock.find(item => item.id === id);
    if (!booking) {
      console.error('[UpdateLoadingStatus] Booking not found:', id);
      return { success: false, error: 'Booking not found' };
    }

    const newQuantityLoaded = Math.min(quantityLoaded, booking.quantity);
    const newStatus = status || (
      newQuantityLoaded === 0 ? 'pending' :
      newQuantityLoaded < booking.quantity ? 'partial-loaded' :
      'fully-loaded'
    );
    
    console.log('[UpdateLoadingStatus] Updating booked stock:', {
      bookingId: id,
      productName: booking.productName,
      totalBooked: booking.quantity,
      previousLoaded: booking.quantityLoaded,
      newLoaded: newQuantityLoaded,
      remainingBooked: booking.quantity - newQuantityLoaded,
      status: newStatus
    });

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
    addBatchBookedStock,
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