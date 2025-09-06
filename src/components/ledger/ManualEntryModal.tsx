import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { LedgerEntry } from '../../types';

interface ManualEntryModalProps {
  isOpen: boolean;
  customerName: string;
  onClose: () => void;
  onAdd?: (
    transactionType: LedgerEntry['transactionType'],
    debit: number,
    credit: number,
    description: string,
    notes: string,
    date: Date
  ) => { success: boolean };
  editingEntry?: LedgerEntry | null;
  onUpdate?: (
    entryId: string,
    updates: Partial<Omit<LedgerEntry, 'id' | 'customerId' | 'customerName' | 'createdAt' | 'runningBalance'>>
  ) => { success: boolean };
}

export const ManualEntryModal = ({
  isOpen,
  customerName,
  onClose,
  onAdd,
  editingEntry,
  onUpdate
}: ManualEntryModalProps) => {
  const [transactionType, setTransactionType] = useState<LedgerEntry['transactionType']>('adjustment');
  const [entryType, setEntryType] = useState<'debit' | 'credit'>('debit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editingEntry) {
      setTransactionType(editingEntry.transactionType);
      setEntryType(editingEntry.debit > 0 ? 'debit' : 'credit');
      setAmount((editingEntry.debit || editingEntry.credit).toString());
      setDescription(editingEntry.description);
      setNotes(editingEntry.notes || '');
      setDate(new Date(editingEntry.date).toISOString().split('T')[0]);
    }
  }, [editingEntry]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    
    if (!description.trim()) {
      newErrors.description = 'Description is required';
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
    
    const debit = entryType === 'debit' ? parseFloat(amount) : 0;
    const credit = entryType === 'credit' ? parseFloat(amount) : 0;
    
    let result: { success: boolean };
    
    if (editingEntry && onUpdate) {
      result = onUpdate(editingEntry.id, {
        transactionType,
        debit,
        credit,
        description,
        notes,
        date: new Date(date)
      });
    } else if (onAdd) {
      result = onAdd(
        transactionType,
        debit,
        credit,
        description,
        notes,
        new Date(date)
      );
    } else {
      result = { success: false };
    }
    
    setIsSubmitting(false);
    
    if (result.success) {
      handleClose();
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      // Reset form
      setTransactionType('adjustment');
      setEntryType('debit');
      setAmount('');
      setDescription('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setErrors({});
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingEntry ? `Edit Entry - ${customerName}` : `Manual Entry - ${customerName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Transaction Type */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Transaction Type <span className="text-red-400">*</span>
          </label>
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value as LedgerEntry['transactionType'])}
            className="w-full px-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            disabled={isSubmitting || (editingEntry && editingEntry.transactionType === 'sale')}
          >
            {editingEntry?.transactionType === 'sale' ? (
              <option value="sale">Sale</option>
            ) : (
              <>
                <option value="adjustment">Adjustment</option>
                <option value="opening_balance">Opening Balance</option>
                <option value="credit_note">Credit Note</option>
                {!editingEntry && <option value="payment">Payment</option>}
              </>
            )}
          </select>
          {editingEntry?.transactionType === 'sale' && (
            <p className="text-xs text-yellow-400 mt-1">
              Sale entries are managed through the sales module
            </p>
          )}
        </div>

        {/* Entry Type (Debit/Credit) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Entry Type <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEntryType('debit')}
              className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                entryType === 'debit'
                  ? 'bg-red-500/20 text-red-400 ring-2 ring-red-400'
                  : 'glass hover:bg-white/10'
              }`}
              disabled={isSubmitting || transactionType === 'payment'}
            >
              Debit (Customer Owes)
            </button>
            <button
              type="button"
              onClick={() => setEntryType('credit')}
              className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                entryType === 'credit'
                  ? 'bg-green-500/20 text-green-400 ring-2 ring-green-400'
                  : 'glass hover:bg-white/10'
              }`}
              disabled={isSubmitting || editingEntry?.transactionType === 'sale'}
            >
              Credit (Customer Paid)
            </button>
          </div>
          {transactionType === 'payment' && (
            <p className="text-xs text-blue-400 mt-1">
              Payments are always credits. Use the Payment button for better tracking.
            </p>
          )}
          {editingEntry?.transactionType === 'sale' && (
            <p className="text-xs text-yellow-400 mt-1">
              Sales are always debits
            </p>
          )}
        </div>

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
          />
          {errors.amount && (
            <p className="text-red-400 text-xs mt-1">{errors.amount}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Description <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full px-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 ${
              errors.description ? 'ring-2 ring-red-400' : ''
            }`}
            placeholder="Enter description"
            disabled={isSubmitting}
          />
          {errors.description && (
            <p className="text-red-400 text-xs mt-1">{errors.description}</p>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Date <span className="text-red-400">*</span>
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
            {isSubmitting 
              ? (editingEntry ? 'Updating...' : 'Adding...') 
              : (editingEntry ? 'Update Entry' : 'Add Entry')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};