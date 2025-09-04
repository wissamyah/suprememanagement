import { useState, useEffect, useCallback } from 'react';
import type { Product, ProductCategory, InventoryMovement, ProductionEntry } from '../types';
import { storage, generateId } from '../utils/storage';
import { 
  calculateAvailableQuantity, 
  getStockStatus, 
  createMovement,
  validateProduct 
} from '../utils/inventory';

const PRODUCTS_KEY = 'products';
const CATEGORIES_KEY = 'product_categories';
const MOVEMENTS_KEY = 'inventory_movements';
const PRODUCTION_KEY = 'production_entries';

export const useInventory = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [productionEntries, setProductionEntries] = useState<ProductionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    try {
      const storedProducts = storage.get<Product[]>(PRODUCTS_KEY) || [];
      const storedCategories = storage.get<ProductCategory[]>(CATEGORIES_KEY) || [];
      const storedMovements = storage.get<InventoryMovement[]>(MOVEMENTS_KEY) || [];
      const storedProduction = storage.get<ProductionEntry[]>(PRODUCTION_KEY) || [];

      // Debug logging
      console.log('Loading inventory data:', {
        products: storedProducts.length,
        categories: storedCategories.length,
        movements: storedMovements.length,
        production: storedProduction.length
      });

      setProducts(storedProducts);
      setCategories(storedCategories);
      setMovements(storedMovements);
      setProductionEntries(storedProduction);
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
    }
  };


  const addCategory = useCallback((name: string, description?: string): boolean => {
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
      setCategories(updatedCategories);
      storage.set(CATEGORIES_KEY, updatedCategories);
      console.log('Category saved:', newCategory.name);
      return true;
    } catch (error) {
      console.error('Error adding category:', error);
      return false;
    }
  }, [categories]);

  const updateCategory = useCallback((id: string, name: string, description?: string): boolean => {
    try {
      const updatedCategories = categories.map(cat => 
        cat.id === id 
          ? { ...cat, name, description, updatedAt: new Date() } 
          : cat
      );
      setCategories(updatedCategories);
      storage.set(CATEGORIES_KEY, updatedCategories);
      return true;
    } catch (error) {
      console.error('Error updating category:', error);
      return false;
    }
  }, [categories]);

  const deleteCategory = useCallback((id: string): boolean => {
    try {
      const productsInCategory = products.filter(p => p.category === categories.find(c => c.id === id)?.name);
      
      if (productsInCategory.length > 0) {
        console.warn('Cannot delete category with existing products');
        return false;
      }
      
      const updatedCategories = categories.filter(cat => cat.id !== id);
      setCategories(updatedCategories);
      storage.set(CATEGORIES_KEY, updatedCategories);
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  }, [categories, products]);

  const addProduct = useCallback((
    name: string,
    category: string,
    initialQuantity: number,
    unit: string = 'pcs',
    reorderLevel: number = 10
  ): { success: boolean; errors?: string[]; product?: Product } => {
    const now = new Date();
    const newProduct: Product = {
      id: generateId(),
      name,
      category,
      quantityOnHand: initialQuantity,
      quantityBooked: 0,
      availableQuantity: initialQuantity,
      unit,
      reorderLevel,
      status: getStockStatus(initialQuantity, reorderLevel),
      createdAt: now,
      updatedAt: now
    };

    const errors = validateProduct(newProduct);
    if (errors.length > 0) {
      return { success: false, errors };
    }

    try {
      const updatedProducts = [...products, newProduct];
      setProducts(updatedProducts);
      storage.set(PRODUCTS_KEY, updatedProducts);

      if (initialQuantity > 0) {
        const movement = createMovement(
          newProduct.id,
          newProduct.name,
          'adjustment',
          initialQuantity,
          0,
          initialQuantity,
          'Initial Stock',
          undefined,
          'Product created with initial stock'
        );
        const updatedMovements = [...movements, movement];
        setMovements(updatedMovements);
        storage.set(MOVEMENTS_KEY, updatedMovements);
      }

      return { success: true, product: newProduct };
    } catch (error) {
      console.error('Error adding product:', error);
      return { success: false, errors: ['Failed to add product'] };
    }
  }, [products, movements]);

  const updateProduct = useCallback((
    id: string,
    updates: Partial<Product>
  ): { success: boolean; errors?: string[] } => {
    const errors = validateProduct(updates);
    if (errors.length > 0) {
      return { success: false, errors };
    }

    try {
      const updatedProducts = products.map(product => {
        if (product.id === id) {
          const updated = { ...product, ...updates, updatedAt: new Date() };
          updated.availableQuantity = calculateAvailableQuantity(
            updated.quantityOnHand,
            updated.quantityBooked
          );
          updated.status = getStockStatus(updated.availableQuantity, updated.reorderLevel);
          return updated;
        }
        return product;
      });
      
      setProducts(updatedProducts);
      storage.set(PRODUCTS_KEY, updatedProducts);
      return { success: true };
    } catch (error) {
      console.error('Error updating product:', error);
      return { success: false, errors: ['Failed to update product'] };
    }
  }, [products]);

  const deleteProduct = useCallback((id: string): boolean => {
    try {
      const updatedProducts = products.filter(product => product.id !== id);
      setProducts(updatedProducts);
      storage.set(PRODUCTS_KEY, updatedProducts);
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      return false;
    }
  }, [products]);

  const addProductionEntry = useCallback((
    productId: string,
    quantity: number,
    notes?: string,
    date?: Date
  ): boolean => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) {
        console.error('Product not found');
        return false;
      }

      const now = new Date();
      const entryDate = date || now;
      
      const productionEntry: ProductionEntry = {
        id: generateId(),
        productId,
        productName: product.name,
        quantity,
        date: entryDate,
        notes,
        createdAt: now,
        updatedAt: now
      };

      const previousQuantity = product.quantityOnHand;
      const newQuantity = previousQuantity + quantity;

      const movement = createMovement(
        productId,
        product.name,
        'production',
        quantity,
        previousQuantity,
        newQuantity,
        'Production Entry',
        productionEntry.id,
        notes
      );

      const updatedProduct = {
        ...product,
        quantityOnHand: newQuantity,
        availableQuantity: calculateAvailableQuantity(newQuantity, product.quantityBooked),
        status: getStockStatus(
          calculateAvailableQuantity(newQuantity, product.quantityBooked),
          product.reorderLevel
        ),
        updatedAt: now
      };

      const updatedProducts = products.map(p => p.id === productId ? updatedProduct : p);
      const updatedProduction = [...productionEntries, productionEntry];
      const updatedMovements = [...movements, movement];

      setProducts(updatedProducts);
      setProductionEntries(updatedProduction);
      setMovements(updatedMovements);
      
      storage.set(PRODUCTS_KEY, updatedProducts);
      storage.set(PRODUCTION_KEY, updatedProduction);
      storage.set(MOVEMENTS_KEY, updatedMovements);

      return true;
    } catch (error) {
      console.error('Error adding production entry:', error);
      return false;
    }
  }, [products, productionEntries, movements]);

  const adjustStock = useCallback((
    productId: string,
    newQuantity: number,
    reason: string,
    notes?: string
  ): boolean => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) {
        console.error('Product not found');
        return false;
      }

      const previousQuantity = product.quantityOnHand;
      const quantityChange = newQuantity - previousQuantity;

      const movement = createMovement(
        productId,
        product.name,
        'adjustment',
        quantityChange,
        previousQuantity,
        newQuantity,
        reason,
        undefined,
        notes
      );

      const updatedProduct = {
        ...product,
        quantityOnHand: newQuantity,
        availableQuantity: calculateAvailableQuantity(newQuantity, product.quantityBooked),
        status: getStockStatus(
          calculateAvailableQuantity(newQuantity, product.quantityBooked),
          product.reorderLevel
        ),
        updatedAt: new Date()
      };

      const updatedProducts = products.map(p => p.id === productId ? updatedProduct : p);
      const updatedMovements = [...movements, movement];

      setProducts(updatedProducts);
      setMovements(updatedMovements);
      
      storage.set(PRODUCTS_KEY, updatedProducts);
      storage.set(MOVEMENTS_KEY, updatedMovements);

      return true;
    } catch (error) {
      console.error('Error adjusting stock:', error);
      return false;
    }
  }, [products, movements]);

  const bookStock = useCallback((
    productId: string,
    quantity: number,
    referenceType: string,
    referenceId: string
  ): boolean => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) {
        console.error('Product not found');
        return false;
      }

      const newBookedQuantity = product.quantityBooked + quantity;
      const newAvailable = calculateAvailableQuantity(product.quantityOnHand, newBookedQuantity);

      if (newAvailable < 0) {
        console.error('Insufficient stock available');
        return false;
      }

      const updatedProduct = {
        ...product,
        quantityBooked: newBookedQuantity,
        availableQuantity: newAvailable,
        status: getStockStatus(newAvailable, product.reorderLevel),
        updatedAt: new Date()
      };

      const updatedProducts = products.map(p => p.id === productId ? updatedProduct : p);
      setProducts(updatedProducts);
      storage.set(PRODUCTS_KEY, updatedProducts);

      return true;
    } catch (error) {
      console.error('Error booking stock:', error);
      return false;
    }
  }, [products]);

  const releaseStock = useCallback((
    productId: string,
    quantity: number
  ): boolean => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) {
        console.error('Product not found');
        return false;
      }

      const newBookedQuantity = Math.max(0, product.quantityBooked - quantity);
      const newAvailable = calculateAvailableQuantity(product.quantityOnHand, newBookedQuantity);

      const updatedProduct = {
        ...product,
        quantityBooked: newBookedQuantity,
        availableQuantity: newAvailable,
        status: getStockStatus(newAvailable, product.reorderLevel),
        updatedAt: new Date()
      };

      const updatedProducts = products.map(p => p.id === productId ? updatedProduct : p);
      setProducts(updatedProducts);
      storage.set(PRODUCTS_KEY, updatedProducts);

      return true;
    } catch (error) {
      console.error('Error releasing stock:', error);
      return false;
    }
  }, [products]);

  const consumeStock = useCallback((
    productId: string,
    quantity: number,
    movementType: InventoryMovement['movementType'],
    reference?: string,
    referenceId?: string,
    notes?: string
  ): boolean => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) {
        console.error('Product not found');
        return false;
      }

      const previousQuantity = product.quantityOnHand;
      const newQuantity = Math.max(0, previousQuantity - quantity);
      const newBookedQuantity = Math.max(0, product.quantityBooked - quantity);
      const newAvailable = calculateAvailableQuantity(newQuantity, newBookedQuantity);

      const movement = createMovement(
        productId,
        product.name,
        movementType,
        -quantity,
        previousQuantity,
        newQuantity,
        reference,
        referenceId,
        notes
      );

      const updatedProduct = {
        ...product,
        quantityOnHand: newQuantity,
        quantityBooked: newBookedQuantity,
        availableQuantity: newAvailable,
        status: getStockStatus(newAvailable, product.reorderLevel),
        updatedAt: new Date()
      };

      const updatedProducts = products.map(p => p.id === productId ? updatedProduct : p);
      const updatedMovements = [...movements, movement];

      setProducts(updatedProducts);
      setMovements(updatedMovements);
      
      storage.set(PRODUCTS_KEY, updatedProducts);
      storage.set(MOVEMENTS_KEY, updatedMovements);

      return true;
    } catch (error) {
      console.error('Error consuming stock:', error);
      return false;
    }
  }, [products, movements]);

  const getProductMovements = useCallback((productId: string): InventoryMovement[] => {
    return movements
      .filter(m => m.productId === productId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [movements]);

  const getLowStockProducts = useCallback((): Product[] => {
    return products.filter(p => p.status === 'low-stock' || p.status === 'out-of-stock');
  }, [products]);

  return {
    products,
    categories,
    movements,
    productionEntries,
    loading,
    
    addCategory,
    updateCategory,
    deleteCategory,
    
    addProduct,
    updateProduct,
    deleteProduct,
    
    addProductionEntry,
    adjustStock,
    bookStock,
    releaseStock,
    consumeStock,
    
    getProductMovements,
    getLowStockProducts,
    
    refresh: loadData
  };
};