import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { ToastContainer } from '../components/ui/Toast';
import { Plus, Tags, Factory, Upload, Download, FileJson, Settings, MoreVertical } from 'lucide-react';
import type { Product } from '../types';
import { useInventory } from '../hooks/useInventory';
import { useToast } from '../hooks/useToast';
import { storage } from '../utils/storage';
import { InventoryStats } from '../components/inventory/InventoryStats';
import { InventoryFilters } from '../components/inventory/InventoryFilters';
import { InventoryTable } from '../components/inventory/InventoryTable';
import { CategoryModal } from '../components/inventory/CategoryModal';
import { AddProductModal } from '../components/inventory/AddProductModal';
import { EditProductModal } from '../components/inventory/EditProductModal';
import { ProductionModal } from '../components/inventory/ProductionModal';
import { MovementModal } from '../components/inventory/MovementModal';
import { StockAdjustmentModal } from '../components/inventory/StockAdjustmentModal';
import { BookedStockModal } from '../components/inventory/BookedStockModal';
import {
  exportInventoryToJSON,
  exportInventoryToCSV,
  importInventoryFromJSON,
  downloadFile
} from '../utils/inventory';

export const Inventory = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [viewingBookedStockProduct, setViewingBookedStockProduct] = useState<Product | null>(null);
  
  const {
    products,
    categories,
    movements,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    addProduct,
    updateProduct,
    deleteProduct,
    addBatchProductionEntries,
    adjustStock,
    refreshData: refresh
  } = useInventory();
  
  const { toasts, showSuccess, showError, removeToast } = useToast();

  // Handle deep linking from search
  useEffect(() => {
    const state = location.state as { openProductId?: string } | null;
    if (state?.openProductId && products.length > 0) {
      const product = products.find(p => p.id === state.openProductId);
      if (product) {
        setSelectedProduct(product);
      }
    }
  }, [location.state, products]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.settings-dropdown')) {
        setShowSettingsMenu(false);
      }
      if (!target.closest('.mobile-menu-dropdown')) {
        setShowMobileMenu(false);
      }
    };
    
    if (showSettingsMenu || showMobileMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showSettingsMenu, showMobileMenu]);

  const handleAddProduct = async (name: string, category: string, initialQuantity: number, unit: string, reorderLevel: number) => {
    const result = await addProduct(name, category, initialQuantity, unit, reorderLevel);
    if (result.success) {
      showSuccess(`Product "${name}" added successfully`);
      return { success: true };
    } else {
      return result;
    }
  };
  
  const handleDeleteProduct = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    const result = await deleteProduct(productId);
    if (result.success) {
      showSuccess(`Product "${product?.name}" deleted`);
    } else {
      showError('Failed to delete product');
    }
  };
  
  const handleProductionEntry = async (entries: Array<{ productId: string; quantity: number; notes?: string }>) => {
    const result = await addBatchProductionEntries(entries);
    
    if (result.success && result.failedProducts.length === 0) {
      showSuccess(`Production added for ${result.successCount} product${result.successCount > 1 ? 's' : ''}`);
    } else if (result.success && result.failedProducts.length > 0) {
      showError(`Added ${result.successCount} entries, failed for ${result.failedProducts.join(', ')}`);
    } else {
      showError('Failed to add production entries');
    }

    return result;
  };
  
  const handleAdjustStock = async (productId: string, newQuantity: number, reason: string, notes?: string) => {
    const result = await adjustStock(productId, newQuantity, reason, notes);
    if (result.success) {
      showSuccess('Stock adjusted successfully');
    } else {
      showError('Failed to adjust stock');
    }
    return result.success;
  };
  
  const handleExport = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const json = exportInventoryToJSON(products);
      downloadFile(json, `inventory_${new Date().toISOString().split('T')[0]}.json`, 'json');
      showSuccess('Inventory exported as JSON');
    } else {
      const csv = exportInventoryToCSV(products);
      downloadFile(csv, `inventory_${new Date().toISOString().split('T')[0]}.csv`, 'csv');
      showSuccess('Inventory exported as CSV');
    }
  };
  
  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const text = await file.text();
      const imported = importInventoryFromJSON(text);
      
      if (imported) {
        for (const product of imported) {
          await addProduct(
            product.name,
            product.category,
            product.quantityOnHand,
            product.unit,
            product.reorderLevel
          );
        }
        showSuccess(`Imported ${imported.length} products`);
        refresh();
      } else {
        showError('Failed to import inventory. Please check the file format.');
      }
    };
    input.click();
  };
  
  const handleBackup = () => {
    const backup = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      products,
      categories,
      movements,
      productionEntries: []
    };
    const jsonStr = JSON.stringify(backup, null, 2);
    downloadFile(jsonStr, `inventory_backup_${new Date().toISOString().split('T')[0]}.json`, 'json');
    showSuccess('Backup created successfully');
  };
  
  const handleRestore = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const text = await file.text();
      try {
        const backup = JSON.parse(text);
        
        // Restore data to localStorage
        if (backup.products) {
          storage.set('products', backup.products);
        }
        if (backup.categories) {
          storage.set('product_categories', backup.categories);
        }
        if (backup.movements) {
          storage.set('inventory_movements', backup.movements);
        }
        if (backup.productionEntries) {
          storage.set('production_entries', backup.productionEntries);
        }
        
        showSuccess('Backup restored successfully');
        refresh();
      } catch (error) {
        console.error('Restore error:', error);
        showError('Failed to restore backup. Please check the file format.');
      }
    };
    input.click();
  };
  
  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setStockFilter('');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Inventory Management</h1>
          <p className="text-muted text-sm sm:text-base">Track production, manage stock levels, and monitor movements</p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-start">
          {/* Mobile dropdown menu */}
          <div className="relative mobile-menu-dropdown sm:hidden">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMobileMenu(!showMobileMenu);
              }}
              className="p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
              title="More Options"
            >
              <MoreVertical size={20} />
            </button>
            {showMobileMenu && (
              <div className="absolute right-0 top-full mt-2 rounded-lg shadow-xl z-50 py-1 min-w-[160px] bg-gray-900 border border-white/20 animate-fadeIn">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCategoryModal(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <Tags size={16} />
                  Categories
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProductionModal(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <Factory size={16} />
                  Production
                </button>
              </div>
            )}
          </div>
          
          {/* Desktop buttons */}
          <div className="hidden sm:flex gap-2">
            <Button variant="secondary" onClick={() => setShowCategoryModal(true)}>
              <Tags size={20} />
              Categories
            </Button>
            <Button variant="secondary" onClick={() => setShowProductionModal(true)}>
              <Factory size={20} />
              Production
            </Button>
          </div>
          
          {/* Add Product button always visible - perfect square on mobile */}
          <button
            onClick={() => setShowAddProductModal(true)}
            className="w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-white text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            title="Add Product"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Product</span>
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              </div>
              <p className="text-sm text-muted mt-3">Loading inventory...</p>
            </div>
          </div>
        </div>
      ) : (
        <InventoryStats products={products} movements={movements} />
      )}
      
      <GlassCard>
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-semibold">Product Inventory</h2>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <button 
                onClick={handleImport}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg hover:bg-white/10 transition-all duration-200"
                title="Import"
              >
                <Upload size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button 
                onClick={() => handleExport('csv')}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg hover:bg-white/10 transition-all duration-200"
                title="Export CSV"
              >
                <Download size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              <button 
                onClick={() => handleExport('json')}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg hover:bg-white/10 transition-all duration-200"
                title="Export JSON"
              >
                <FileJson size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Export JSON</span>
              </button>
              <div className="relative settings-dropdown">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettingsMenu(!showSettingsMenu);
                  }}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                  title="Settings"
                >
                  <Settings size={14} className="sm:w-4 sm:h-4" />
                </button>
                {showSettingsMenu && (
                  <div className="absolute right-0 top-full mt-2 rounded-lg shadow-xl z-50 py-1 min-w-[140px] bg-gray-900 border border-white/20 animate-fadeIn">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBackup();
                        setShowSettingsMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors"
                    >
                      Create Backup
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore();
                        setShowSettingsMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors"
                    >
                      Restore Backup
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <InventoryFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            stockFilter={stockFilter}
            onStockFilterChange={setStockFilter}
            categories={categories}
            onClearFilters={clearFilters}
          />
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              </div>
              <p className="text-sm text-muted mt-3">Syncing with GitHub...</p>
            </div>
          </div>
        ) : (
          <InventoryTable
            products={products}
            searchTerm={searchTerm}
            categoryFilter={categoryFilter}
            stockFilter={stockFilter}
            onEditProduct={setEditingProduct}
            onDeleteProduct={handleDeleteProduct}
            onViewMovement={(product) => {
              setSelectedProduct(product);
              setShowMovementModal(true);
            }}
            onAdjustStock={(product) => {
              setSelectedProduct(product);
              setShowAdjustmentModal(true);
            }}
            onViewBookedStock={(product) => {
              setViewingBookedStockProduct(product);
            }}
          />
        )}
      </GlassCard>
      
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={categories}
        onAddCategory={async (name, desc) => {
          const result = await addCategory(name, desc);
          if (result.success) showSuccess('Category added successfully');
          return result;
        }}
        onUpdateCategory={async (id, name, desc) => {
          const result = await updateCategory(id, name, desc);
          if (result.success) showSuccess('Category updated successfully');
          return result;
        }}
        onDeleteCategory={async (id) => {
          const result = await deleteCategory(id);
          if (result.success) showSuccess('Category deleted successfully');
          else showError('Cannot delete category with existing products');
          return result;
        }}
      />
      
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        categories={categories}
        onAddProduct={handleAddProduct}
      />
      
      <EditProductModal
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        product={editingProduct}
        categories={categories}
        onUpdateProduct={async (id, updates) => {
          const result = await updateProduct(id, updates);
          if (result.success) {
            showSuccess('Product updated successfully');
          } else {
            showError('Failed to update product');
          }
          return result;
        }}
      />
      
      <ProductionModal
        isOpen={showProductionModal}
        onClose={() => setShowProductionModal(false)}
        products={products}
        onAddProduction={handleProductionEntry}
      />
      
      <MovementModal
        isOpen={showMovementModal}
        onClose={() => {
          setShowMovementModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        movements={movements}
      />
      
      <StockAdjustmentModal
        isOpen={showAdjustmentModal}
        onClose={() => {
          setShowAdjustmentModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onAdjustStock={handleAdjustStock}
      />
      
      <BookedStockModal
        isOpen={!!viewingBookedStockProduct}
        product={viewingBookedStockProduct}
        onClose={() => setViewingBookedStockProduct(null)}
      />
      
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};