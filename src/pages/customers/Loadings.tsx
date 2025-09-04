import { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Plus, Search, Truck, Clock, CheckCircle, Package } from 'lucide-react';

const loadingsData = [
  {
    id: 1,
    loadingId: 'LD-2024-001',
    orderId: 'ORD-2024-001',
    customer: 'Raj Kumar',
    vehicle: 'MH12AB1234',
    driver: 'Ramesh Kumar',
    date: '2024-01-15',
    status: 'completed',
    items: [
      { name: 'Basmati Rice', quantity: '500 kg' },
      { name: 'Wheat Flour', quantity: '300 kg' }
    ]
  },
  {
    id: 2,
    loadingId: 'LD-2024-002',
    orderId: 'ORD-2024-002',
    customer: 'Sharma Traders',
    vehicle: 'DL01CD5678',
    driver: 'Suresh Singh',
    date: '2024-01-15',
    status: 'in-transit',
    items: [
      { name: 'Sugar', quantity: '200 kg' },
      { name: 'Cooking Oil', quantity: '100 L' }
    ]
  },
  {
    id: 3,
    loadingId: 'LD-2024-003',
    orderId: 'ORD-2024-003',
    customer: 'Gupta & Sons',
    vehicle: 'KA05EF9012',
    driver: 'Vijay Sharma',
    date: '2024-01-15',
    status: 'loading',
    items: [
      { name: 'Red Lentils', quantity: '150 kg' }
    ]
  },
  {
    id: 4,
    loadingId: 'LD-2024-004',
    orderId: 'ORD-2024-004',
    customer: 'Kumar Enterprises',
    vehicle: 'TN22GH3456',
    driver: 'Arun Kumar',
    date: '2024-01-14',
    status: 'scheduled',
    items: [
      { name: 'Basmati Rice', quantity: '1000 kg' },
      { name: 'Sugar', quantity: '500 kg' }
    ]
  },
];

export const Loadings = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'bg-green-500/20 text-green-400';
      case 'in-transit': return 'bg-blue-500/20 text-blue-400';
      case 'loading': return 'bg-yellow-500/20 text-yellow-400';
      case 'scheduled': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed': return <CheckCircle size={16} />;
      case 'in-transit': return <Truck size={16} />;
      case 'loading': return <Package size={16} />;
      case 'scheduled': return <Clock size={16} />;
      default: return null;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Loadings</h1>
          <p className="text-muted">Track and manage loading operations</p>
        </div>
        <Button variant="primary">
          <Plus size={20} />
          New Loading
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Today's Loadings</p>
              <p className="text-2xl font-bold">8</p>
            </div>
            <Truck className="text-blue-400" size={24} />
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">In Transit</p>
              <p className="text-2xl font-bold">3</p>
            </div>
            <Clock className="text-yellow-400" size={24} />
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Completed Today</p>
              <p className="text-2xl font-bold">5</p>
            </div>
            <CheckCircle className="text-green-400" size={24} />
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Scheduled</p>
              <p className="text-2xl font-bold">12</p>
            </div>
            <Package className="text-purple-400" size={24} />
          </div>
        </GlassCard>
      </div>
      
      <GlassCard>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={20} />
            <input
              type="text"
              placeholder="Search loadings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-muted-text"
            />
          </div>
          <select 
            className="px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="loading">Loading</option>
            <option value="in-transit">In Transit</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {loadingsData.map((loading) => (
            <div key={loading.id} className="glass rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{loading.loadingId}</h3>
                  <p className="text-sm text-muted">Order: {loading.orderId}</p>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 ${getStatusColor(loading.status)}`}>
                  {getStatusIcon(loading.status)}
                  {loading.status.replace('-', ' ')}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted">Customer:</span>
                  <span className="font-medium">{loading.customer}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted">Vehicle:</span>
                  <span className="font-medium">{loading.vehicle}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted">Driver:</span>
                  <span className="font-medium">{loading.driver}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted">Date:</span>
                  <span className="font-medium">{loading.date}</span>
                </div>
              </div>
              
              <div className="border-t border-glass pt-3">
                <p className="text-sm text-muted mb-2">Items:</p>
                <div className="space-y-1">
                  {loading.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="font-medium">{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1">View Details</Button>
                <Button variant="ghost" size="sm" className="flex-1">Update Status</Button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};