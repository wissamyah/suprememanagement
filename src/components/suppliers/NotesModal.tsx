import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { StickyNote, Save, AlertCircle, Calendar, User, Copy, Check } from 'lucide-react';
import { formatDate } from '../../utils/dateFormatting';
import type { Supplier } from '../../types';

interface NotesModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onUpdate: (
    id: string,
    updates: Partial<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<{ success: boolean; errors?: string[] }> | { success: boolean; errors?: string[] };
}

export const NotesModal = ({ isOpen, supplier, onClose, onUpdate }: NotesModalProps) => {
  const [notes, setNotes] = useState('');
  const [originalNotes, setOriginalNotes] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (supplier) {
      setNotes(supplier.notes || '');
      setOriginalNotes(supplier.notes || '');
      setHasChanges(false);
    }
  }, [supplier]);

  useEffect(() => {
    setHasChanges(notes !== originalNotes);
  }, [notes, originalNotes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) return;

    setErrors([]);
    setIsSubmitting(true);

    // Update supplier notes
    const result = await onUpdate(supplier.id, {
      notes: notes.trim()
    });

    if (result.success) {
      setOriginalNotes(notes);
      setHasChanges(false);
      // Close without confirmation since we just saved successfully
      setNotes('');
      setOriginalNotes('');
      setErrors([]);
      onClose();
    } else {
      setErrors(result.errors || ['Failed to update notes']);
    }

    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }

    setNotes('');
    setOriginalNotes('');
    setErrors([]);
    setHasChanges(false);
    onClose();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(notes);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  if (!supplier) return null;

  const characterCount = notes.length;
  const maxCharacters = 2000;
  const remainingCharacters = maxCharacters - characterCount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Notes for ${supplier.name}`}
      size="lg"
      footer={
        <>
          <div className="flex items-center gap-2 mr-auto">
            {hasChanges && (
              <span className="text-xs text-yellow-400">Unsaved changes</span>
            )}
          </div>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="notes-form"
            disabled={isSubmitting || !hasChanges}
            loading={isSubmitting}
            loadingText="Saving Notes..."
          >
            <Save size={16} />
            Save Notes
          </Button>
        </>
      }
    >
      <form id="notes-form" onSubmit={handleSubmit} className="space-y-4">
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

        {/* Supplier Info */}
        <div className="glass rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User size={14} className="text-muted-text" />
              <span className="text-muted-text">Supplier:</span>
              <span className="font-medium">{supplier.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-muted-text" />
              <span className="text-muted-text">Last Updated:</span>
              <span>{formatDate(supplier.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Notes Textarea */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <div className="flex items-center gap-2">
              <StickyNote size={16} />
              Notes
            </div>
          </label>
          <div className="relative">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes, reminders, or important information about this supplier..."
              className="w-full px-4 py-3 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 resize-y"
              rows={10}
              maxLength={maxCharacters}
            />
            <button
              type="button"
              onClick={handleCopy}
              className="absolute top-2 right-2 p-2 glass rounded-lg hover:bg-white/10 transition-all duration-200"
              title="Copy notes"
            >
              <div className="relative w-4 h-4">
                <Copy
                  size={16}
                  className={`absolute inset-0 text-muted-text transition-all duration-300 ${
                    isCopied ? 'opacity-0 scale-0 rotate-90' : 'opacity-100 scale-100 rotate-0'
                  }`}
                />
                <Check
                  size={16}
                  className={`absolute inset-0 text-green-400 transition-all duration-300 ${
                    isCopied ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-0 -rotate-90'
                  }`}
                />
              </div>
            </button>
          </div>
          <div className="flex justify-between mt-2">
            <p className="text-xs text-muted">
              Use this space to record important details, agreements, or any other relevant information.
            </p>
            <p className={`text-xs ${remainingCharacters < 100 ? 'text-yellow-400' : 'text-muted'}`}>
              {remainingCharacters} characters remaining
            </p>
          </div>
        </div>

      </form>
    </Modal>
  );
};