import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Product, ProductCategory } from '../../types';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  categories: ProductCategory[];
  onUpdateProduct: (
    id: string,
    updates: Partial<Product>
  ) => Promise<{ success: boolean; errors?: string[] }> | { success: boolean; errors?: string[] };
}

export const EditProductModal = ({
  isOpen,
  onClose,
  product,
  categories,
  onUpdateProduct
}: EditProductModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: 'bags',
    reorderLevel: 10
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        name: product.name,
        category: product.category,
        unit: product.unit,
        reorderLevel: product.reorderLevel
      });
      setErrors([]);
    }
  }, [product, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    
    setErrors([]);
    setLoading(true);

    const result = await onUpdateProduct(product.id, {
      name: formData.name,
      category: formData.category,
      unit: formData.unit,
      reorderLevel: formData.reorderLevel
    });

    setLoading(false);

    if (result.success) {
      onClose();
    } else {
      setErrors(result.errors || ['Failed to update product']);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button 
        variant="primary" 
        onClick={handleSubmit}
        loading={loading}
        loadingText="Updating..."
      >
        Update Product
      </Button>
    </>
  );

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Product"
      footer={footer}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.length > 0 && (
          <div className="p-3 rounded-lg bg-red-500/20 text-red-400">
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Product Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-muted-text"
            placeholder="Enter product name"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-gray-100"
            required
            disabled={loading}
          >
            {categories.length === 0 ? (
              <option value="">No categories available</option>
            ) : (
              categories.map(cat => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Unit</label>
            <select
              value={formData.unit}
              onChange={(e) => handleInputChange('unit', e.target.value)}
              className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-gray-100"
              disabled={loading}
            >
              <option value="bags">Bags</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Reorder Level</label>
            <input
              type="number"
              value={formData.reorderLevel}
              onChange={(e) => handleInputChange('reorderLevel', Number(e.target.value))}
              className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
              min="0"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="p-3 rounded-lg glass">
          <p className="text-sm text-muted">Current Stock Information:</p>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div>
              <p className="text-xs text-muted">On Hand</p>
              <p className="font-medium">{product.quantityOnHand}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Booked</p>
              <p className="font-medium">{product.quantityBooked}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Available</p>
              <p className="font-medium">{product.availableQuantity}</p>
            </div>
          </div>
        </div>

        <div className="text-sm text-muted">
          <p>Note: Stock quantities cannot be edited directly. Use Production Entry or Stock Adjustment instead.</p>
        </div>
      </form>
    </Modal>
  );
};