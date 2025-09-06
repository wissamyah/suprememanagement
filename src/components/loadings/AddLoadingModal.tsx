import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { 
  Calendar, 
  User, 
  Plus, 
  
  AlertCircle,
  Truck,
  FileText,
  Package
} from 'lucide-react';
import type { Customer, BookedStock } from '../../types';
import { formatCurrency } from '../../utils/sales';

interface LoadingItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  bookedStockId: string;
  maxQuantity: number;
}

interface AddLoadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (
    date: string,
    customerId: string,
    truckPlateNumber: string,
    wayBillNumber: string | undefined,
    items: LoadingItem[]
  ) => { success: boolean; error?: string };
  customersWithBookings: Customer[];
  getCustomerBookedProducts: (customerId: string) => Array<BookedStock & { availableQuantity: number; unitPrice: number }>;
}

export const AddLoadingModal = ({ 
  isOpen, 
  onClose, 
  onAdd,
  customersWithBookings,
  getCustomerBookedProducts
}: AddLoadingModalProps) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState('');
  const [truckPlateNumber, setTruckPlateNumber] = useState('');
  const [wayBillNumber, setWayBillNumber] = useState('');
  const [items, setItems] = useState<LoadingItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedProducts, setBookedProducts] = useState<Array<BookedStock & { availableQuantity: number; unitPrice: number }>>([]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      setCustomerId('');
      setTruckPlateNumber('');
      setWayBillNumber('');
      setItems([]);
      setErrors([]);
      setBookedProducts([]);
    }
  }, [isOpen]);

  // Load booked products when customer is selected
  useEffect(() => {
    if (customerId) {
      const products = getCustomerBookedProducts(customerId);
      setBookedProducts(products);
      
      // Initialize items with booked products - price is fetched from sale
      const loadingItems: LoadingItem[] = products.map(product => ({
        productId: product.productId,
        productName: product.productName,
        quantity: 0,
        unit: product.unit,
        unitPrice: product.unitPrice, // Price from sale order
        bookedStockId: product.id,
        maxQuantity: product.availableQuantity
      }));
      setItems(loadingItems);
    } else {
      setBookedProducts([]);
      setItems([]);
    }
  }, [customerId, getCustomerBookedProducts]);

  const updateItem = (index: number, field: keyof LoadingItem, value: any) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index] };
    
    if (field === 'quantity') {
      const quantity = Number(value) || 0;
      // Validate against max quantity
      item.quantity = Math.min(quantity, item.maxQuantity);
    } else {
      (item as any)[field] = value;
    }
    
    updatedItems[index] = item;
    setItems(updatedItems);
  };

  const calculateTotalValue = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!date) {
      newErrors.push('Date is required');
    }

    if (!customerId) {
      newErrors.push('Customer is required');
    }

    if (!truckPlateNumber.trim()) {
      newErrors.push('Truck plate number is required');
    }

    const hasValidItems = items.some(item => item.quantity > 0 && item.unitPrice > 0);
    if (!hasValidItems) {
      newErrors.push('At least one product must have quantity and price');
    }

    // Validate quantities don't exceed available
    items.forEach(item => {
      if (item.quantity > item.maxQuantity) {
        newErrors.push(`${item.productName}: Quantity exceeds available (${item.maxQuantity} ${item.unit})`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors([]);

    try {
      // Filter out items with zero quantity
      const validItems = items.filter(item => item.quantity > 0 && item.unitPrice > 0);
      
      const result = await onAdd(
        date,
        customerId,
        truckPlateNumber.trim(),
        wayBillNumber.trim() || undefined,
        validItems
      );

      if (result.success) {
        onClose();
      } else {
        setErrors([result.error || 'Failed to create loading']);
      }
    } catch (error: any) {
      setErrors([error.message || 'An error occurred']);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="New Loading"
      size="lg"
    >
      <div className="space-y-6">
        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="glass rounded-lg p-4 border border-red-500/20 bg-red-500/10">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-400 mt-0.5" size={20} />
              <div className="space-y-1">
                {errors.map((error, index) => (
                  <p key={index} className="text-sm text-red-400">{error}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              <Calendar className="inline mr-2" size={16} />
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2.5 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <User className="inline mr-2" size={16} />
              Customer
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full p-2.5 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <option value="">Select customer with bookings</option>
              {customersWithBookings.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <Truck className="inline mr-2" size={16} />
              Truck Plate Number *
            </label>
            <input
              type="text"
              value={truckPlateNumber}
              onChange={(e) => setTruckPlateNumber(e.target.value)}
              placeholder="e.g., ABC-123"
              className="w-full p-2.5 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <FileText className="inline mr-2" size={16} />
              Way Bill Number (Optional)
            </label>
            <input
              type="text"
              value={wayBillNumber}
              onChange={(e) => setWayBillNumber(e.target.value)}
              placeholder="e.g., WB-2024-001"
              className="w-full p-2.5 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
        </div>

        {/* Products Section */}
        {customerId && items.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Package size={20} />
              Booked Products
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {items.map((item, index) => {
                const booking = bookedProducts[index];
                return (
                  <div key={index} className="glass rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{item.productName}</h4>
                        <p className="text-sm text-muted">
                          Order: {booking?.orderId} | Available: {item.maxQuantity} {item.unit}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-muted mb-1">Loading Quantity</label>
                        <input
                          type="number"
                          min="0"
                          max={item.maxQuantity}
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          className="w-full p-2 glass rounded focus:outline-none focus:ring-2 focus:ring-white/20"
                          placeholder={`Max: ${item.maxQuantity}`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-muted mb-1">Unit Price</label>
                        <div className="p-2 glass rounded bg-gray-800/50 text-gray-300">
                          {formatCurrency(item.unitPrice)}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs text-muted mb-1">Total</label>
                        <div className="p-2 glass rounded text-right font-medium">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Total Value */}
        {items.length > 0 && (
          <div className="glass rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total Value:</span>
              <span className="text-2xl font-bold text-green-400">
                {formatCurrency(calculateTotalValue())}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-800/50">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit} 
            loading={isSubmitting}
            loadingText="Creating Loading..."
            disabled={!customerId || items.length === 0}
          >
            <Plus size={20} />
            Add Loading
          </Button>
        </div>
      </div>
    </Modal>
  );
};