import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Product } from '../../types';
import { Plus, Trash2, Package } from 'lucide-react';
import { formatDate } from '../../utils/dateFormatting';

interface ProductionEntry {
  productId: string;
  productName: string;
  quantity: number;
  notes: string;
}

interface ProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAddProduction: (entries: Array<{ productId: string; quantity: number; notes?: string }>) => Promise<{ success: boolean; successCount: number; failedProducts: string[] }> | { success: boolean; successCount: number; failedProducts: string[] };
}

export const ProductionModal = ({
  isOpen,
  onClose,
  products,
  onAddProduction
}: ProductionModalProps) => {
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().split(' ')[0].slice(0, 5));
  const [errors, setErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEntries([]);
      setDate(new Date().toISOString().split('T')[0]);
      setTime(new Date().toTimeString().split(' ')[0].slice(0, 5));
      setErrors([]);
      setSuccessCount(0);
      setLoading(false);
    } else if (products.length > 0 && entries.length === 0) {
      addNewEntry();
    }
  }, [isOpen, products]);

  const addNewEntry = () => {
    if (products.length === 0) return;
    
    const newEntry: ProductionEntry = {
      productId: products[0].id,
      productName: products[0].name,
      quantity: 0,
      notes: ''
    };
    setEntries([...entries, newEntry]);
  };

  const updateEntry = (index: number, field: keyof ProductionEntry, value: any) => {
    const updatedEntries = [...entries];
    updatedEntries[index] = { ...updatedEntries[index], [field]: value };
    
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        updatedEntries[index].productName = product.name;
      }
    }
    
    setEntries(updatedEntries);
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setErrors([]);
    setSuccessCount(0);
    setLoading(true);
    
    const validEntries = entries.filter(entry => entry.quantity > 0);
    
    if (validEntries.length === 0) {
      setErrors(['Please add at least one product with quantity greater than 0']);
      setLoading(false);
      return;
    }

    const productionDate = new Date(`${date}T${time}`);
    
    // Prepare entries for batch processing
    const productionEntries = validEntries.map(entry => ({
      productId: entry.productId,
      quantity: entry.quantity,
      notes: entry.notes || `Production on ${formatDate(productionDate)}`
    }));
    
    // Call onAddProduction with all entries at once
    const result = await onAddProduction(productionEntries);

    if (result.success) {
      setSuccessCount(validEntries.length);
      setTimeout(() => {
        setLoading(false);
        onClose();
      }, 1500);
    } else {
      setLoading(false);
    }
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
        loadingText="Processing..."
        disabled={loading}
      >
        Add Production
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Production Entry"
      footer={footer}
      size="xl"
    >
      <div className="space-y-4">
        {errors.length > 0 && (
          <div className="p-3 rounded-lg bg-red-500/20 text-red-400">
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </div>
        )}

        {successCount > 0 && (
          <div className="p-3 rounded-lg bg-green-500/20 text-green-400">
            Successfully added production for {successCount} product(s)!
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Production Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Production Items</h3>
            <Button variant="secondary" size="sm" onClick={addNewEntry}>
              <Plus size={18} />
              Add Product
            </Button>
          </div>

          {entries.length === 0 ? (
            <div className="glass p-8 rounded-lg text-center">
              <Package size={48} className="mx-auto mb-3 text-muted" />
              <p className="text-muted">No products added yet</p>
              <p className="text-sm text-muted mt-1">Click "Add Product" to start adding production entries</p>
            </div>
          ) : (
            entries.map((entry, index) => (
              <div key={index} className="glass p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted mb-1">Product</label>
                      <select
                        value={entry.productId}
                        onChange={(e) => updateEntry(index, 'productId', e.target.value)}
                        className="w-full px-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm text-gray-100"
                      >
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.category})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Quantity Produced</label>
                      <input
                        type="number"
                        value={entry.quantity}
                        onChange={(e) => updateEntry(index, 'quantity', Number(e.target.value))}
                        className="w-full px-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
                        min="0"
                        placeholder="Enter quantity"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeEntry(index)}
                    className="ml-3 p-2 rounded-lg hover:bg-glass transition-colors text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Notes (Optional)</label>
                  <input
                    type="text"
                    value={entry.notes}
                    onChange={(e) => updateEntry(index, 'notes', e.target.value)}
                    className="w-full px-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
                    placeholder="Add any notes about this production"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-sm text-muted">
          <p>Production entries will increase the "Quantity on Hand" for selected products.</p>
          <p>All entries will be logged in the movement history for tracking.</p>
        </div>
      </div>
    </Modal>
  );
};