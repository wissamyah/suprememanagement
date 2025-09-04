import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Product } from '../../types';
import { AlertTriangle, Package } from 'lucide-react';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAdjustStock: (productId: string, newQuantity: number, reason: string, notes?: string) => boolean;
}

export const StockAdjustmentModal = ({
  isOpen,
  onClose,
  product,
  onAdjustStock
}: StockAdjustmentModalProps) => {
  const [formData, setFormData] = useState({
    newQuantity: 0,
    reason: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen || !product) {
      setFormData({
        newQuantity: product?.quantityOnHand || 0,
        reason: '',
        notes: ''
      });
      setError('');
      setSuccess(false);
    } else {
      setFormData(prev => ({
        ...prev,
        newQuantity: product.quantityOnHand
      }));
    }
  }, [isOpen, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!product) {
      setError('No product selected');
      return;
    }

    if (!formData.reason.trim()) {
      setError('Adjustment reason is required');
      return;
    }

    if (formData.newQuantity < 0) {
      setError('Quantity cannot be negative');
      return;
    }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate async operation

    const result = onAdjustStock(
      product.id,
      formData.newQuantity,
      formData.reason,
      formData.notes || undefined
    );

    setLoading(false);

    if (result) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setError('Failed to adjust stock');
    }
  };

  if (!product) return null;

  const quantityDifference = formData.newQuantity - product.quantityOnHand;
  const isIncrease = quantityDifference > 0;
  const isDecrease = quantityDifference < 0;

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button 
        variant="primary" 
        onClick={handleSubmit}
        loading={loading}
        loadingText="Adjusting..."
        disabled={loading}
      >
        Adjust Stock
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stock Adjustment"
      footer={footer}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-green-500/20 text-green-400 text-sm">
            Stock adjusted successfully!
          </div>
        )}

        <div className="glass p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 glass rounded-lg">
              <Package size={24} />
            </div>
            <div>
              <h3 className="font-medium">{product.name}</h3>
              <p className="text-sm text-muted">{product.category}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted">Current Quantity:</span>
              <p className="font-medium text-lg">{product.quantityOnHand} {product.unit}</p>
            </div>
            <div>
              <span className="text-muted">Available:</span>
              <p className="font-medium text-lg">{product.availableQuantity} {product.unit}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">New Quantity</label>
          <input
            type="number"
            value={formData.newQuantity}
            onChange={(e) => setFormData({ ...formData, newQuantity: Number(e.target.value) })}
            className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            min="0"
            required
          />
          {quantityDifference !== 0 && (
            <p className={`text-sm mt-1 ${isIncrease ? 'text-green-400' : 'text-red-400'}`}>
              {isIncrease ? '+' : ''}{quantityDifference} {product.unit}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Adjustment Reason</label>
          <select
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            required
          >
            <option value="">Select a reason</option>
            <option value="Physical Count Correction">Physical Count Correction</option>
            <option value="Damage/Loss">Damage/Loss</option>
            <option value="Quality Issue">Quality Issue</option>
            <option value="System Error Correction">System Error Correction</option>
            <option value="Return from Customer">Return from Customer</option>
            <option value="Sample/Testing">Sample/Testing</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-muted-text"
            rows={3}
            placeholder="Add any additional details about this adjustment..."
          />
        </div>

        <div className="p-3 glass rounded-lg text-sm text-muted">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5" />
            <div>
              <p>This adjustment will be logged in the movement history.</p>
              <p>Make sure to document the reason for audit purposes.</p>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};