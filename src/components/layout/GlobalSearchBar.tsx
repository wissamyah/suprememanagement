import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Loader2, Command } from 'lucide-react';
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { SearchResults } from './SearchResults';

interface GlobalSearchBarProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const GlobalSearchBar = ({ isOpen, onOpen, onClose }: GlobalSearchBarProps) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { results, totalResults, loading, isSearching, hasQuery, bookedStock } = useGlobalSearch(query);

  // Handle open/close animations and body scroll lock
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';

      // Trigger animation after DOM is ready
      setTimeout(() => {
        setIsAnimating(true);
      }, 10);

      // Focus input with multiple attempts for mobile compatibility
      // Mobile browsers sometimes need a slight delay and user interaction context
      const focusInput = () => {
        if (inputRef.current) {
          inputRef.current.focus();
          // For iOS, we need to ensure the input is focused
          inputRef.current.click();
        }
      };

      // Immediate focus attempt
      focusInput();
      // Delayed focus for mobile browsers
      const focusTimer = setTimeout(focusInput, 50);
      const focusTimer2 = setTimeout(focusInput, 150);

      return () => {
        clearTimeout(focusTimer);
        clearTimeout(focusTimer2);
      };
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setQuery('');
        setSelectedIndex(0);
        document.body.style.overflow = '';
      }, 200); // Match animation duration

      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle click outside to close (on backdrop click)
  const handleBackdropClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;

    // Check if click is inside a modal (modals use .modal-content class)
    const isInsideModal = target.closest('.modal-content') !== null;

    if (!isInsideModal && !containerRef.current?.contains(target)) {
      handleClose();
    }
  };

  // Animated close handler
  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 150);
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Check if a modal (not our overlay) is currently open
      const otherModals = document.querySelectorAll('.modal-content');
      const isOtherModalOpen = otherModals.length > 0;

      switch (e.key) {
        case 'Escape':
          // Only close search if no other modal is open
          if (!isOtherModalOpen) {
            e.preventDefault();
            handleClose();
          }
          break;
        case 'ArrowDown':
          if (!isOtherModalOpen) {
            e.preventDefault();
            setSelectedIndex((prev) => Math.min(prev + 1, totalResults - 1));
          }
          break;
        case 'ArrowUp':
          if (!isOtherModalOpen) {
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
          }
          break;
        case 'Enter':
          if (!isOtherModalOpen) {
            e.preventDefault();
            // Handle selection will be triggered by SearchResults component
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose, totalResults]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const handleResultClick = useCallback(() => {
    handleClose();
    setQuery('');
  }, [handleClose]);

  // Render the full-page overlay via portal
  const renderOverlay = () => {
    if (!isVisible) return null;

    return createPortal(
      <div
        className={`fixed inset-0 z-50 transition-all duration-200 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleBackdropClick}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

        {/* Centered content */}
        <div className="relative h-full flex flex-col items-center pt-[10vh] sm:pt-[15vh] px-4">
          {/* Search container (input + results) */}
          <div
            ref={containerRef}
            className={`w-full max-w-[650px] transition-all duration-200 transform ${
              isAnimating
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-95 -translate-y-4'
            }`}
          >
            {/* Search box container */}
            <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
              {/* Search input area */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  {isSearching ? (
                    <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                  ) : (
                    <Search className="h-6 w-6 text-gray-400" />
                  )}
                </div>

                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search customers, products, loadings..."
                  className="
                    w-full pl-14 pr-24 py-5
                    bg-transparent
                    text-lg text-white placeholder-gray-400
                    focus:outline-none
                    transition-all duration-200
                  "
                  autoComplete="off"
                  autoFocus
                  enterKeyHint="search"
                />

                <div className="absolute inset-y-0 right-0 flex items-center gap-3 pr-5">
                  {/* Clear button */}
                  {query && (
                    <button
                      onClick={handleClear}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X size={18} className="text-gray-400" />
                    </button>
                  )}

                  {/* Keyboard shortcut hint */}
                  <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10">
                    <span className="text-xs text-gray-400">ESC</span>
                  </div>
                </div>
              </div>

              {/* Results section */}
              {hasQuery && (
                <>
                  <div className="border-t border-white/10" />
                  {loading && query.length >= 2 ? (
                    <div className="p-8 text-center text-gray-400">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p>Searching...</p>
                    </div>
                  ) : (
                    <SearchResults
                      results={results}
                      totalResults={totalResults}
                      onResultClick={handleResultClick}
                      selectedIndex={selectedIndex}
                      bookedStock={bookedStock}
                    />
                  )}

                  {/* Results footer */}
                  {!loading && totalResults > 0 && (
                    <div className="px-5 py-3 border-t border-white/10 text-xs text-gray-400 flex items-center justify-between">
                      <span>{totalResults} result{totalResults !== 1 ? 's' : ''} found</span>
                      <span className="flex items-center gap-4">
                        <span className="hidden sm:inline">↑↓ Navigate</span>
                        <span className="hidden sm:inline">↵ Select</span>
                        <span>ESC Close</span>
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Empty state when no query */}
              {!hasQuery && (
                <>
                  <div className="border-t border-white/10" />
                  <div className="p-8 text-center text-gray-400">
                    <Search className="h-12 w-12 mx-auto mb-3 text-gray-500" />
                    <p className="text-lg mb-1">Start typing to search</p>
                    <p className="text-sm text-gray-500">
                      Search across customers, suppliers, products, sales, loadings, and paddy trucks
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      {/* Header search trigger */}
      <div className="relative flex-1 max-w-md mx-2 sm:mx-4">
        <button
          onClick={onOpen}
          className="
            w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2
            bg-white/5
            border border-white/10
            rounded-lg
            text-gray-400 text-sm
            hover:bg-white/10 hover:border-white/20
            focus:outline-none focus:ring-2 focus:ring-white/20
            transition-all duration-200
            cursor-text
          "
        >
          <Search className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-left truncate">Search...</span>
          <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
            <Command size={10} />
            <span className="text-xs">K</span>
          </div>
        </button>
      </div>

      {/* Full-page overlay */}
      {renderOverlay()}
    </>
  );
};
