import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import { type ReactNode } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  loading = false
}: ConfirmModalProps) => {
  const icons = {
    danger: <Trash2 size={48} className="text-red-400" />,
    warning: <AlertTriangle size={48} className="text-yellow-400" />,
    info: <Info size={48} className="text-blue-400" />
  };

  const handleConfirm = () => {
    onConfirm();
    if (!loading) {
      onClose();
    }
  };

  const footer = (
    <>
      <Button 
        variant="ghost" 
        onClick={onClose}
        disabled={loading}
      >
        {cancelText}
      </Button>
      <Button 
        variant={type === 'danger' ? 'danger' : 'primary'}
        onClick={handleConfirm}
        loading={loading}
        loadingText="Processing..."
      >
        {confirmText}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      size="sm"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-4 glass rounded-full">
          {icons[type]}
        </div>
        <p className="text-gray-200 leading-relaxed">
          {message}
        </p>
        {type === 'danger' && (
          <div className="w-full p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <p className="flex items-center gap-2">
              <AlertTriangle size={16} />
              This action cannot be undone
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};