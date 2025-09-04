import { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Plus, Search, Phone, Mail, MapPin, User } from 'lucide-react';

const customers = [
  { 
    id: 1, 
    name: 'Raj Kumar', 
    email: 'raj.kumar@email.com', 
    phone: '+91 98765 43210',
    address: 'Mumbai, Maharashtra',
    totalOrders: 45,
    totalBusiness: '₦5,45,000'
  },
  { 
    id: 2, 
    name: 'Sharma Traders', 
    email: 'contact@sharmatraders.com', 
    phone: '+91 98765 43211',
    address: 'Delhi, NCR',
    totalOrders: 32,
    totalBusiness: '₦3,25,000'
  },
  { 
    id: 3, 
    name: 'Gupta & Sons', 
    email: 'info@guptasons.com', 
    phone: '+91 98765 43212',
    address: 'Bangalore, Karnataka',
    totalOrders: 28,
    totalBusiness: '₦2,85,000'
  },
  { 
    id: 4, 
    name: 'Kumar Enterprises', 
    email: 'sales@kumarenterprises.com', 
    phone: '+91 98765 43213',
    address: 'Chennai, Tamil Nadu',
    totalOrders: 52,
    totalBusiness: '₦6,15,000'
  },
];

export const CustomerList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Customers</h1>
          <p className="text-muted">Manage your customer information and relationships</p>
        </div>
        <Button variant="primary">
          <Plus size={20} />
          Add Customer
        </Button>
      </div>
      
      <GlassCard>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={20} />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-muted-text"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <div key={customer.id} className="glass rounded-lg p-4 glass-hover cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 glass rounded-lg">
                  <User size={24} />
                </div>
                <Button variant="ghost" size="sm">View Details</Button>
              </div>
              
              <h3 className="font-semibold text-lg mb-3">{customer.name}</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted">
                  <Mail size={14} />
                  <span className="truncate">{customer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <Phone size={14} />
                  <span>{customer.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <MapPin size={14} />
                  <span>{customer.address}</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-glass flex justify-between text-sm">
                <div>
                  <p className="text-muted">Total Orders</p>
                  <p className="font-semibold">{customer.totalOrders}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted">Total Business</p>
                  <p className="font-semibold">{customer.totalBusiness}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};