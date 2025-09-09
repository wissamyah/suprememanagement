import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { LedgerEntry } from '../../types';

interface PaymentModalProps {
  isOpen: boolean;
  customerName: string;
  onClose: () => void;
  onAdd: (
    amount: number,
    paymentMethod: LedgerEntry['paymentMethod'],
    referenceNumber: string,
    notes: string,
    date: Date
  ) => { success: boolean };
  editingEntry?: LedgerEntry | null;
  onUpdate?: (
    entryId: string,
    updates: Partial<Omit<LedgerEntry, 'id' | 'customerId' | 'customerName' | 'createdAt' | 'runningBalance'>>
  ) => { success: boolean };
}

export const PaymentModal = ({
  isOpen,
  customerName,
  onClose,
  onAdd,
  editingEntry,
  onUpdate
}: PaymentModalProps) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<LedgerEntry['paymentMethod']>('bank_transfer');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Populate fields when editing
  useEffect(() => {
    if (editingEntry && editingEntry.transactionType === 'payment') {
      setAmount(editingEntry.credit.toString());
      setPaymentMethod(editingEntry.paymentMethod || 'bank_transfer');
      setNotes(editingEntry.notes || '');
      setDate(new Date(editingEntry.date).toISOString().split('T')[0]);
    } else if (!editingEntry) {
      // Reset form when not editing
      setAmount('');
      setPaymentMethod('bank_transfer');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [editingEntry]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    
    if (!date) {
      newErrors.date = 'Date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    let result: { success: boolean };
    
    if (editingEntry && onUpdate) {
      // Update existing entry
      result = onUpdate(editingEntry.id, {
        credit: parseFloat(amount),
        debit: 0,
        paymentMethod,
        notes,
        date: new Date(date),
        description: `Payment received via ${paymentMethod}`,
        transactionType: 'payment',
        updatedAt: new Date()
      });
    } else {
      // Add new entry
      result = onAdd(
        parseFloat(amount),
        paymentMethod,
        '', // No longer using reference number
        notes,
        new Date(date)
      );
    }
    
    setIsSubmitting(false);
    
    if (result.success) {
      // Reset form
      setAmount('');
      setPaymentMethod('bank_transfer');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setErrors({});
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      // Reset form
      setAmount('');
      setPaymentMethod('bank_transfer');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setErrors({});
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingEntry ? `Edit Payment - ${customerName}` : `Record Payment - ${customerName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Amount (₦) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`w-full px-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 ${
              errors.amount ? 'ring-2 ring-red-400' : ''
            }`}
            placeholder="Enter amount"
            disabled={isSubmitting}
            autoFocus
          />
          {errors.amount && (
            <p className="text-red-400 text-xs mt-1">{errors.amount}</p>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Payment Method <span className="text-red-400">*</span>
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as LedgerEntry['paymentMethod'])}
            className="w-full px-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            disabled={isSubmitting}
          >
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>


        {/* Date */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Payment Date <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`w-full px-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 ${
              errors.date ? 'ring-2 ring-red-400' : ''
            }`}
            disabled={isSubmitting}
          />
          {errors.date && (
            <p className="text-red-400 text-xs mt-1">{errors.date}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 min-h-[80px]"
            placeholder="Add any additional notes..."
            disabled={isSubmitting}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (editingEntry ? 'Updating...' : 'Recording...') : (editingEntry ? 'Update Payment' : 'Record Payment')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};