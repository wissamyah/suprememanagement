import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { 
  Calendar, 
  User, 
  Save, 
  AlertCircle,
  Truck,
  FileText,
  Package
} from 'lucide-react';
import type { Loading, Customer, BookedStock } from '../../types';
import { formatCurrency } from '../../utils/sales';

interface EditLoadingModalProps {
  isOpen: boolean;
  loading: Loading | null;
  onClose: () => void;
  onUpdate: (
    id: string,
    updates: Partial<Omit<Loading, 'id' | 'loadingId' | 'createdAt' | 'updatedAt'>>
  ) => { success: boolean; error?: string };
  customersWithBookings: Customer[];
  getCustomerBookedProducts: (customerId: string) => Array<BookedStock & { availableQuantity: number; unitPrice: number }>;
}

export const EditLoadingModal = ({ 
  isOpen, 
  loading,
  onClose, 
  onUpdate,
  customersWithBookings,
  getCustomerBookedProducts
}: EditLoadingModalProps) => {
  const [date, setDate] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [truckPlateNumber, setTruckPlateNumber] = useState('');
  const [wayBillNumber, setWayBillNumber] = useState('');
  const [items, setItems] = useState<Loading['items']>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedProducts, setBookedProducts] = useState<Array<BookedStock & { availableQuantity: number; unitPrice: number }>>([]);

  // Initialize form with loading data
  useEffect(() => {
    if (loading && isOpen) {
      setDate(loading.date);
      setCustomerId(loading.customerId);
      setTruckPlateNumber(loading.truckPlateNumber);
      setWayBillNumber(loading.wayBillNumber || '');
      setItems(loading.items);
      setErrors([]);
      
      // Load booked products for the customer
      const products = getCustomerBookedProducts(loading.customerId);
      setBookedProducts(products);
    }
  }, [loading, isOpen, getCustomerBookedProducts]);

  const updateItem = (index: number, field: keyof typeof items[0], value: any) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index] };
    
    if (field === 'quantity') {
      const quantity = Number(value) || 0;
      const bookedProduct = bookedProducts.find(b => b.id === item.bookedStockId);
      const maxQuantity = bookedProduct ? bookedProduct.availableQuantity : 999999;
      item.quantity = Math.min(quantity, maxQuantity);
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
      const bookedProduct = bookedProducts.find(b => b.id === item.bookedStockId);
      if (bookedProduct && item.quantity > bookedProduct.availableQuantity) {
        newErrors.push(`${item.productName}: Quantity exceeds available (${bookedProduct.availableQuantity} ${item.unit})`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !loading) return;

    setIsSubmitting(true);
    setErrors([]);

    try {
      // Filter out items with zero quantity
      const validItems = items.filter(item => item.quantity > 0 && item.unitPrice > 0);
      
      const result = await onUpdate(loading.id, {
        date,
        customerId,
        customerName: customersWithBookings.find(c => c.id === customerId)?.name || loading.customerName,
        truckPlateNumber: truckPlateNumber.trim(),
        wayBillNumber: wayBillNumber.trim() || undefined,
        items: validItems,
        totalValue: calculateTotalValue()
      });

      if (result.success) {
        onClose();
      } else {
        setErrors([result.error || 'Failed to update loading']);
      }
    } catch (error: any) {
      setErrors([error.message || 'An error occurred']);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!loading) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Edit Loading - ${loading.loadingId}`}
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
              disabled // Customer cannot be changed after creation
            >
              <option value="">Select customer</option>
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
        {items.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Package size={20} />
              Loaded Products
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {items.map((item, index) => {
                const bookedProduct = bookedProducts.find(b => b.id === item.bookedStockId);
                const maxQuantity = bookedProduct ? bookedProduct.availableQuantity : item.quantity;
                
                return (
                  <div key={index} className="glass rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{item.productName}</h4>
                        <p className="text-sm text-muted">
                          Available: {maxQuantity} {item.unit}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-muted mb-1">Loading Quantity</label>
                        <input
                          type="number"
                          min="0"
                          max={maxQuantity}
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          className="w-full p-2 glass rounded focus:outline-none focus:ring-2 focus:ring-white/20"
                          placeholder={`Max: ${maxQuantity}`}
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
            loadingText="Updating Loading..."
          >
            <Save size={20} />
            Update Loading
          </Button>
        </div>
      </div>
    </Modal>
  );
};