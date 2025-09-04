import { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Plus, Search, Calendar, TrendingUp } from 'lucide-react';

const salesData = [
  {
    id: 1,
    orderId: 'ORD-2024-001',
    customer: 'Raj Kumar',
    date: '2024-01-15',
    items: 5,
    amount: '₦45,000',
    status: 'completed',
    paymentStatus: 'paid'
  },
  {
    id: 2,
    orderId: 'ORD-2024-002',
    customer: 'Sharma Traders',
    date: '2024-01-14',
    items: 3,
    amount: '₦32,500',
    status: 'completed',
    paymentStatus: 'pending'
  },
  {
    id: 3,
    orderId: 'ORD-2024-003',
    customer: 'Gupta & Sons',
    date: '2024-01-14',
    items: 8,
    amount: '₦67,800',
    status: 'processing',
    paymentStatus: 'partial'
  },
  {
    id: 4,
    orderId: 'ORD-2024-004',
    customer: 'Kumar Enterprises',
    date: '2024-01-13',
    items: 12,
    amount: '₦1,25,000',
    status: 'completed',
    paymentStatus: 'paid'
  },
];

export const Sales = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sales</h1>
          <p className="text-muted">Track and manage your sales transactions</p>
        </div>
        <Button variant="primary">
          <Plus size={20} />
          New Sale
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Today's Sales</p>
              <p className="text-2xl font-bold">₦2,45,000</p>
            </div>
            <TrendingUp className="text-green-400" size={24} />
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">This Week</p>
              <p className="text-2xl font-bold">₦12,45,000</p>
            </div>
            <Calendar className="text-blue-400" size={24} />
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">This Month</p>
              <p className="text-2xl font-bold">₦45,67,000</p>
            </div>
            <Calendar className="text-purple-400" size={24} />
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Pending Payment</p>
              <p className="text-2xl font-bold">₦3,25,000</p>
            </div>
            <Calendar className="text-yellow-400" size={24} />
          </div>
        </GlassCard>
      </div>
      
      <GlassCard>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={20} />
            <input
              type="text"
              placeholder="Search sales..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-muted-text"
            />
          </div>
          <select 
            className="px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-glass">
                <th className="text-left py-3 px-4">Order ID</th>
                <th className="text-left py-3 px-4">Customer</th>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Items</th>
                <th className="text-left py-3 px-4">Amount</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Payment</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {salesData.map((sale) => (
                <tr key={sale.id} className="border-b border-glass/50 hover:bg-glass transition-colors">
                  <td className="py-3 px-4 font-medium">{sale.orderId}</td>
                  <td className="py-3 px-4">{sale.customer}</td>
                  <td className="py-3 px-4">{sale.date}</td>
                  <td className="py-3 px-4">{sale.items}</td>
                  <td className="py-3 px-4 font-semibold">{sale.amount}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      sale.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      sale.paymentStatus === 'paid'
                        ? 'bg-green-500/20 text-green-400'
                        : sale.paymentStatus === 'partial'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {sale.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">View</Button>
                      <Button variant="ghost" size="sm">Invoice</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};