import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = 'md' 
}: ModalProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    
    if (isOpen) {
      setIsVisible(true);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      // Trigger animation after a small delay to ensure the DOM is ready
      setTimeout(() => {
        setIsAnimating(true);
      }, 10);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = '';
      }, 300); // Match animation duration
      
      return () => clearTimeout(timer);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 150);
  };
  
  if (!isVisible) return null;
  
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };
  
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with fade animation */}
      <div 
        className={`absolute inset-0 bg-black/70 backdrop-blur-md transition-all duration-300 ease-out ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Modal with scale and fade animation */}
      <div 
        className={`relative w-full ${sizes[size]} glass rounded-xl shadow-2xl transition-all duration-300 ease-out transform ${
          isAnimating 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        {/* Header with slide down animation */}
        <div className={`flex items-center justify-between p-6 border-b border-gray-800/50 transition-all duration-500 ease-out ${
          isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}>
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-glass transition-all duration-200 hover:rotate-90 transform"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content with fade animation */}
        <div 
          className={`p-6 transition-all duration-500 delay-75 ease-out ${
            isAnimating ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto'
          }}
        >
          {children}
        </div>
        
        {/* Footer with slide up animation */}
        {footer && (
          <div className={`flex justify-end gap-3 p-6 border-t border-gray-800/50 transition-all duration-500 delay-100 ease-out ${
            isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};