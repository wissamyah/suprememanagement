import { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Plus, Search, Truck, Weight, CheckCircle, Clock } from 'lucide-react';

const paddyTrucksData = [
  {
    id: 1,
    truckNo: 'PB-12-AB-1234',
    supplier: 'Punjab Agro Industries',
    driver: 'Harpreet Singh',
    arrivalDate: '2024-01-15',
    arrivalTime: '10:30 AM',
    grossWeight: 15000,
    tareWeight: 5000,
    netWeight: 10000,
    moistureLevel: '12.5%',
    quality: 'Grade A',
    status: 'unloaded',
    price: 2800,
    totalAmount: 280000
  },
  {
    id: 2,
    truckNo: 'HR-06-CD-5678',
    supplier: 'Haryana Rice Mills',
    driver: 'Rajesh Kumar',
    arrivalDate: '2024-01-15',
    arrivalTime: '02:15 PM',
    grossWeight: 18000,
    tareWeight: 5500,
    netWeight: 12500,
    moistureLevel: '13.2%',
    quality: 'Grade A',
    status: 'weighing',
    price: 2750,
    totalAmount: 343750
  },
  {
    id: 3,
    truckNo: 'UP-32-EF-9012',
    supplier: 'UP Grain Traders',
    driver: 'Sunil Yadav',
    arrivalDate: '2024-01-15',
    arrivalTime: '04:45 PM',
    grossWeight: 0,
    tareWeight: 0,
    netWeight: 0,
    moistureLevel: '-',
    quality: '-',
    status: 'waiting',
    price: 0,
    totalAmount: 0
  },
  {
    id: 4,
    truckNo: 'BR-10-GH-3456',
    supplier: 'Bihar Agricultural Co-op',
    driver: 'Rakesh Sharma',
    arrivalDate: '2024-01-14',
    arrivalTime: '09:00 AM',
    grossWeight: 16000,
    tareWeight: 5200,
    netWeight: 10800,
    moistureLevel: '14.0%',
    quality: 'Grade B',
    status: 'completed',
    price: 2600,
    totalAmount: 280800
  },
];

export const PaddyTrucks = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'bg-green-500/20 text-green-400';
      case 'unloaded': return 'bg-blue-500/20 text-blue-400';
      case 'weighing': return 'bg-yellow-500/20 text-yellow-400';
      case 'waiting': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };
  
  const totalTrucks = paddyTrucksData.length;
  const totalWeight = paddyTrucksData.reduce((sum, truck) => sum + truck.netWeight, 0);
  const totalValue = paddyTrucksData.reduce((sum, truck) => sum + truck.totalAmount, 0);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Paddy Trucks</h1>
          <p className="text-muted">Track and manage incoming paddy trucks</p>
        </div>
        <Button variant="primary">
          <Plus size={20} />
          Register Truck
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Today's Trucks</p>
              <p className="text-2xl font-bold">{totalTrucks}</p>
            </div>
            <Truck className="text-blue-400" size={24} />
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Total Weight</p>
              <p className="text-2xl font-bold">{(totalWeight / 1000).toFixed(1)} MT</p>
            </div>
            <Weight className="text-green-400" size={24} />
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Total Value</p>
              <p className="text-2xl font-bold">₦{(totalValue / 100000).toFixed(2)}L</p>
            </div>
            <CheckCircle className="text-purple-400" size={24} />
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">In Queue</p>
              <p className="text-2xl font-bold">2</p>
            </div>
            <Clock className="text-yellow-400" size={24} />
          </div>
        </GlassCard>
      </div>
      
      <GlassCard>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={20} />
            <input
              type="text"
              placeholder="Search by truck number or supplier..."
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
            <option value="waiting">Waiting</option>
            <option value="weighing">Weighing</option>
            <option value="unloaded">Unloaded</option>
            <option value="completed">Completed</option>
          </select>
          <select 
            className="px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-glass">
                <th className="text-left py-3 px-4">Truck No.</th>
                <th className="text-left py-3 px-4">Supplier</th>
                <th className="text-left py-3 px-4">Arrival</th>
                <th className="text-center py-3 px-4">Gross (kg)</th>
                <th className="text-center py-3 px-4">Tare (kg)</th>
                <th className="text-center py-3 px-4">Net (kg)</th>
                <th className="text-center py-3 px-4">Moisture</th>
                <th className="text-center py-3 px-4">Quality</th>
                <th className="text-right py-3 px-4">Amount (₦)</th>
                <th className="text-center py-3 px-4">Status</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paddyTrucksData.map((truck) => (
                <tr key={truck.id} className="border-b border-glass/50 hover:bg-glass transition-colors">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">{truck.truckNo}</p>
                      <p className="text-xs text-muted">{truck.driver}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">{truck.supplier}</td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm">{truck.arrivalDate}</p>
                      <p className="text-xs text-muted">{truck.arrivalTime}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">{truck.grossWeight || '-'}</td>
                  <td className="py-3 px-4 text-center">{truck.tareWeight || '-'}</td>
                  <td className="py-3 px-4 text-center font-semibold">{truck.netWeight || '-'}</td>
                  <td className="py-3 px-4 text-center">{truck.moistureLevel}</td>
                  <td className="py-3 px-4 text-center">
                    {truck.quality !== '-' && (
                      <span className={`px-2 py-1 text-xs rounded ${
                        truck.quality === 'Grade A' 
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {truck.quality}
                      </span>
                    )}
                    {truck.quality === '-' && '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">
                    {truck.totalAmount > 0 ? `₦${truck.totalAmount.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(truck.status)}`}>
                      {truck.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-center">
                      <Button variant="ghost" size="sm">Edit</Button>
                      <Button variant="ghost" size="sm">Print</Button>
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