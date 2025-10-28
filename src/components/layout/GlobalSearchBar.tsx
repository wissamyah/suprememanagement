import { useState, useRef, useEffect, useCallback } from 'react';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { results, totalResults, loading, isSearching, hasQuery, bookedStock } = useGlobalSearch(query);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Check if click is inside a modal (modals have z-50 and are portals)
      const isInsideModal = target.closest('[class*="z-50"]') !== null;

      if (
        isOpen &&
        resultsRef.current &&
        !resultsRef.current.contains(target) &&
        !inputRef.current?.contains(target) &&
        !isInsideModal
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Check if a modal is currently open (by checking for modal backdrop)
      const isModalOpen = document.querySelector('[class*="z-50"]') !== null;

      switch (e.key) {
        case 'Escape':
          // Only close search if no modal is open
          if (!isModalOpen) {
            e.preventDefault();
            onClose();
          }
          break;
        case 'ArrowDown':
          if (!isModalOpen) {
            e.preventDefault();
            setSelectedIndex((prev) => Math.min(prev + 1, totalResults - 1));
          }
          break;
        case 'ArrowUp':
          if (!isModalOpen) {
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
          }
          break;
        case 'Enter':
          if (!isModalOpen) {
            e.preventDefault();
            // Handle selection will be triggered by SearchResults component
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, totalResults]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const handleResultClick = useCallback(() => {
    onClose();
    setQuery('');
  }, [onClose]);

  // Removed handleKeyboardSelect as it's not currently used

  return (
    <div className="relative flex-1 max-w-2xl mx-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-gray-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={onOpen}
          placeholder="Search customers, products, loadings..."
          className="
            w-full pl-10 pr-24 py-2.5
            bg-white/5 backdrop-blur-md
            border border-white/10
            rounded-lg
            text-white placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent
            transition-all duration-200
          "
        />

        <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-3">
          {/* Keyboard shortcut hint */}
          {!isOpen && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10">
              <Command size={12} className="text-gray-400" />
              <span className="text-xs text-gray-400">K</span>
            </div>
          )}

          {/* Clear button */}
          {query && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X size={16} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && hasQuery && (
        <div
          ref={resultsRef}
          className="
            absolute top-full left-0 right-0 mt-2
            bg-gray-900/95 backdrop-blur-xl border border-white/20
            rounded-lg shadow-2xl
            z-50
            animate-in fade-in slide-in-from-top-2 duration-200
          "
        >
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
            <div className="px-4 py-2 border-t border-white/10 text-xs text-gray-400 flex items-center justify-between">
              <span>{totalResults} result{totalResults !== 1 ? 's' : ''} found</span>
              <span className="flex items-center gap-4">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>Esc Close</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Empty state when search is open but no query */}
      {isOpen && !hasQuery && (
        <div
          ref={resultsRef}
          className="
            absolute top-full left-0 right-0 mt-2
            bg-gray-900/95 backdrop-blur-xl border border-white/20
            rounded-lg shadow-2xl
            z-50
            p-8 text-center text-gray-400
            animate-in fade-in slide-in-from-top-2 duration-200
          "
        >
          <Search className="h-12 w-12 mx-auto mb-3 text-gray-500" />
          <p className="text-lg mb-1">Start typing to search</p>
          <p className="text-sm text-gray-500">
            Search across customers, suppliers, products, sales, loadings, and paddy trucks
          </p>
        </div>
      )}
    </div>
  );
};
