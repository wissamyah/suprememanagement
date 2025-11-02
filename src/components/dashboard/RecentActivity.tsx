import { GlassCard } from '../ui/GlassCard';
import { Activity, DollarSign, Truck, Package2, AlertTriangle, CreditCard } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'sale' | 'loading' | 'supplier' | 'inventory' | 'payment';
  description: string;
  timeAgo: string;
  metadata?: {
    customerName?: string;
    amount?: number;
    quantity?: string;
    supplierName?: string;
    weight?: number;
    productName?: string;
    unit?: string;
    itemNames?: string;
    truckPlate?: string;
    pricePerKg?: number;
  };
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

export const RecentActivity = ({ activities }: RecentActivityProps) => {
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'sale':
        return <DollarSign size={14} />;
      case 'loading':
        return <Truck size={14} />;
      case 'supplier':
        return <Package2 size={14} />;
      case 'inventory':
        return <AlertTriangle size={14} />;
      case 'payment':
        return <CreditCard size={14} />;
      default:
        return <Activity size={14} />;
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
      case 'payment':
        return 'bg-cyan-500/20 text-cyan-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatMainText = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'sale':
        return `Sale to ${activity.metadata?.customerName || 'Customer'}`;
      case 'loading':
        return `Loading for ${activity.metadata?.customerName || 'Customer'}`;
      case 'supplier':
        return activity.metadata?.supplierName || 'Supplier';
      case 'inventory':
        return activity.metadata?.productName || 'Product';
      case 'payment':
        return `Payment from ${activity.metadata?.customerName || 'Customer'}`;
      default:
        return activity.description;
    }
  };

  const formatSubtext = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'sale': {
        const amount = activity.metadata?.amount ? `₦${activity.metadata.amount.toLocaleString()}` : '';
        const items = activity.metadata?.itemNames || '';
        return [amount, items].filter(Boolean).join(' · ');
      }
      case 'loading': {
        const quantity = activity.metadata?.quantity || '';
        const plate = activity.metadata?.truckPlate || '';
        return [quantity, plate].filter(Boolean).join(' · ');
      }
      case 'supplier': {
        const weight = activity.metadata?.weight ? `${activity.metadata.weight.toLocaleString()}kg` : '';
        const plate = activity.metadata?.truckPlate || '';
        const price = activity.metadata?.pricePerKg ? ` @ ₦${activity.metadata.pricePerKg.toLocaleString()}/kg` : '';
        return `${weight}${price} · ${plate}`;
      }
      case 'inventory':
        return activity.metadata?.quantity || '';
      case 'payment':
        return activity.metadata?.amount ? `₦${activity.metadata.amount.toLocaleString()}` : '';
      default:
        return '';
    }
  };

  return (
    <GlassCard>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Activity size={20} />
        Recent Activity
      </h2>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="p-2.5 glass rounded-lg">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-full flex-shrink-0 ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{formatMainText(activity)}</p>
                      {formatSubtext(activity) && (
                        <p className="text-xs text-gray-400/70 mt-0.5">{formatSubtext(activity)}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0 ml-2">
                      {activity.timeAgo}
                    </span>
                  </div>
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