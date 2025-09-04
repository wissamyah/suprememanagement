import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { ProductCategory } from '../../types';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ProductCategory[];
  onAddProduct: (
    name: string,
    category: string,
    initialQuantity: number,
    unit: string,
    reorderLevel: number
  ) => { success: boolean; errors?: string[] };
}

export const AddProductModal = ({
  isOpen,
  onClose,
  categories,
  onAddProduct
}: AddProductModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    initialQuantity: 0,
    unit: 'bags',
    reorderLevel: 10
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        category: categories.length > 0 ? categories[0].name : '',
        initialQuantity: 0,
        unit: 'bags',
        reorderLevel: 10
      });
      setErrors([]);
    } else if (categories.length > 0 && !formData.category) {
      setFormData(prev => ({ ...prev, category: categories[0].name }));
    }
  }, [isOpen, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);

    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate async operation
    
    const result = onAddProduct(
      formData.name,
      formData.category,
      formData.initialQuantity,
      formData.unit,
      formData.reorderLevel
    );

    setLoading(false);

    if (result.success) {
      onClose();
    } else {
      setErrors(result.errors || ['Failed to add product']);
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
        loadingText="Adding Product..."
        disabled={loading}
      >
        Add Product
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Product"
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
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            required
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
            <label className="block text-sm font-medium mb-2">Initial Quantity</label>
            <input
              type="number"
              value={formData.initialQuantity}
              onChange={(e) => handleInputChange('initialQuantity', Number(e.target.value))}
              className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Unit</label>
            <select
              value={formData.unit}
              onChange={(e) => handleInputChange('unit', e.target.value)}
              className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <option value="bags">Bags</option>
            </select>
          </div>
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
          />
        </div>

        <div className="text-sm text-muted">
          <p>The product will be added with the specified initial quantity.</p>
          <p>You'll receive an alert when stock falls below the reorder level.</p>
        </div>
      </form>
    </Modal>
  );
};