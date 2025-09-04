import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

interface DropdownMenuProps {
  onAdjustStock: () => void;
  onDelete: () => void;
  productName: string;
}

export const DropdownMenu = ({ onAdjustStock, onDelete }: DropdownMenuProps) => {
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
      const menuHeight = 100; // Approximate height of menu
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top = rect.bottom + 4; // Default position below button
      let left = rect.right - 140; // Align to right edge

      // If not enough space below, position above
      if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
        top = rect.top - menuHeight - 4;
      }

      // Ensure menu doesn't go off right edge of screen
      if (left + 140 > window.innerWidth) {
        left = window.innerWidth - 150;
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
          className="fixed rounded-lg shadow-2xl py-1 min-w-[140px] border border-white/20 bg-gray-900 animate-fadeIn"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            zIndex: 9999,
          }}
        >
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