import { useState, useEffect, useCallback } from 'react';
import type { Product, ProductCategory, InventoryMovement, ProductionEntry } from '../types';
import { generateId } from '../utils/storage';
import { 
  calculateAvailableQuantity, 
  getStockStatus, 
  createMovement,
  validateProduct 
} from '../utils/inventory';
import dataService from '../services/dataService';

export const useInventoryWithPersistence = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [productionEntries, setProductionEntries] = useState<ProductionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await dataService.load();
      
      const storedProducts = dataService.getData('inventory.products') || [];
      const storedCategories = dataService.getData('inventory.categories') || getDefaultCategories();
      const storedMovements = dataService.getData('inventory.movements') || [];
      const storedProduction = dataService.getData('inventory.productionEntries') || [];

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

  const getDefaultCategories = (): ProductCategory[] => {
    const now = new Date();
    const defaultCategories = [
      { id: generateId(), name: 'PP Bags', description: 'Polypropylene bags', createdAt: now, updatedAt: now },
      { id: generateId(), name: 'HDPE Bags', description: 'High-density polyethylene bags', createdAt: now, updatedAt: now },
      { id: generateId(), name: 'Woven Bags', description: 'Woven fabric bags', createdAt: now, updatedAt: now },
      { id: generateId(), name: 'Laminated Bags', description: 'Laminated bags', createdAt: now, updatedAt: now },
      { id: generateId(), name: 'Jumbo Bags', description: 'Large capacity bags', createdAt: now, updatedAt: now },
    ];
    dataService.setData('inventory.categories', defaultCategories);
    return defaultCategories;
  };

  const saveToDataService = useCallback((key: string, data: any) => {
    dataService.setData(`inventory.${key}`, data);
  }, []);

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
      saveToDataService('categories', updatedCategories);
      return true;
    } catch (error) {
      console.error('Error adding category:', error);
      return false;
    }
  }, [categories, saveToDataService]);

  const updateCategory = useCallback((id: string, name: string, description?: string): boolean => {
    try {
      const updatedCategories = categories.map(cat => 
        cat.id === id 
          ? { ...cat, name, description, updatedAt: new Date() } 
          : cat
      );
      setCategories(updatedCategories);
      saveToDataService('categories', updatedCategories);
      return true;
    } catch (error) {
      console.error('Error updating category:', error);
      return false;
    }
  }, [categories, saveToDataService]);

  const deleteCategory = useCallback((id: string): boolean => {
    try {
      const productsInCategory = products.filter(p => p.category === categories.find(c => c.id === id)?.name);
      
      if (productsInCategory.length > 0) {
        console.warn('Cannot delete category with existing products');
        return false;
      }
      
      const updatedCategories = categories.filter(cat => cat.id !== id);
      setCategories(updatedCategories);
      saveToDataService('categories', updatedCategories);
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  }, [categories, products, saveToDataService]);

  const addProduct = useCallback((
    name: string,
    category: string,
    initialQuantity: number,
    unit: string = 'pcs',
    price: number = 0,
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
      saveToDataService('products', updatedProducts);

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
        saveToDataService('movements', updatedMovements);
      }

      return { success: true, product: newProduct };
    } catch (error) {
      console.error('Error adding product:', error);
      return { success: false, errors: ['Failed to add product'] };
    }
  }, [products, movements, saveToDataService]);

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
      saveToDataService('products', updatedProducts);
      return { success: true };
    } catch (error) {
      console.error('Error updating product:', error);
      return { success: false, errors: ['Failed to update product'] };
    }
  }, [products, saveToDataService]);

  const deleteProduct = useCallback((id: string): boolean => {
    try {
      const updatedProducts = products.filter(product => product.id !== id);
      setProducts(updatedProducts);
      saveToDataService('products', updatedProducts);
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      return false;
    }
  }, [products, saveToDataService]);

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
      
      saveToDataService('products', updatedProducts);
      saveToDataService('productionEntries', updatedProduction);
      saveToDataService('movements', updatedMovements);

      return true;
    } catch (error) {
      console.error('Error adding production entry:', error);
      return false;
    }
  }, [products, productionEntries, movements, saveToDataService]);

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
      
      saveToDataService('products', updatedProducts);
      saveToDataService('movements', updatedMovements);

      return true;
    } catch (error) {
      console.error('Error adjusting stock:', error);
      return false;
    }
  }, [products, movements, saveToDataService]);

  const bookStock = useCallback((
    productId: string,
    quantity: number,
    _referenceType: string,
    _referenceId: string
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
      saveToDataService('products', updatedProducts);

      return true;
    } catch (error) {
      console.error('Error booking stock:', error);
      return false;
    }
  }, [products, saveToDataService]);

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
      saveToDataService('products', updatedProducts);

      return true;
    } catch (error) {
      console.error('Error releasing stock:', error);
      return false;
    }
  }, [products, saveToDataService]);

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
      
      saveToDataService('products', updatedProducts);
      saveToDataService('movements', updatedMovements);

      return true;
    } catch (error) {
      console.error('Error consuming stock:', error);
      return false;
    }
  }, [products, movements, saveToDataService]);

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