import { SyncStatus } from '../SyncStatus';

export const Header = () => {
  return (
    <header className="h-16 glass border-b border-white/10 sticky top-0 z-20">
      <div className="h-full px-4 sm:px-6 flex items-center justify-end">
        <div className="flex items-center">
          <SyncStatus />
        </div>
      </div>
    </header>
  );
};