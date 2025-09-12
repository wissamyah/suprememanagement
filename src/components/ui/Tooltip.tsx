import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export const Tooltip = ({
  children,
  content,
  placement = 'top',
  delay = 200,
  className = ''
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;

    // Calculate position relative to viewport (for fixed positioning)
    switch (placement) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + 8;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + 8;
        break;
    }

    // Adjust for viewport boundaries
    const padding = 10;
    
    // Horizontal adjustments
    if (left < padding) {
      left = padding;
    } else if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width - padding;
    }
    
    // Vertical adjustments - flip placement if needed
    if (top < padding) {
      // If tooltip goes above viewport, show it below instead
      if (placement === 'top') {
        top = triggerRect.bottom + 8;
      } else {
        top = padding;
      }
    } else if (top + tooltipRect.height > window.innerHeight - padding) {
      // If tooltip goes below viewport, show it above instead
      if (placement === 'bottom') {
        top = triggerRect.top - tooltipRect.height - 8;
      } else {
        top = window.innerHeight - tooltipRect.height - padding;
      }
    }

    setPosition({ top, left });
  };

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      window.addEventListener('resize', calculatePosition);
      window.addEventListener('scroll', calculatePosition);
    }

    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition);
    };
  }, [isVisible]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          className={`
            fixed z-50 pointer-events-none
            glass backdrop-blur-md
            px-3 py-2 rounded-lg
            shadow-xl border border-white/10
            transition-all duration-200 ease-out
            animate-fadeIn
            ${className}
          `}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
};

interface ProductTooltipProps {
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

export const ProductTooltip = ({ items }: ProductTooltipProps) => {
  return (
    <div className="min-w-[300px] max-w-[400px]">
      <div className="text-xs font-semibold mb-2 text-white/80">Product Details</div>
      <div className="space-y-1">
        <div className="grid grid-cols-4 gap-2 text-xs font-medium text-white/60 pb-1 border-b border-white/10">
          <div className="col-span-1">Product</div>
          <div className="text-right">Qty</div>
          <div className="text-right">Price</div>
          <div className="text-right">Total</div>
        </div>
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-4 gap-2 text-xs">
            <div className="col-span-1 truncate" title={item.productName}>
              {item.productName}
            </div>
            <div className="text-right">{item.quantity}</div>
            <div className="text-right">₦{(item.price || 0).toLocaleString()}</div>
            <div className="text-right font-medium">₦{(item.total || 0).toLocaleString()}</div>
          </div>
        ))}
        <div className="grid grid-cols-4 gap-2 text-xs font-bold pt-1 border-t border-white/10">
          <div className="col-span-3 text-right">Grand Total:</div>
          <div className="text-right text-green-400">
            ₦{items.reduce((sum, item) => sum + (item.total || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};