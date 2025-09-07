// Direct GitHub inventory hook - no localStorage dependency
import { useCallback, useMemo } from 'react';
import { useGitHubData } from './useGitHubData';
import type { Product, ProductCategory, InventoryMovement, ProductionEntry } from '../types';
import { generateId } from '../utils/storage';
import { getStockStatus, validateProduct } from '../utils/inventory';
import { githubDataManager } from '../services/githubDataManager';

export const useInventoryDirect = () => {
  // Use the base hook for each data type
  const {
    data: products,
    loading: productsLoading,
    error: productsError,
    updateData: updateProducts,
    isOnline,
    isSyncing,
    offlineQueueSize,
    refresh,
    forceSync
  } = useGitHubData<Product>({ dataType: 'products', immediate: true });
  
  const {
    data: categories,
    updateData: updateCategories
  } = useGitHubData<ProductCategory>({ dataType: 'categories', immediate: true });
  
  const {
    data: movements,
    updateData: updateMovements
  } = useGitHubData<InventoryMovement>({ dataType: 'movements', immediate: true });
  
  const {
    data: productionEntries,
    updateData: updateProductionEntries
  } = useGitHubData<ProductionEntry>({ dataType: 'productionEntries', immediate: true });
  
  const {
    data: bookedStock,
  } = useGitHubData<any>({ dataType: 'bookedStock' });
  
  // Calculate total booked quantity for a product
  const getTotalBookedQuantity = useCallback((productId: string): number => {
    return bookedStock
      .filter((item: any) => item.productId === productId && item.status === 'active')
      .reduce((total: number, item: any) => total + item.quantity, 0);
  }, [bookedStock]);
  
  // Loading state combines all data types
  const loading = productsLoading;
  const error = productsError;
  
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
      
      // Fire and forget - update in background
      updateCategories([...categories, newCategory]).catch(error => {
        console.error('Failed to sync category to GitHub:', error);
      });
      return { success: true };
    } catch (error) {
      console.error('Error adding category:', error);
      return { success: false };
    }
  }, [categories, updateCategories]);
  
  const updateCategory = useCallback((id: string, name: string, description?: string): { success: boolean } => {
    try {
      const updatedCategories = categories.map(cat => 
        cat.id === id 
          ? { ...cat, name, description, updatedAt: new Date() } 
          : cat
      );
      // Fire and forget - update in background
      updateCategories(updatedCategories).catch(error => {
        console.error('Failed to sync category update to GitHub:', error);
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating category:', error);
      return { success: false };
    }
  }, [categories, updateCategories]);
  
  const deleteCategory = useCallback((id: string): { success: boolean } => {
    try {
      const productsInCategory = products.filter(p => p.category === categories.find(c => c.id === id)?.name);
      
      if (productsInCategory.length > 0) {
        console.warn('Cannot delete category with existing products');
        return { success: false };
      }
      
      const updatedCategories = categories.filter(cat => cat.id !== id);
      // Fire and forget - update in background
      updateCategories(updatedCategories).catch(error => {
        console.error('Failed to sync category deletion to GitHub:', error);
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting category:', error);
      return { success: false };
    }
  }, [categories, products, updateCategories]);
  
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
      
      // Fire and forget - update in background
      updateProducts([...products, newProduct]).catch(error => {
        console.error('Failed to sync product to GitHub:', error);
      });
      
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
      
      // Fire and forget - update in background
      updateMovements([...movements, movement]).catch(error => {
        console.error('Failed to sync movement to GitHub:', error);
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error adding product:', error);
      return { success: false, errors: ['Failed to add product'] };
    }
  }, [products, movements, updateProducts, updateMovements]);
  
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
      
      // Fire and forget - update in background
      updateProducts(updatedProducts).catch(error => {
        console.error('Failed to sync product update to GitHub:', error);
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating product:', error);
      return { success: false, errors: ['Failed to update product'] };
    }
  }, [products, updateProducts]);
  
  const deleteProduct = useCallback((id: string): { success: boolean } => {
    try {
      const productToDelete = products.find(p => p.id === id);
      if (!productToDelete) {
        console.error('Product not found for deletion');
        return { success: false };
      }
      
      console.log(`Deleting product: ${productToDelete.name} (${id})`);
      
      const updatedProducts = products.filter(product => product.id !== id);
      const updatedMovements = movements.filter(m => m.productId !== id);
      
      // Start batch update to avoid conflicts
      githubDataManager.startBatchUpdate();
      
      // Fire and forget - update all in background
      const updates = Promise.all([
        updateProducts(updatedProducts),
        updateMovements(updatedMovements)
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
      console.error('Error deleting product:', error);
      return { success: false };
    }
  }, [products, movements, updateProducts, updateMovements]);
  
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
      
      const now = new Date();
      const newMovement: InventoryMovement = {
        ...movement,
        id: generateId(),
        createdAt: now
      };
      
      // Update movements
      const updatedMovements = [...movements, newMovement];
      updateMovements(updatedMovements).catch(error => {
        console.error('Failed to sync movement to GitHub:', error);
      });
      
      // Update product quantity directly
      const updatedProducts = products.map(p => {
        if (p.id === movement.productId) {
          return {
            ...p,
            quantityOnHand: newQuantity,
            availableQuantity: newQuantity - (p.quantityBooked || 0),
            status: getStockStatus(newQuantity, p.reorderLevel) as any,
            updatedAt: now
          };
        }
        return p;
      });
      
      updateProducts(updatedProducts).catch(error => {
        console.error('Failed to sync product update to GitHub:', error);
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error adding movement:', error);
      return { success: false };
    }
  }, [products, movements, updateMovements, updateProducts]);
  
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
      
      // Update movements first
      const updatedMovements = [...movements, movement];
      updateMovements(updatedMovements).catch(error => {
        console.error('Failed to sync movements to GitHub:', error);
      });
      
      // Then update the product with new quantity
      const updatedProducts = products.map(p => {
        if (p.id === productId) {
          return {
            ...p,
            quantityOnHand: newQuantity,
            availableQuantity: newQuantity - (p.quantityBooked || 0),
            status: getStockStatus(newQuantity, p.reorderLevel) as any,
            updatedAt: now
          };
        }
        return p;
      });
      
      updateProducts(updatedProducts).catch(error => {
        console.error('Failed to sync products to GitHub:', error);
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error adjusting stock:', error);
      return { success: false };
    }
  }, [products, movements, updateMovements, updateProducts]);
  
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
      
      // Fire and forget - update in background
      updateProductionEntries([...productionEntries, newEntry]).catch(error => {
        console.error('Failed to sync production entry to GitHub:', error);
      });
      
      const newQuantity = product.quantityOnHand + quantityProduced;
      
      const movement: InventoryMovement = {
        id: generateId(),
        productId: productId,
        productName: product.name,
        movementType: 'production',
        quantity: quantityProduced,
        previousQuantity: product.quantityOnHand,
        newQuantity: newQuantity,
        reference: 'Production',
        notes: `Production: ${notes || 'Production entry'}`,
        date: now,
        createdAt: now,
        updatedAt: now
      };
      
      // Update movements
      const updatedMovements = [...movements, movement];
      updateMovements(updatedMovements).catch(error => {
        console.error('Failed to sync movements to GitHub:', error);
      });
      
      // Update product with new quantity directly
      const updatedProducts = products.map(p => {
        if (p.id === productId) {
          return {
            ...p,
            quantityOnHand: newQuantity,
            availableQuantity: newQuantity - (p.quantityBooked || 0),
            status: getStockStatus(newQuantity, p.reorderLevel) as any,
            updatedAt: now
          };
        }
        return p;
      });
      
      updateProducts(updatedProducts).catch(error => {
        console.error('Failed to sync product update to GitHub:', error);
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error adding production entry:', error);
      return { success: false };
    }
  }, [products, productionEntries, movements, updateProductionEntries, updateMovements, updateProduct]);
  
  const addBatchProductionEntries = useCallback((
    entries: Array<{ productId: string; quantity: number; notes?: string }>
  ): { success: boolean; successCount: number; failedProducts: string[] } => {
    try {
      const now = new Date();
      const newProductionEntries: ProductionEntry[] = [];
      const newMovements: InventoryMovement[] = [];
      const updatedProducts = [...products];
      let successCount = 0;
      const failedProducts: string[] = [];
      
      for (const entry of entries) {
        const productIndex = updatedProducts.findIndex(p => p.id === entry.productId);
        
        if (productIndex === -1) {
          const product = products.find(p => p.id === entry.productId);
          failedProducts.push(product?.name || 'Unknown');
          continue;
        }
        
        const product = updatedProducts[productIndex];
        
        const productionEntry: ProductionEntry = {
          id: generateId(),
          productId: entry.productId,
          productName: product.name,
          quantity: entry.quantity,
          date: now,
          notes: entry.notes,
          createdAt: now,
          updatedAt: now
        };
        newProductionEntries.push(productionEntry);
        
        const newQuantity = product.quantityOnHand + entry.quantity;
        
        const movement: InventoryMovement = {
          id: generateId(),
          productId: entry.productId,
          productName: product.name,
          movementType: 'production',
          quantity: entry.quantity,
          previousQuantity: product.quantityOnHand,
          newQuantity: newQuantity,
          reference: 'Production',
          notes: `Production: ${entry.notes || 'Production entry'}`,
          date: now,
          createdAt: now,
          updatedAt: now
        };
        newMovements.push(movement);
        
        updatedProducts[productIndex] = {
          ...product,
          quantityOnHand: newQuantity,
          availableQuantity: newQuantity - (product.quantityBooked || 0),
          status: getStockStatus(newQuantity, product.reorderLevel) as any,
          updatedAt: now
        };
        
        successCount++;
      }
      
      if (successCount > 0) {
        // Fire and forget - update in background
        updateProducts(updatedProducts).catch(error => {
          console.error('Failed to sync batch products to GitHub:', error);
        });
        updateProductionEntries([...productionEntries, ...newProductionEntries]).catch(error => {
          console.error('Failed to sync batch production entries to GitHub:', error);
        });
        updateMovements([...movements, ...newMovements]).catch(error => {
          console.error('Failed to sync batch movements to GitHub:', error);
        });
      }
      
      return { 
        success: successCount > 0, 
        successCount,
        failedProducts 
      };
    } catch (error) {
      console.error('Error adding batch production entries:', error);
      return { success: false, successCount: 0, failedProducts: [] };
    }
  }, [products, productionEntries, movements, updateProducts, updateProductionEntries, updateMovements]);
  
  const getProductById = useCallback((id: string): Product | undefined => {
    const product = products.find(p => p.id === id);
    if (product) {
      const actualBookedQty = getTotalBookedQuantity(id);
      return {
        ...product,
        quantityBooked: actualBookedQty,
        availableQuantity: product.quantityOnHand - actualBookedQty
      };
    }
    return product;
  }, [products, getTotalBookedQuantity]);
  
  const getAvailableQuantity = useCallback((productId: string): number => {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    
    const actualBookedQty = getTotalBookedQuantity(productId);
    return product.quantityOnHand - actualBookedQty;
  }, [products, getTotalBookedQuantity]);
  
  // Enhance products with actual booked quantities
  const enhancedProducts = useMemo(() => {
    return products.map(product => {
      const actualBookedQty = getTotalBookedQuantity(product.id);
      return {
        ...product,
        quantityBooked: actualBookedQty,
        availableQuantity: product.quantityOnHand - actualBookedQty
      };
    });
  }, [products, getTotalBookedQuantity]);
  
  return {
    // Data
    products: enhancedProducts,
    categories,
    movements,
    productionEntries,
    bookedStock,
    
    // Status
    loading,
    error,
    isOnline,
    syncInProgress: isSyncing,
    pendingChanges: offlineQueueSize,
    lastSyncError: error,
    
    // Category operations
    addCategory,
    updateCategory,
    deleteCategory,
    
    // Product operations
    addProduct,
    updateProduct,
    deleteProduct,
    
    // Movement operations
    addMovement,
    adjustStock,
    
    // Production operations
    addProductionEntry,
    addBatchProductionEntries,
    
    // Utility functions
    getProductById,
    getAvailableQuantity,
    
    // Sync operations
    forceSync,
    refreshData: refresh
  };
};