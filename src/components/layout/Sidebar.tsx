import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  FileText,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  ShoppingCart,
  BookOpen,
  List,
  Wheat
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
  }
];

export const Sidebar = () => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-glass">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Supreme Management
        </h1>
      </div>
      
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <div key={item.title}>
            {item.path ? (
              <NavLink
                to={item.path}
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
                {expandedItems.includes(item.title) && item.subItems && (
                  <div className="ml-4 mt-2 space-y-1">
                    {item.subItems.map((subItem) => (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        className={({ isActive }) =>
                          `sidebar-item text-sm ${isActive ? 'sidebar-item-active' : 'glass-hover'}`
                        }
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {subItem.icon}
                        <span>{subItem.title}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 glass rounded-lg glass-hover"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className="hidden lg:block w-64 h-screen glass border-r border-glass sticky top-0">
        <SidebarContent />
      </aside>

      {isMobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 w-64 h-screen glass z-40">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
};