import { GlassCard } from '../ui/GlassCard';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface LedgerStatisticsProps {
  totalDebit: number;
  totalCredit: number;
  balance: number;
  customerId?: string;
}

export const LedgerStatistics = ({
  totalDebit,
  totalCredit,
  balance,
  customerId
}: LedgerStatisticsProps) => {
  const formatCurrency = (amount: number) => {
    return `₦${Math.abs(amount).toLocaleString()}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <GlassCard>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Total Sales/Debits</p>
            <p className="text-2xl font-bold text-red-400">
              {formatCurrency(totalDebit)}
            </p>
          </div>
          <TrendingUp className="text-red-400" size={24} />
        </div>
      </GlassCard>
      <GlassCard>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Total Payments/Credits</p>
            <p className="text-2xl font-bold text-green-400">
              {formatCurrency(totalCredit)}
            </p>
          </div>
          <TrendingDown className="text-green-400" size={24} />
        </div>
      </GlassCard>
      <GlassCard>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">
              {customerId ? 'Current Balance' : 'Net Outstanding'}
            </p>
            <p className={`text-2xl font-bold ${
              balance < 0 ? 'text-red-400' :
              balance > 0 ? 'text-green-400' :
              'text-yellow-400'
            }`}>
              {formatCurrency(Math.abs(balance))}
            </p>
            {balance < 0 && (
              <p className="text-xs text-red-400 mt-1">Customer owes</p>
            )}
            {balance > 0 && (
              <p className="text-xs text-green-400 mt-1">Customer has credit</p>
            )}
          </div>
          <DollarSign className={
            balance < 0 ? 'text-red-400' :
            balance > 0 ? 'text-green-400' :
            'text-yellow-400'
          } size={24} />
        </div>
      </GlassCard>
    </div>
  );
};