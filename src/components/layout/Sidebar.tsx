import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  FileText,
  ChevronDown,
  ChevronRight,
  X,
  ShoppingCart,
  BookOpen,
  List,
  Wheat,
  Settings as SettingsIcon,
  ArrowRight,
  Factory
} from 'lucide-react';

interface MenuItem {
  title: string;
  path?: string;
  icon: React.ReactNode;
  subItems?: { title: string; path: string; icon?: React.ReactNode }[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    path: '/',
    icon: <LayoutDashboard size={20} />
  },
  {
    title: 'Inventory',
    path: '/inventory',
    icon: <Package size={20} />
  },
  {
    title: 'Customers',
    icon: <Users size={20} />,
    subItems: [
      { title: 'Customer List', path: '/customers', icon: <List size={18} /> },
      { title: 'Sales', path: '/customers/sales', icon: <ShoppingCart size={18} /> },
      { title: 'Loadings', path: '/customers/loadings', icon: <Truck size={18} /> },
      { title: 'Ledger', path: '/customers/ledger', icon: <BookOpen size={18} /> }
    ]
  },
  {
    title: 'Suppliers',
    icon: <Truck size={20} />,
    subItems: [
      { title: 'Supplier List', path: '/suppliers', icon: <List size={18} /> },
      { title: 'Paddy Trucks', path: '/suppliers/paddy-trucks', icon: <Wheat size={18} /> },
      { title: 'Ledger', path: '/suppliers/ledger', icon: <BookOpen size={18} /> }
    ]
  },
  {
    title: 'Reports',
    path: '/reports',
    icon: <FileText size={20} />
  },
  {
    title: 'Settings',
    path: '/settings',
    icon: <SettingsIcon size={20} />
  }
];

export const Sidebar = () => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [justExpandedItem, setJustExpandedItem] = useState<string | null>(null);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Clear animation trigger after animation completes
  useEffect(() => {
    if (justExpandedItem) {
      const timer = setTimeout(() => {
        setJustExpandedItem(null);
      }, 500); // Clear after animation duration
      return () => clearTimeout(timer);
    }
  }, [justExpandedItem]);

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => {
      const isExpanding = !prev.includes(title);
      if (isExpanding) {
        setJustExpandedItem(title);
      }
      return prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title];
    });
  };

  const SidebarContent = () => (
    <>
      <div className="h-16 px-4 border-b border-gray-800/50 flex items-center">
        <div className="flex items-center gap-3">
          <Factory size={20} className="text-gray-400" />
          <h1 className="text-lg font-semibold text-gray-200">
            Supreme Rice Mills
          </h1>
        </div>
      </div>
      
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <div key={item.title}>
            {item.path ? (
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `sidebar-item ${isActive ? 'sidebar-item-active' : 'glass-hover'}`
                }
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.icon}
                <span>{item.title}</span>
              </NavLink>
            ) : (
              <>
                <div
                  className="sidebar-item glass-hover"
                  onClick={() => toggleExpanded(item.title)}
                >
                  {item.icon}
                  <span className="flex-1">{item.title}</span>
                  {expandedItems.includes(item.title) ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </div>
                <div className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.4,0.0,0.2,1)] ${
                  expandedItems.includes(item.title) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  {item.subItems && (
                    <div className="ml-4 mt-2 space-y-1 pb-2">
                      {item.subItems.map((subItem, index) => (
                        <NavLink
                          key={subItem.path}
                          to={subItem.path}
                          end
                          className={({ isActive }) =>
                            `sidebar-item text-sm transition-all duration-300 ${isActive ? 'sidebar-item-active' : 'glass-hover'}`
                          }
                          onClick={() => setIsMobileMenuOpen(false)}
                          style={{
                            animation: justExpandedItem === item.title
                              ? `slideInFromLeft 0.3s ease-out ${index * 0.05}s both`
                              : 'none'
                          }}
                        >
                          {subItem.icon}
                          <span>{subItem.title}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button - Clean Design */}
      <button
        className={`lg:hidden fixed left-4 z-40 w-10 h-10 rounded-xl glass backdrop-blur-xl transition-all duration-300 ${
          isMobileMenuOpen 
            ? 'bg-white/20 shadow-lg' 
            : 'bg-white/10 hover:bg-white/15 hover:shadow-md'
        }`}
        style={{ top: '12px' }}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <div className="relative flex items-center justify-center w-full h-full">
          {/* Simple hamburger menu that transforms to X */}
          <div className="relative w-5 h-4 flex flex-col justify-between">
            <span className={`block h-0.5 w-full bg-white rounded-full transform transition-all duration-300 origin-left ${
              isMobileMenuOpen ? 'rotate-45 translate-y-0.5' : ''
            }`} />
            <span className={`block h-0.5 w-full bg-white rounded-full transition-all duration-300 ${
              isMobileMenuOpen ? 'opacity-0 translate-x-3' : ''
            }`} />
            <span className={`block h-0.5 w-full bg-white rounded-full transform transition-all duration-300 origin-left ${
              isMobileMenuOpen ? '-rotate-45 -translate-y-0.5' : ''
            }`} />
          </div>
        </div>
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 h-screen glass border-r border-gray-800/50 sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Menu - Directly in return statement, not as a nested component */}
      <div className={`lg:hidden fixed inset-0 z-50 ${isMobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <div 
          className={`absolute inset-0 bg-black transition-opacity duration-500 ease-out ${
            isMobileMenuOpen 
              ? 'opacity-80 backdrop-blur-sm' 
              : 'opacity-0'
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        
        {/* Menu Content - Sliding from left */}
        <div 
          className={`absolute inset-y-0 left-0 w-full max-w-sm flex flex-col bg-gradient-to-br from-gray-900/95 via-gray-900/98 to-black/95 backdrop-blur-2xl shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Header */}
          <div className="h-16 px-4 border-b border-gray-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Factory size={20} className="text-gray-400" />
              <h1 className="text-lg font-semibold text-gray-200">
                Supreme Rice Mills
              </h1>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 glass rounded-lg hover:bg-white/10 transition-all"
            >
              <X size={18} />
            </button>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {menuItems.map((item) => (
                <div key={item.title}>
                  {item.path ? (
                    <NavLink
                      to={item.path}
                      end={item.path === '/'}
                      className={({ isActive }) =>
                        `flex items-center gap-4 p-4 rounded-xl transition-all ${
                          isActive 
                            ? 'bg-white/10 text-white shadow-lg' 
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }`
                      }
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="p-2 glass rounded-lg">
                        {item.icon}
                      </div>
                      <span className="font-medium text-base">{item.title}</span>
                      {item.path && (
                        <ArrowRight size={16} className="ml-auto opacity-50" />
                      )}
                    </NavLink>
                  ) : (
                    <>
                      <button
                        className="w-full flex items-center gap-4 p-4 rounded-xl text-gray-300 hover:bg-white/5 hover:text-white transition-all"
                        onClick={() => toggleExpanded(item.title)}
                      >
                        <div className="p-2 glass rounded-lg">
                          {item.icon}
                        </div>
                        <span className="font-medium text-base flex-1 text-left">{item.title}</span>
                        {expandedItems.includes(item.title) ? (
                          <ChevronDown size={18} />
                        ) : (
                          <ChevronRight size={18} />
                        )}
                      </button>
                      <div className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.4,0.0,0.2,1)] ${
                        expandedItems.includes(item.title) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        {item.subItems && (
                          <div className="mt-2 ml-4 space-y-1 pb-2">
                            {item.subItems.map((subItem, index) => (
                              <NavLink
                                key={subItem.path}
                                to={subItem.path}
                                end
                                className={({ isActive }) =>
                                  `flex items-center gap-3 p-3 pl-8 rounded-lg transition-all duration-300 ${
                                    isActive 
                                      ? 'bg-white/10 text-white' 
                                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                  }`
                                }
                                onClick={() => setIsMobileMenuOpen(false)}
                                style={{
                                  animation: justExpandedItem === item.title 
                                    ? `slideInFromLeft 0.3s ease-out ${index * 0.05}s both`
                                    : 'none'
                                }}
                              >
                                {subItem.icon || <div className="w-4" />}
                                <span className="text-sm">{subItem.title}</span>
                              </NavLink>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </nav>
          
          {/* Footer */}
          <div className="p-6 border-t border-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Factory size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Supreme Rice Mills</p>
                <p className="text-xs text-muted">v1.0.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};