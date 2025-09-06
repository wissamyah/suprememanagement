import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  AlertCircle,
  ShoppingCart,
  Hash
} from 'lucide-react';
import type { Sale, Product } from '../../types';
import { calculateLineTotal, formatCurrency } from '../../utils/sales';

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

interface EditSaleModalProps {
  isOpen: boolean;
  sale: Sale | null;
  onClose: () => void;
  onUpdate: (
    id: string,
    updates: Partial<Omit<Sale, 'id' | 'orderId' | 'createdAt' | 'updatedAt'>>
  ) => { success: boolean; errors?: string[] };
  products: Product[];
}

export const EditSaleModal = ({ 
  isOpen, 
  sale,
  onClose, 
  onUpdate,
  products
}: EditSaleModalProps) => {
  const [date, setDate] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  // Status is read-only - automatically managed based on delivery
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'partial' | 'paid'>('pending');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load sale data when modal opens
  useEffect(() => {
    if (isOpen && sale) {
      setDate(new Date(sale.date).toISOString().split('T')[0]);
      setItems(sale.items.map(item => ({ ...item })));
      // Status is automatically managed
      setPaymentStatus(sale.paymentStatus);
    }
  }, [isOpen, sale]);

  const addItem = () => {
    setItems([...items, {
      productId: '',
      productName: '',
      quantity: 1,
      unit: '',
      price: 0,
      total: 0
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index] };
    
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        item.productId = value;
        item.productName = product.name;
        item.unit = product.unit;
        // Keep existing price if it's already set, otherwise leave it for manual entry
        if (!item.price) {
          item.price = 0;
        }
        item.total = calculateLineTotal(item.quantity, item.price);
      }
    } else if (field === 'quantity' || field === 'price') {
      item[field] = Number(value) || 0;
      item.total = calculateLineTotal(item.quantity, item.price);
    } else {
      (item as any)[field] = value;
    }
    
    updatedItems[index] = item;
    setItems(updatedItems);
  };

  const calculateGrandTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;
    
    setErrors([]);
    setIsSubmitting(true);

    // Validation
    const validationErrors: string[] = [];
    
    if (!date) {
      validationErrors.push('Sale date is required');
    }
    
    if (items.length === 0) {
      validationErrors.push('At least one product is required');
    }
    
    // Validate each item
    items.forEach((item, index) => {
      if (!item.productId) {
        validationErrors.push(`Please select a product for item ${index + 1}`);
      }
      if (!item.quantity || item.quantity <= 0) {
        validationErrors.push(`Please enter a valid quantity for item ${index + 1}`);
      }
      if (!item.price || item.price <= 0) {
        validationErrors.push(`Please enter a unit price for ${item.productName || `item ${index + 1}`}`);
      }
    });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    // Update sale
    const result = onUpdate(sale.id, {
      date: new Date(date),
      items,
      status: sale?.status || 'pending', // Keep existing status
      paymentStatus,
      totalAmount: calculateGrandTotal()
    });
    
    if (result.success) {
      handleClose();
    } else {
      setErrors(result.errors || ['Failed to update sale']);
    }
    
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setDate('');
    setItems([]);
    // Status is automatically managed
    setPaymentStatus('pending');
    setErrors([]);
    onClose();
  };

  // Get available products (with stock)
  const availableProducts = products.filter(p => {
    const available = p.quantityOnHand - (p.quantityBooked || 0);
    // Include products that are already in this sale or have available stock
    return available > 0 || items.some(item => item.productId === p.id);
  });

  if (!sale) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Sale"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={isSubmitting || items.length === 0}
            loading={isSubmitting}
            loadingText="Updating Sale..."
          >
            Update Sale
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-red-400 mt-0.5" size={16} />
              <div className="space-y-1">
                {errors.map((error, index) => (
                  <p key={index} className="text-sm text-red-400">{error}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Order ID and Customer Info (Read-only) */}
        <div className="p-3 glass rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Hash className="text-muted-text" size={18} />
              <div>
                <p className="text-xs text-muted">Order ID</p>
                <p className="font-medium">{sale.orderId}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted">Customer</p>
              <p className="font-medium">{sale.customerName}</p>
            </div>
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Sale Date <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={18} />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
              required
            />
          </div>
        </div>

        {/* Products Section */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-medium">
              Products <span className="text-red-400">*</span>
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addItem}
            >
              <Plus size={16} />
              Add Product
            </Button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {items.map((item, index) => (
              <div key={index} className="glass rounded-lg p-3">
                <div className="grid grid-cols-12 gap-2">
                  {/* Product Select */}
                  <div className="col-span-4">
                    <select
                      value={item.productId}
                      onChange={(e) => updateItem(index, 'productId', e.target.value)}
                      className="w-full px-3 py-1.5 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
                      required
                    >
                      <option value="">Select product</option>
                      {availableProducts.map(product => {
                        const available = product.quantityOnHand - (product.quantityBooked || 0);
                        const isCurrentItem = item.productId === product.id;
                        return (
                          <option key={product.id} value={product.id}>
                            {product.name} (Available: {available + (isCurrentItem ? item.quantity : 0)} {product.unit})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      placeholder="Qty"
                      min="1"
                      className="w-full px-2 py-1.5 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm text-center"
                      required
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.price || ''}
                      onChange={(e) => updateItem(index, 'price', e.target.value)}
                      placeholder="Unit Price"
                      min="0.01"
                      step="0.01"
                      className="w-full px-2 py-1.5 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm text-center"
                      required
                    />
                  </div>

                  {/* Line Total */}
                  <div className="col-span-3 flex items-center">
                    <span className="text-sm font-medium">
                      {formatCurrency(item.total)}
                    </span>
                  </div>

                  {/* Remove Button */}
                  <div className="col-span-1 flex items-center justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Grand Total */}
          {items.length > 0 && (
            <div className="mt-4 p-3 glass rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="text-green-400" size={20} />
                  <span className="text-lg font-medium">Grand Total:</span>
                </div>
                <span className="text-2xl font-bold text-green-400">
                  {formatCurrency(calculateGrandTotal())}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Payment Status */}
        <div>
          <label className="block text-sm font-medium mb-2">Payment Status</label>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value as any)}
            className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Warning Box */}
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-300">
            Editing this sale will adjust inventory bookings and customer balance based on the changes made.
          </p>
        </div>
      </form>
    </Modal>
  );
};