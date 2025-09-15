import { GlassCard } from '../ui/GlassCard';
import { Activity, DollarSign, Truck, Package2, AlertTriangle } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'sale' | 'loading' | 'supplier' | 'inventory' | 'payment';
  description: string;
  timeAgo: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

export const RecentActivity = ({ activities }: RecentActivityProps) => {
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'sale':
        return <DollarSign size={16} />;
      case 'loading':
        return <Truck size={16} />;
      case 'supplier':
        return <Package2 size={16} />;
      case 'inventory':
        return <AlertTriangle size={16} />;
      default:
        return <Activity size={16} />;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'sale':
        return 'bg-green-500/20 text-green-400';
      case 'loading':
        return 'bg-blue-500/20 text-blue-400';
      case 'supplier':
        return 'bg-purple-500/20 text-purple-400';
      case 'inventory':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <GlassCard>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Activity size={20} />
        Recent Activity
      </h2>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-3 glass rounded-lg">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div>
                  <p className="text-sm font-medium">{activity.description}</p>
                  <p className="text-xs text-gray-400">{activity.timeAgo}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center py-4">No recent activities</p>
        )}
      </div>
    </GlassCard>
  );
};