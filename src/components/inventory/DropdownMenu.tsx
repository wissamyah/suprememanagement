import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

interface DropdownMenuProps {
  onAdjustStock: () => void;
  onDelete: () => void;
  onViewBookedStock?: () => void;
  productName: string;
}

export const DropdownMenu = ({ onAdjustStock, onDelete, onViewBookedStock }: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current && 
        !buttonRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuHeight = 120; // Approximate height of menu with 3-4 items
      const menuWidth = 180; // Increased width to ensure it's wide enough
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top = rect.bottom + 4; // Default position below button
      // Align menu's right edge with button's right edge (standard dropdown behavior)
      let left = rect.right - menuWidth;

      // If not enough space below, position above
      if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
        top = rect.top - menuHeight - 4;
      }

      // Ensure menu doesn't go off left edge of screen
      if (left < 0) {
        left = 4; // Small margin from edge
      }
      
      // Ensure menu doesn't go off right edge of screen
      if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 4;
      }

      setPosition({ top, left });
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
        title="More Actions"
      >
        <MoreVertical size={14} className="sm:w-4 sm:h-4" />
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed rounded-lg shadow-2xl py-1 w-[180px] border border-white/20 bg-gray-900 animate-fadeIn"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            zIndex: 9999,
          }}
        >
          {onViewBookedStock ? (
            <button
              onClick={() => handleAction(onViewBookedStock)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-glass transition-colors"
            >
              View Booked Stock
            </button>
          ) : null}
          <button
            onClick={() => handleAction(onAdjustStock)}
            className="w-full px-3 py-2 text-left text-sm hover:bg-glass transition-colors"
          >
            Adjust Stock
          </button>
          <button
            onClick={() => handleAction(onDelete)}
            className="w-full px-3 py-2 text-left text-sm hover:bg-glass transition-colors text-red-400"
          >
            Delete
          </button>
        </div>,
        document.body
      )}
    </>
  );
};