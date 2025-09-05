import { Outlet } from 'react-router-dom';
import { useContext, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PendingSyncWarning } from '../PendingSyncWarning';
import { GitHubContext } from '../../App';

export const MainLayout = () => {
  const { pendingChanges } = useContext(GitHubContext);

  // Warn users before leaving if there are pending changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingChanges && pendingChanges > 0) {
        const message = 'You have unsaved changes that will be lost. Are you sure you want to leave?';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingChanges]);

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
      <PendingSyncWarning />
    </div>
  );
};