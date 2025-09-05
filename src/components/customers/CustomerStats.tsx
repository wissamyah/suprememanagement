import { GlassCard } from '../ui/GlassCard';
import { Skeleton } from '../ui/Skeleton';
import { Users, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/customers';

interface CustomerStatsProps {
  stats: {
    totalCustomers: number;
    totalPositiveBalance: number;
    totalNegativeBalance: number;
    customersWithDebt: number;
  };
  loading?: boolean;
}

export const CustomerStats = ({ stats, loading }: CustomerStatsProps) => {
  const statCards = [
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      format: (val: number) => val.toString()
    },
    {
      title: 'Total Receivables',
      value: stats.totalPositiveBalance,
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      format: formatCurrency
    },
    {
      title: 'Total Payables',
      value: stats.totalNegativeBalance,
      icon: TrendingDown,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      format: formatCurrency
    },
    {
      title: 'Customers with Debt',
      value: stats.customersWithDebt,
      icon: AlertCircle,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      format: (val: number) => val.toString()
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <GlassCard key={index} className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted mb-1">{stat.title}</p>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.format(stat.value)}
                </p>
              )}
            </div>
            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={stat.color} size={20} />
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
};