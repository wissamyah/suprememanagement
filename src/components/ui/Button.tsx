import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
  loading?: boolean;
  loadingText?: string;
}

export const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className,
  disabled,
  loading = false,
  loadingText,
  onClick,
  ...props 
}: ButtonProps) => {
  const baseStyles = 'font-medium rounded-lg transition-all duration-200 inline-flex items-center justify-center gap-2 transform active:scale-95';
  
  const variants = {
    primary: 'bg-white text-gray-900 hover:bg-gray-100 hover:shadow-lg hover:shadow-white/10 disabled:bg-gray-500 disabled:text-gray-300',
    secondary: 'glass glass-hover border border-gray-800/50 text-gray-100 hover:shadow-lg hover:shadow-white/5',
    danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/20 disabled:bg-red-400',
    ghost: 'text-gray-300 hover:bg-white/5 hover:text-gray-100 transition-all duration-200'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) return;
    
    if (onClick) {
      // Add ripple effect
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.add('ripple');
      
      button.style.position = 'relative';
      button.style.overflow = 'hidden';
      button.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
      
      onClick(e);
    }
  };
  
  return (
    <button
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        'relative overflow-hidden',
        className
      )}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 
            className="animate-spin" 
            size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} 
          />
          <span>{loadingText || 'Loading...'}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};