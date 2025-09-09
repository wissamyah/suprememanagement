import { GlassCard } from '../ui/GlassCard';
import { Skeleton } from '../ui/Skeleton';
import { Users, UserCheck, TrendingUp } from 'lucide-react';

interface SupplierStatsProps {
  stats: {
    totalSuppliers: number;
    uniqueAgents: number;
    topAgent: string | null;
    topAgentCount: number;
  };
  loading: boolean;
}

export const SupplierStats = ({ stats, loading }: SupplierStatsProps) => {
  const statCards = [
    {
      title: 'Total Suppliers',
      value: stats.totalSuppliers,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      format: (val: number) => val.toString()
    },
    {
      title: 'Unique Agents',
      value: stats.uniqueAgents,
      icon: UserCheck,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      format: (val: number) => val.toString()
    },
    {
      title: 'Top Agent',
      value: stats.topAgent || 'N/A',
      subtitle: stats.topAgent ? `${stats.topAgentCount} suppliers` : undefined,
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      format: (val: any) => typeof val === 'string' ? val : val.toString()
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {statCards.map((stat, index) => (
        <GlassCard key={index} className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted mb-1">{stat.title}</p>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <p className={`text-2xl font-bold ${stat.color}`}>
                    {stat.format(stat.value)}
                  </p>
                  {stat.subtitle && (
                    <p className="text-xs text-muted mt-1">{stat.subtitle}</p>
                  )}
                </>
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