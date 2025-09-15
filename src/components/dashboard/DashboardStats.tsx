import { GlassCard } from '../ui/GlassCard';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: ReactNode;
  subtitle: string;
}

export const StatCard = ({ title, value, change, trend, icon, subtitle }: StatCardProps) => {
  return (
    <GlassCard>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          <div className="flex items-center gap-1">
            {trend === 'up' ? (
              <TrendingUp size={16} className="text-green-400" />
            ) : (
              <TrendingDown size={16} className="text-red-400" />
            )}
            <span className={`text-sm ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
              {change}
            </span>
          </div>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className="p-3 glass rounded-lg">
          {icon}
        </div>
      </div>
    </GlassCard>
  );
};

interface DashboardStatsProps {
  stats: Array<{
    title: string;
    value: string;
    change: string;
    trend: 'up' | 'down';
    icon: ReactNode;
    subtitle: string;
  }>;
}

export const DashboardStats = ({ stats }: DashboardStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
};