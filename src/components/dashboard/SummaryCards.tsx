import { GlassCard } from '../ui/GlassCard';
import { Clock, Users, Package2 } from 'lucide-react';

interface SummaryCardsProps {
  todaySummary: {
    salesToday: number;
    revenueToday: number;
    loadingsToday: number;
    paddyTrucksToday: number;
  };
  customerDebtSummary: {
    totalOutstanding: number;
    customersWithDebt: number;
    averageDebt: number;
  };
  supplierSummary: {
    totalSuppliers: number;
    paddyReceivedKg: number;
    thisMonthValue: number;
  };
}

export const SummaryCards = ({ todaySummary, customerDebtSummary, supplierSummary }: SummaryCardsProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <GlassCard>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock size={20} />
          Today's Summary
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-2">
            <span className="text-gray-400">Sales Today</span>
            <span className="font-semibold">{todaySummary.salesToday}</span>
          </div>
          <div className="flex justify-between items-center p-2">
            <span className="text-gray-400">Revenue Today</span>
            <span className="font-semibold text-green-400">
              ₦{todaySummary.revenueToday.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center p-2">
            <span className="text-gray-400">Loadings Today</span>
            <span className="font-semibold">{todaySummary.loadingsToday}</span>
          </div>
          <div className="flex justify-between items-center p-2">
            <span className="text-gray-400">Paddy Trucks</span>
            <span className="font-semibold">{todaySummary.paddyTrucksToday}</span>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users size={20} />
          Customer Debt Summary
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-2">
            <span className="text-gray-400">Total Outstanding</span>
            <span className="font-semibold text-red-400">
              ₦{customerDebtSummary.totalOutstanding.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center p-2">
            <span className="text-gray-400">Customers with Debt</span>
            <span className="font-semibold">{customerDebtSummary.customersWithDebt}</span>
          </div>
          <div className="flex justify-between items-center p-2">
            <span className="text-gray-400">Average Debt</span>
            <span className="font-semibold">
              ₦{customerDebtSummary.averageDebt.toLocaleString()}
            </span>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Package2 size={20} />
          Supplier Summary
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-2">
            <span className="text-gray-400">Total Suppliers</span>
            <span className="font-semibold">{supplierSummary.totalSuppliers}</span>
          </div>
          <div className="flex justify-between items-center p-2">
            <span className="text-gray-400">Paddy Received (kg)</span>
            <span className="font-semibold">
              {supplierSummary.paddyReceivedKg.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center p-2">
            <span className="text-gray-400">This Month Value</span>
            <span className="font-semibold text-green-400">
              ₦{supplierSummary.thisMonthValue.toLocaleString()}
            </span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};