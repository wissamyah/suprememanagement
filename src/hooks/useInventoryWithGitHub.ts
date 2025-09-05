import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import type { Product, ProductCategory, InventoryMovement, ProductionEntry } from '../types';
import { storage, generateId } from '../utils/storage';
import { GitHubContext } from '../App';
import githubStorage from '../services/githubStorage';
import { syncQueue } from '../services/syncQueue';
import { globalSyncManager } from '../services/globalSyncManager';
import { 
  getStockStatus, 
  validateProduct 
} from '../utils/inventory';

const PRODUCTS_KEY = 'products';
const CATEGORIES_KEY = 'product_categories';
const MOVEMENTS_KEY = 'inventory_movements';
const PRODUCTION_KEY = 'production_entries';

export const useInventoryWithGitHub = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [productionEntries, setProductionEntries] = useState<ProductionEntry[]>([]);
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
          // Set all data from GitHub
          setProducts(githubData.products || []);
          setCategories(githubData.categories || []);
          setMovements(githubData.movements || []);
          setProductionEntries(githubData.productionEntries || []);
          
          // Update localStorage with GitHub data as backup
          storage.set(PRODUCTS_KEY, githubData.products || []);
          storage.set(CATEGORIES_KEY, githubData.categories || []);
          storage.set(MOVEMENTS_KEY, githubData.movements || []);
          storage.set(PRODUCTION_KEY, githubData.productionEntries || []);
        }
      } else {
        // Load from localStorage
        const storedProducts = storage.get<Product[]>(PRODUCTS_KEY) || [];
        const storedCategories = storage.get<ProductCategory[]>(CATEGORIES_KEY) || [];
        const storedMovements = storage.get<InventoryMovement[]>(MOVEMENTS_KEY) || [];
        const storedProduction = storage.get<ProductionEntry[]>(PRODUCTION_KEY) || [];

        setProducts(storedProducts);
        setCategories(storedCategories);
        setMovements(storedMovements);
        setProductionEntries(storedProduction);
      }
    } catch (error) {
      console.error('Error loading inventory data:', error);
      // Fallback to localStorage on error
      const storedProducts = storage.get<Product[]>(PRODUCTS_KEY) || [];
      const storedCategories = storage.get<ProductCategory[]>(CATEGORIES_KEY) || [];
      const storedMovements = storage.get<InventoryMovement[]>(MOVEMENTS_KEY) || [];
      const storedProduction = storage.get<ProductionEntry[]>(PRODUCTION_KEY) || [];

      setProducts(storedProducts);
      setCategories(storedCategories);
      setMovements(storedMovements);
      setProductionEntries(storedProduction);
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

  // No longer need performBatchSync - handled by globalSyncManager

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  // Notify global sync manager when data changes
  useEffect(() => {
    // Skip initial load to avoid marking as changed on mount
    if (mountedRef.current && isAuthenticated && !loading && !isInitialLoad.current) {
      globalSyncManager.markAsChanged();
    }
  }, [products, categories, movements, productionEntries, isAuthenticated, loading]);

  // Auto-sync is now handled by globalSyncManager

  const saveProducts = (newProducts: Product[], operation?: 'add' | 'update' | 'delete') => {
    // Save to local state immediately (optimistic update)
    setProducts(newProducts);
    storage.set(PRODUCTS_KEY, newProducts);
    
    // Add to sync queue if operation specified
    if (operation) {
      const changedProducts = newProducts.filter(p => 
        !products.find(op => op.id === p.id && JSON.stringify(op) === JSON.stringify(p))
      );
      changedProducts.forEach(product => {
        syncQueue.addToQueue({
          type: 'product',
          operation,
          data: product
        });
      });
    }
    
    // Notify global sync manager
    globalSyncManager.markAsChanged();
  };

  const saveCategories = (newCategories: ProductCategory[]) => {
    setCategories(newCategories);
    storage.set(CATEGORIES_KEY, newCategories);
    globalSyncManager.markAsChanged();
  };

  const saveMovements = (newMovements: InventoryMovement[]) => {
    setMovements(newMovements);
    storage.set(MOVEMENTS_KEY, newMovements);
    globalSyncManager.markAsChanged();
  };

  const saveProduction = (newProduction: ProductionEntry[]) => {
    setProductionEntries(newProduction);
    storage.set(PRODUCTION_KEY, newProduction);
    globalSyncManager.markAsChanged();
  };

  // Category operations
  const addCategory = useCallback((name: string, description?: string): { success: boolean } => {
    try {
      const now = new Date();
      const newCategory: ProductCategory = {
        id: generateId(),
        name,
        description,
        createdAt: now,
        updatedAt: now
      };
      
      const updatedCategories = [...categories, newCategory];
      saveCategories(updatedCategories);
      return { success: true };
    } catch (error) {
      console.error('Error adding category:', error);
      return { success: false };
    }
  }, [categories]);

  const updateCategory = useCallback((id: string, name: string, description?: string): { success: boolean } => {
    try {
      const updatedCategories = categories.map(cat => 
        cat.id === id 
          ? { ...cat, name, description, updatedAt: new Date() } 
          : cat
      );
      saveCategories(updatedCategories);
      return { success: true };
    } catch (error) {
      console.error('Error updating category:', error);
      return { success: false };
    }
  }, [categories]);

  const deleteCategory = useCallback((id: string): { success: boolean } => {
    try {
      const productsInCategory = products.filter(p => p.category === categories.find(c => c.id === id)?.name);
      
      if (productsInCategory.length > 0) {
        console.warn('Cannot delete category with existing products');
        return { success: false };
      }
      
      const updatedCategories = categories.filter(cat => cat.id !== id);
      saveCategories(updatedCategories);
      return { success: true };
    } catch (error) {
      console.error('Error deleting category:', error);
      return { success: false };
    }
  }, [categories, products]);

  // Product operations
  const addProduct = useCallback((
    name: string,
    category: string,
    initialQuantity: number,
    unit: string,
    reorderLevel: number
  ): { success: boolean; errors?: string[] } => {
    try {
      const now = new Date();
      const productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
        name,
        category,
        quantityOnHand: initialQuantity,
        quantityBooked: 0,
        availableQuantity: initialQuantity,
        unit,
        status: getStockStatus(initialQuantity, reorderLevel) as any,
        reorderLevel
      };

      const validation = validateProduct(productData as any);
      if (validation.length > 0) {
        console.error('Product validation failed:', validation);
        return { success: false, errors: validation };
      }

      const newProduct: Product = {
        ...productData,
        id: generateId(),
        createdAt: now,
        updatedAt: now
      };

      const updatedProducts = [...products, newProduct];
      saveProducts(updatedProducts, 'add');
      
      // Create initial stock movement
      const movement: InventoryMovement = {
        id: generateId(),
        productId: newProduct.id,
        productName: newProduct.name,
        movementType: 'adjustment',
        quantity: newProduct.quantityOnHand,
        previousQuantity: 0,
        newQuantity: newProduct.quantityOnHand,
        reference: 'Initial stock',
        notes: `Initial stock for ${newProduct.name}`,
        date: now,
        createdAt: now,
        updatedAt: now
      };
      const updatedMovements = [...movements, movement];
      saveMovements(updatedMovements);

      return { success: true };
    } catch (error) {
      console.error('Error adding product:', error);
      return { success: false, errors: ['Failed to add product'] };
    }
  }, [products, movements]);

  const updateProduct = useCallback((id: string, updates: Partial<Product>): { success: boolean; errors?: string[] } => {
    try {
      const updatedProducts = products.map(product => {
        if (product.id === id) {
          const updatedProduct = {
            ...product,
            ...updates,
            status: getStockStatus(
              updates.quantityOnHand !== undefined ? updates.quantityOnHand : product.quantityOnHand,
              updates.reorderLevel !== undefined ? updates.reorderLevel : product.reorderLevel
            ) as any,
            updatedAt: new Date()
          };
          return updatedProduct;
        }
        return product;
      });

      saveProducts(updatedProducts, 'update');
      return { success: true };
    } catch (error) {
      console.error('Error updating product:', error);
      return { success: false, errors: ['Failed to update product'] };
    }
  }, [products]);

  const deleteProduct = useCallback((id: string): { success: boolean } => {
    try {
      const updatedProducts = products.filter(product => product.id !== id);
      saveProducts(updatedProducts, 'delete');
      return { success: true };
    } catch (error) {
      console.error('Error deleting product:', error);
      return { success: false };
    }
  }, [products]);

  const addMovement = useCallback((movement: Omit<InventoryMovement, 'id' | 'createdAt'>): { success: boolean } => {
    try {
      const product = products.find(p => p.id === movement.productId);
      if (!product) {
        console.error('Product not found');
        return { success: false };
      }

      const newQuantity = movement.movementType === 'production' || movement.movementType === 'return' 
        ? product.quantityOnHand + movement.quantity 
        : product.quantityOnHand - movement.quantity;

      if (newQuantity < 0) {
        console.error('Insufficient stock');
        return { success: false };
      }

      const newMovement: InventoryMovement = {
        ...movement,
        id: generateId(),
        createdAt: new Date()
      };

      const updatedMovements = [...movements, newMovement];
      saveMovements(updatedMovements);

      // Update product quantity
      updateProduct(product.id, { quantityOnHand: newQuantity });

      return { success: true };
    } catch (error) {
      console.error('Error adding movement:', error);
      return { success: false };
    }
  }, [products, movements, updateProduct]);

  const adjustStock = useCallback((
    productId: string, 
    newQuantity: number, 
    reason: string,
    notes?: string
  ): { success: boolean } => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) {
        console.error('Product not found');
        return { success: false };
      }

      const difference = newQuantity - product.quantityOnHand;
      const now = new Date();
      const movement: InventoryMovement = {
        id: generateId(),
        productId: productId,
        productName: product.name,
        movementType: 'adjustment',
        quantity: Math.abs(difference),
        previousQuantity: product.quantityOnHand,
        newQuantity: newQuantity,
        reference: 'Stock adjustment',
        notes: notes || `Stock adjustment: ${reason}`,
        date: now,
        createdAt: now,
        updatedAt: now
      };

      const updatedMovements = [...movements, movement];
      saveMovements(updatedMovements);

      updateProduct(productId, { quantityOnHand: newQuantity });
      return { success: true };
    } catch (error) {
      console.error('Error adjusting stock:', error);
      return { success: false };
    }
  }, [products, movements, updateProduct]);

  const addProductionEntry = useCallback((
    productId: string,
    quantityProduced: number,
    notes?: string
  ): { success: boolean } => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) {
        console.error('Product not found');
        return { success: false };
      }

      const now = new Date();
      const newEntry: ProductionEntry = {
        id: generateId(),
        productId,
        productName: product.name,
        quantity: quantityProduced,
        date: now,
        notes,
        createdAt: now,
        updatedAt: now
      };

      const updatedProduction = [...productionEntries, newEntry];
      saveProduction(updatedProduction);

      // Create inventory movement
      const movement: InventoryMovement = {
        id: generateId(),
        productId: productId,
        productName: product.name,
        movementType: 'production',
        quantity: quantityProduced,
        previousQuantity: product.quantityOnHand,
        newQuantity: product.quantityOnHand + quantityProduced,
        reference: 'Production',
        notes: `Production: ${notes || 'Production entry'}`,
        date: now,
        createdAt: now,
        updatedAt: now
      };
      const updatedMovements = [...movements, movement];
      saveMovements(updatedMovements);

      // Update product quantity
      const newQuantity = product.quantityOnHand + quantityProduced;
      updateProduct(productId, { quantityOnHand: newQuantity });

      return { success: true };
    } catch (error) {
      console.error('Error adding production entry:', error);
      return { success: false };
    }
  }, [products, productionEntries, movements, updateProduct]);

  const getProductById = useCallback((id: string): Product | undefined => {
    return products.find(p => p.id === id);
  }, [products]);

  const getAvailableQuantity = useCallback((productId: string): number => {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    
    return product.availableQuantity || product.quantityOnHand;
  }, [products]);

  // Force sync method - delegate to global sync manager
  const forceSync = useCallback(async () => {
    if (isAuthenticated && mountedRef.current) {
      console.log('Force sync triggered');
      await globalSyncManager.forceSync();
    }
  }, [isAuthenticated]);

  return {
    products,
    categories,
    movements,
    productionEntries,
    loading,
    pendingChanges,
    lastSyncError,
    syncInProgress: syncPending,
    addCategory,
    updateCategory,
    deleteCategory,
    addProduct,
    updateProduct,
    deleteProduct,
    addMovement,
    adjustStock,
    addProductionEntry,
    getProductById,
    getAvailableQuantity,
    forceSync,
    refreshData: loadData
  };
};