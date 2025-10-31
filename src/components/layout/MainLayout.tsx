import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PendingSyncWarning } from '../PendingSyncWarning';

export const MainLayout = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global keyboard shortcut handler for Ctrl/Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+K (Windows/Linux) or Cmd+K (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen bg-gray-950 w-full max-w-full overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden h-full overflow-y-auto">
        <Header
          isSearchOpen={isSearchOpen}
          onSearchOpen={() => setIsSearchOpen(true)}
          onSearchClose={() => setIsSearchOpen(false)}
        />
        <main className="flex-1 p-6 overflow-x-hidden w-full max-w-full min-h-0">
          <Outlet />
        </main>
      </div>
      <PendingSyncWarning />
    </div>
  );
};