import { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Plus, Search, Phone, Mail, MapPin, Truck } from 'lucide-react';

const suppliers = [
  {
    id: 1,
    name: 'Punjab Agro Industries',
    email: 'contact@punjabagro.com',
    phone: '+91 98123 45678',
    address: 'Ludhiana, Punjab',
    category: 'Paddy Supplier',
    totalBusiness: '₦45,00,000',
    status: 'active'
  },
  {
    id: 2,
    name: 'Haryana Rice Mills',
    email: 'info@haryanamills.com',
    phone: '+91 98123 45679',
    address: 'Karnal, Haryana',
    category: 'Rice Mill',
    totalBusiness: '₦32,50,000',
    status: 'active'
  },
  {
    id: 3,
    name: 'UP Grain Traders',
    email: 'sales@upgraintraders.com',
    phone: '+91 98123 45680',
    address: 'Meerut, Uttar Pradesh',
    category: 'Grain Supplier',
    totalBusiness: '₦28,75,000',
    status: 'active'
  },
  {
    id: 4,
    name: 'Bihar Agricultural Co-op',
    email: 'contact@biharcoop.com',
    phone: '+91 98123 45681',
    address: 'Patna, Bihar',
    category: 'Paddy Supplier',
    totalBusiness: '₦15,25,000',
    status: 'inactive'
  },
];

export const SupplierList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Suppliers</h1>
          <p className="text-muted">Manage your supplier information and relationships</p>
        </div>
        <Button variant="primary">
          <Plus size={20} />
          Add Supplier
        </Button>
      </div>
      
      <GlassCard>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={20} />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-muted-text"
            />
          </div>
          <select 
            className="px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="paddy">Paddy Supplier</option>
            <option value="rice">Rice Mill</option>
            <option value="grain">Grain Supplier</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="glass rounded-lg p-4 glass-hover cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 glass rounded-lg">
                  <Truck size={24} />
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  supplier.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {supplier.status}
                </span>
              </div>
              
              <h3 className="font-semibold text-lg mb-2">{supplier.name}</h3>
              <p className="text-sm text-muted mb-3">{supplier.category}</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted">
                  <Mail size={14} />
                  <span className="truncate">{supplier.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <Phone size={14} />
                  <span>{supplier.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <MapPin size={14} />
                  <span>{supplier.address}</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-glass">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted">Total Business</p>
                    <p className="font-semibold">{supplier.totalBusiness}</p>
                  </div>
                  <Button variant="ghost" size="sm">View Details</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};