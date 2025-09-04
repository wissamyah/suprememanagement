import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

const icons = {
  success: <CheckCircle size={20} className="text-green-400 animate-bounce" />,
  error: <XCircle size={20} className="text-red-400 animate-pulse" />,
  warning: <AlertCircle size={20} className="text-yellow-400 animate-pulse" />,
  info: <Info size={20} className="text-blue-400 animate-pulse" />
};

export const Toast = ({ id, message, type, duration = 5000, onClose }: ToastProps) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  
  useEffect(() => {
    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(progressInterval);
          return 0;
        }
        return prev - (100 / (duration / 100));
      });
    }, 100);

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 300);
    }, duration);
    
    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [duration, id, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 300);
  };
  
  return (
    <div
      className={`bg-gray-900/95 backdrop-blur-md border border-white/20 rounded-lg shadow-xl flex flex-col min-w-[320px] max-w-[420px] overflow-hidden transition-all duration-300 transform ${
        isExiting 
          ? 'opacity-0 translate-x-full scale-95' 
          : 'opacity-100 translate-x-0 scale-100 animate-slideInRight'
      }`}
    >
      <div className="p-4 flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {icons[type]}
        </div>
        <p className="flex-1 text-sm leading-relaxed">{message}</p>
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-glass transition-all duration-200 hover:rotate-90 transform"
        >
          <X size={16} />
        </button>
      </div>
      
      {/* Progress bar */}
      <div className="h-1 bg-black/20 relative overflow-hidden">
        <div 
          className={`h-full transition-all duration-100 ease-linear ${
            type === 'success' ? 'bg-green-400' :
            type === 'error' ? 'bg-red-400' :
            type === 'warning' ? 'bg-yellow-400' :
            'bg-blue-400'
          }`}
          style={{ width: `${progress}%` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      </div>

    </div>
  );
};

interface ToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
  }>;
  onClose: (id: string) => void;
}

export const ToastContainer = ({ toasts, onClose }: ToastContainerProps) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
      {toasts.map((toast, index) => (
        <div 
          key={toast.id}
          className="pointer-events-auto"
          style={{
            animation: `slideDown 0.3s ease-out ${index * 0.05}s both`
          }}
        >
          <Toast {...toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};