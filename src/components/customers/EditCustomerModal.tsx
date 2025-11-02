import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { User, AlertCircle, Phone, MapPin } from 'lucide-react';
import { NIGERIAN_STATES } from '../../constants/nigerianStates';
import { validatePhoneNumber, formatPhoneNumber } from '../../utils/customers';
import type { Customer } from '../../types';

interface EditCustomerModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onUpdate: (
    id: string,
    updates: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<{ success: boolean; errors?: string[] }>;
}

export const EditCustomerModal = ({ isOpen, customer, onClose, onUpdate }: EditCustomerModalProps) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone);
      setState(customer.state);
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    
    setErrors([]);
    setIsSubmitting(true);

    // Validation
    const validationErrors: string[] = [];
    
    if (!name.trim()) {
      validationErrors.push('Customer name is required');
    }
    
    if (phone.trim() && !validatePhoneNumber(phone)) {
      validationErrors.push('Please enter a valid Nigerian phone number');
    }
    
    if (!state) {
      validationErrors.push('State is required');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    // Update customer (excluding balance)
    const updates: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>> = {
      name: name.trim(),
      phone: phone.trim(),
      state
    };

    const result = await onUpdate(customer.id, updates);

    if (result.success) {
      handleClose();
    } else {
      setErrors(result.errors || ['Failed to update customer']);
    }
    
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setName('');
    setPhone('');
    setState('');
    setErrors([]);
    onClose();
  };

  const handlePhoneChange = (value: string) => {
    // Allow only numbers, spaces, and + sign
    const cleaned = value.replace(/[^\d\s+]/g, '');
    setPhone(cleaned);
  };

  if (!customer) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Customer"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
            loadingText="Updating Customer..."
          >
            Update Customer
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

        {/* Customer Name */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Customer Name <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={18} />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter customer name"
              className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
              required
            />
          </div>
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={18} />
            <input
              type="tel"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="e.g., 0803 123 4567"
              className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          {phone && !validatePhoneNumber(phone) && (
            <p className="text-xs text-yellow-400 mt-1">
              Enter a valid Nigerian phone number (e.g., 08031234567)
            </p>
          )}
          {phone && validatePhoneNumber(phone) && (
            <p className="text-xs text-green-400 mt-1">
              Formatted: {formatPhoneNumber(phone)}
            </p>
          )}
        </div>

        {/* State */}
        <div>
          <label className="block text-sm font-medium mb-2">
            State <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={18} />
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none"
              required
            >
              <option value="">Select a state</option>
              {NIGERIAN_STATES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Balance (Read-only) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Current Balance
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text text-lg font-medium">₦</span>
            <input
              type="text"
              value={customer.balance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              className={`w-full pl-10 pr-4 py-2 glass rounded-lg bg-glass/50 cursor-not-allowed ${
                customer.balance > 0 ? 'text-green-400' : 
                customer.balance < 0 ? 'text-red-400' : 
                'text-gray-400'
              }`}
              disabled
              readOnly
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};