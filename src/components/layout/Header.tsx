import { SyncStatus } from '../SyncStatus';
import { GlobalSearchBar } from './GlobalSearchBar';

interface HeaderProps {
  isSearchOpen: boolean;
  onSearchOpen: () => void;
  onSearchClose: () => void;
}

export const Header = ({ isSearchOpen, onSearchOpen, onSearchClose }: HeaderProps) => {
  return (
    <header className="h-16 glass border-b border-gray-800/50 sticky top-0 z-20">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Logo/Title (optional - currently empty for more search space) */}
        <div className="hidden sm:block w-8" />

        {/* Global Search Bar */}
        <GlobalSearchBar
          isOpen={isSearchOpen}
          onOpen={onSearchOpen}
          onClose={onSearchClose}
        />

        {/* Right side - Sync Status */}
        <div className="flex items-center">
          <SyncStatus />
        </div>
      </div>
    </header>
  );
};