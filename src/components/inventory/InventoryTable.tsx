import { useState, useMemo } from 'react';
import type { Product } from '../../types';
import { Button } from '../ui/Button';
import { DropdownMenu } from './DropdownMenu';
import { ConfirmModal } from '../ui/ConfirmModal';
import { 
  AlertTriangle, 
  Edit2,
  Activity,
  ChevronUp,
  ChevronDown,
  CheckSquare,
  Square,
  Package
} from 'lucide-react';

interface InventoryTableProps {
  products: Product[];
  searchTerm: string;
  categoryFilter: string;
  stockFilter: string;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onViewMovement: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
}

type SortField = 'name' | 'category' | 'quantityOnHand' | 'quantityBooked' | 'availableQuantity';
type SortDirection = 'asc' | 'desc';

export const InventoryTable = ({
  products,
  searchTerm,
  categoryFilter,
  stockFilter,
  onEditProduct,
  onDeleteProduct,
  onViewMovement,
  onAdjustStock
}: InventoryTableProps) => {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; product: Product | null }>({ 
    show: false, 
    product: null 
  });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term)
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    if (stockFilter) {
      if (stockFilter === 'low-stock') {
        filtered = filtered.filter(product => 
          product.status === 'low-stock' || product.status === 'out-of-stock'
        );
      } else if (stockFilter === 'out-of-stock') {
        filtered = filtered.filter(product => product.status === 'out-of-stock');
      } else if (stockFilter === 'in-stock') {
        filtered = filtered.filter(product => product.status === 'in-stock');
      }
    }

    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [products, searchTerm, categoryFilter, stockFilter, sortField, sortDirection]);

  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedProducts.size === filteredAndSortedProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredAndSortedProducts.map(p => p.id)));
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp size={14} /> : 
      <ChevronDown size={14} />;
  };

  const getStockIndicator = (product: Product) => {
    if (product.status === 'out-of-stock') {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400 flex items-center gap-1">
          <AlertTriangle size={12} />
          Out of Stock
        </span>
      );
    } else if (product.status === 'low-stock') {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
          <AlertTriangle size={12} />
          Low Stock
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
        In Stock
      </span>
    );
  };

  if (filteredAndSortedProducts.length === 0) {
    return (
      <div className="glass rounded-lg p-12 text-center">
        <Package size={48} className="mx-auto mb-4 text-muted" />
        <h3 className="text-lg font-medium mb-2">No Products Found</h3>
        <p className="text-muted">
          {searchTerm || categoryFilter || stockFilter 
            ? 'Try adjusting your filters or search term'
            : 'Add your first product to get started'}
        </p>
      </div>
    );
  }

  const handleDeleteProduct = (productId: string) => {
    onDeleteProduct(productId);
    setDeleteConfirm({ show: false, product: null });
  };

  const handleBulkDelete = () => {
    selectedProducts.forEach(id => onDeleteProduct(id));
    setSelectedProducts(new Set());
    setBulkDeleteConfirm(false);
  };

  return (
    <>
      {selectedProducts.size > 0 && (
        <div className="glass p-3 rounded-lg mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="text-sm">
            {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedProducts(new Set())}>
              Clear
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setBulkDeleteConfirm(true)}
              className="text-red-400 hover:text-red-300"
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="sm:hidden">
        <div className="space-y-3">
          {filteredAndSortedProducts.map((product) => (
            <div
              key={product.id}
              className={`glass rounded-lg p-4 ${
                selectedProducts.has(product.id) ? 'ring-2 ring-white/20' : ''
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => toggleProductSelection(product.id)}
                    className="p-1 rounded hover:bg-glass transition-colors mt-1"
                  >
                    {selectedProducts.has(product.id) ? 
                      <CheckSquare size={18} /> : 
                      <Square size={18} />
                    }
                  </button>
                  <div className="flex-1">
                    <p className="font-medium text-base">{product.name}</p>
                    <p className="text-xs text-muted mt-1">{product.category} • {product.unit}</p>
                  </div>
                </div>
                <div className="text-right">
                  {getStockIndicator(product)}
                </div>
              </div>

              {/* Stock Information */}
              <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                <div>
                  <span className="text-xs text-muted block">On Hand</span>
                  <span className="font-medium">{product.quantityOnHand}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Booked</span>
                  <span className={product.quantityBooked > 0 ? 'text-yellow-400' : ''}>
                    {product.quantityBooked}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Available</span>
                  <span className={`font-medium ${
                    product.availableQuantity === 0 ? 'text-red-400' :
                    product.availableQuantity <= product.reorderLevel ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {product.availableQuantity}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1 justify-end border-t border-white/5 pt-3">
                <button
                  onClick={() => onEditProduct(product)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200"
                  title="Edit Product"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onViewMovement(product)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200"
                  title="View Movement"
                >
                  <Activity size={16} />
                </button>
                <DropdownMenu
                  onAdjustStock={() => onAdjustStock(product)}
                  onDelete={() => setDeleteConfirm({ show: true, product })}
                  productName={product.name}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left py-3 px-3">
              <button
                onClick={toggleAllSelection}
                className="p-1 rounded hover:bg-glass transition-colors"
              >
                {selectedProducts.size === filteredAndSortedProducts.length && filteredAndSortedProducts.length > 0 ? 
                  <CheckSquare size={18} /> : 
                  <Square size={18} />
                }
              </button>
            </th>
            <th className="text-left py-3 px-3">
              <button
                onClick={() => handleSort('name')}
                className="flex items-center gap-1 hover:text-white/80 transition-colors"
              >
                Product
                {getSortIcon('name')}
              </button>
            </th>
            <th className="text-left py-3 px-3">
              <button
                onClick={() => handleSort('category')}
                className="flex items-center gap-1 hover:text-white/80 transition-colors"
              >
                Category
                {getSortIcon('category')}
              </button>
            </th>
            <th className="text-right py-3 px-3">
              <button
                onClick={() => handleSort('quantityOnHand')}
                className="flex items-center gap-1 hover:text-white/80 transition-colors ml-auto"
              >
                On Hand
                {getSortIcon('quantityOnHand')}
              </button>
            </th>
            <th className="text-right py-3 px-3">
              <button
                onClick={() => handleSort('quantityBooked')}
                className="flex items-center gap-1 hover:text-white/80 transition-colors ml-auto"
              >
                Booked
                {getSortIcon('quantityBooked')}
              </button>
            </th>
            <th className="text-right py-3 px-3">
              <button
                onClick={() => handleSort('availableQuantity')}
                className="flex items-center gap-1 hover:text-white/80 transition-colors ml-auto"
              >
                Available
                {getSortIcon('availableQuantity')}
              </button>
            </th>
            <th className="text-center py-3 px-3">Status</th>
            <th className="text-center py-3 px-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredAndSortedProducts.map((product) => (
            <tr 
              key={product.id} 
              className={`border-b border-white/5 hover:bg-glass/50 transition-colors ${
                selectedProducts.has(product.id) ? 'bg-glass/50' : ''
              }`}
            >
              <td className="py-3 px-3">
                <button
                  onClick={() => toggleProductSelection(product.id)}
                  className="p-1 rounded hover:bg-glass transition-colors"
                >
                  {selectedProducts.has(product.id) ? 
                    <CheckSquare size={18} /> : 
                    <Square size={18} />
                  }
                </button>
              </td>
              <td className="py-3 px-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 glass rounded-lg">
                    <Package size={20} />
                  </div>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted">{product.unit}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-3">
                <span className="text-sm">{product.category}</span>
              </td>
              <td className="py-3 px-3 text-right">
                <span className="font-medium">{product.quantityOnHand}</span>
              </td>
              <td className="py-3 px-3 text-right">
                <span className={product.quantityBooked > 0 ? 'text-yellow-400' : ''}>
                  {product.quantityBooked}
                </span>
              </td>
              <td className="py-3 px-3 text-right">
                <span className={`font-medium ${
                  product.availableQuantity === 0 ? 'text-red-400' :
                  product.availableQuantity <= product.reorderLevel ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {product.availableQuantity}
                </span>
              </td>
              <td className="py-3 px-3 text-center">
                {getStockIndicator(product)}
              </td>
              <td className="py-3 px-3">
                <div className="flex justify-center gap-0.5 sm:gap-1 relative">
                  <button
                    onClick={() => onEditProduct(product)}
                    className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                    title="Edit Product"
                  >
                    <Edit2 size={14} className="sm:w-4 sm:h-4" />
                  </button>
                  <button
                    onClick={() => onViewMovement(product)}
                    className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                    title="View Movement"
                  >
                    <Activity size={14} className="sm:w-4 sm:h-4" />
                  </button>
                  <DropdownMenu
                    onAdjustStock={() => onAdjustStock(product)}
                    onDelete={() => setDeleteConfirm({ show: true, product })}
                    productName={product.name}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      
    <ConfirmModal
      isOpen={deleteConfirm.show}
      onClose={() => setDeleteConfirm({ show: false, product: null })}
      onConfirm={() => {
        if (deleteConfirm.product) {
          handleDeleteProduct(deleteConfirm.product.id);
        }
      }}
      title="Delete Product"
      message={`Are you sure you want to delete "${deleteConfirm.product?.name}"? This will also remove all related movement history.`}
      confirmText="Delete Product"
      type="danger"
    />
    
    <ConfirmModal
      isOpen={bulkDeleteConfirm}
      onClose={() => setBulkDeleteConfirm(false)}
      onConfirm={handleBulkDelete}
      title="Delete Multiple Products"
      message={`Are you sure you want to delete ${selectedProducts.size} selected product${selectedProducts.size !== 1 ? 's' : ''}? This action will remove all selected products and their movement history.`}
      confirmText={`Delete ${selectedProducts.size} Product${selectedProducts.size !== 1 ? 's' : ''}`}
      type="danger"
    />
  </>
  );
};