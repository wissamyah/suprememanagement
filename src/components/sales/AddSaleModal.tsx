import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { 
  Calendar, 
  User, 
  Plus, 
  Trash2, 
  AlertCircle,
  ShoppingCart
} from 'lucide-react';
import type { Product, Customer } from '../../types';
import { calculateLineTotal, formatCurrency } from '../../utils/sales';

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

interface AddSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (
    customerId: string,
    date: Date,
    items: SaleItem[],
    paymentStatus: 'pending' | 'partial' | 'paid'
  ) => Promise<{ success: boolean; errors?: string[] }> | { success: boolean; errors?: string[] };
  products: Product[];
  customers: Customer[];
}

export const AddSaleModal = ({ 
  isOpen, 
  onClose, 
  onAdd,
  products,
  customers
}: AddSaleModalProps) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'partial' | 'paid'>('pending');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add initial empty item when modal opens
  useEffect(() => {
    if (isOpen && items.length === 0) {
      addItem();
    }
  }, [isOpen]);

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
        // Don't auto-fill price - user must enter it manually
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
    setErrors([]);
    setIsSubmitting(true);

    // Validation
    const validationErrors: string[] = [];
    
    if (!customerId) {
      validationErrors.push('Please select a customer');
    }
    
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

    // Add sale
    const result = await onAdd(
      customerId,
      new Date(date),
      items,
      paymentStatus
    );
    
    if (result.success) {
      handleClose();
    } else {
      setErrors(result.errors || ['Failed to add sale']);
    }
    
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setCustomerId('');
    setItems([]);
    setPaymentStatus('pending');
    setErrors([]);
    onClose();
  };

  // Get all products (allow negative stock since production is continuous)
  const availableProducts = products;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Sale"
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
            loadingText="Creating Sale..."
          >
            Create Sale
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Sale Date <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
                required
              />
            </div>
          </div>

          {/* Customer */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Customer <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={18} />
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none"
                required
                autoFocus
              >
                <option value="">Select a customer</option>
                {customers
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.state}
                  </option>
                ))}
              </select>
            </div>
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
                        // Show all products, even with negative stock
                        // Indicate stock status but allow selection
                        const stockIndicator = available < 0
                          ? `⚠️ ${available}`
                          : available === 0
                          ? '📦 0'
                          : `✅ ${available}`;
                        return (
                          <option key={product.id} value={product.id}>
                            {product.name} ({stockIndicator} {product.unit})
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

        {/* Info Box */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-300">
            New sales are created as 'Pending' and will automatically update to 'Completed' when fully delivered through loadings.
            Make sure to enter the correct unit prices for each product.
          </p>
        </div>
      </form>
    </Modal>
  );
};