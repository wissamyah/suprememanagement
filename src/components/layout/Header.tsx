import { Search } from 'lucide-react';
import { SyncStatus } from '../SyncStatus';

export const Header = () => {
  return (
    <header className="h-16 glass border-b border-white/10 sticky top-0 z-20">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative max-w-md w-full lg:ml-0 ml-12">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-gray-400 text-gray-100"
            />
          </div>
        </div>
        
        <div className="flex items-center">
          <SyncStatus />
        </div>
      </div>
    </header>
  );
};