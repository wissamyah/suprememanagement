import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { User, AlertCircle, Phone, UserCheck } from 'lucide-react';
import { validatePhoneNumber, formatPhoneNumber } from '../../utils/suppliers';
import type { Supplier } from '../../types';

interface EditSupplierModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onUpdate: (
    id: string,
    updates: Partial<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<{ success: boolean; errors?: string[] }> | { success: boolean; errors?: string[] };
}

export const EditSupplierModal = ({ isOpen, supplier, onClose, onUpdate }: EditSupplierModalProps) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agent, setAgent] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (supplier) {
      setName(supplier.name);
      setPhone(supplier.phone);
      setAgent(supplier.agent);
    }
  }, [supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) return;
    
    setErrors([]);
    setIsSubmitting(true);

    // Validation
    const validationErrors: string[] = [];
    
    if (!name.trim()) {
      validationErrors.push('Supplier name is required');
    }
    
    if (phone.trim() && !validatePhoneNumber(phone)) {
      validationErrors.push('Please enter a valid Nigerian phone number');
    }
    
    if (!agent.trim()) {
      validationErrors.push('Agent name is required');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    // Update supplier
    const result = await onUpdate(supplier.id, {
      name: name.trim(),
      phone: phone.trim(),
      agent: agent.trim()
    });
    
    if (result.success) {
      handleClose();
    } else {
      setErrors(result.errors || ['Failed to update supplier']);
    }
    
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setName('');
    setPhone('');
    setAgent('');
    setErrors([]);
    onClose();
  };

  const handlePhoneChange = (value: string) => {
    // Allow only numbers, spaces, and + sign
    const cleaned = value.replace(/[^\d\s+]/g, '');
    setPhone(cleaned);
  };

  if (!supplier) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Supplier"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            type="submit"
            form="edit-supplier-form"
            disabled={isSubmitting}
            loading={isSubmitting}
            loadingText="Updating Supplier..."
          >
            Update Supplier
          </Button>
        </>
      }
    >
      <form id="edit-supplier-form" onSubmit={handleSubmit} className="space-y-4">
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

        {/* Supplier Name */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Supplier Name <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={18} />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter supplier name"
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

        {/* Agent */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Agent <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={18} />
            <input
              type="text"
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              placeholder="Enter agent name"
              className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
              required
            />
          </div>
        </div>

      </form>
    </Modal>
  );
};