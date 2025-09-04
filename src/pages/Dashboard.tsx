import { GlassCard } from '../components/ui/GlassCard';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  DollarSign, 
  ShoppingCart,
  Activity,
  Truck
} from 'lucide-react';

const stats = [
  {
    title: 'Total Revenue',
    value: '₦12,45,000',
    change: '+12.5%',
    trend: 'up',
    icon: <DollarSign size={24} />
  },
  {
    title: 'Total Customers',
    value: '245',
    change: '+8 this month',
    trend: 'up',
    icon: <Users size={24} />
  },
  {
    title: 'Inventory Items',
    value: '1,842',
    change: '-2.3%',
    trend: 'down',
    icon: <Package size={24} />
  },
  {
    title: 'Active Orders',
    value: '32',
    change: '+15%',
    trend: 'up',
    icon: <ShoppingCart size={24} />
  }
];

const recentActivities = [
  { id: 1, type: 'sale', description: 'New sale to Raj Kumar - ₦45,000', time: '2 hours ago' },
  { id: 2, type: 'loading', description: 'Loading completed for Order #1234', time: '4 hours ago' },
  { id: 3, type: 'supplier', description: 'Paddy truck received from Supplier A', time: '6 hours ago' },
  { id: 4, type: 'inventory', description: 'Low stock alert: Basmati Rice', time: '8 hours ago' },
];

export const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400">Welcome back! Here's what's happening with your business today.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <GlassCard key={index}>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-gray-400">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
                <div className="flex items-center gap-1">
                  {stat.trend === 'up' ? (
                    <TrendingUp size={16} className="text-green-400" />
                  ) : (
                    <TrendingDown size={16} className="text-red-400" />
                  )}
                  <span className={`text-sm ${stat.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                    {stat.change}
                  </span>
                </div>
              </div>
              <div className="p-3 glass rounded-lg">
                {stat.icon}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity size={20} />
            Recent Activity
          </h2>
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 glass rounded-lg">
                <div>
                  <p className="text-sm font-medium">{activity.description}</p>
                  <p className="text-xs text-gray-400">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
        
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Truck size={20} />
            Pending Deliveries
          </h2>
          <div className="space-y-3">
            <div className="p-3 glass rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">Order #1235</p>
                  <p className="text-sm text-gray-400">Customer: Sharma Traders</p>
                </div>
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                  In Transit
                </span>
              </div>
            </div>
            <div className="p-3 glass rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">Order #1236</p>
                  <p className="text-sm text-gray-400">Customer: Gupta & Sons</p>
                </div>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                  Processing
                </span>
              </div>
            </div>
            <div className="p-3 glass rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">Order #1237</p>
                  <p className="text-sm text-gray-400">Customer: Kumar Enterprises</p>
                </div>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                  Ready
                </span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};