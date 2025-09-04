import { Bell, Search, Settings, User } from 'lucide-react';

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
        
        <div className="flex items-center gap-3">
          <button className="p-2 glass rounded-lg glass-hover relative">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          
          <button className="p-2 glass rounded-lg glass-hover">
            <Settings size={20} />
          </button>
          
          <button className="p-2 glass rounded-lg glass-hover">
            <User size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};