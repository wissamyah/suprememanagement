import { GlassCard } from '../ui/GlassCard';
import { Clock, Users, Package2 } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

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
    customersList: Array<{
      name: string;
      balance: number;
    }>;
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
      <GlassCard className="lg:h-full">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="text-gray-400" size={20} />
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

      <Tooltip
        content={
          customerDebtSummary.customersList.length > 0 ? (
            <div className="min-w-[280px] max-w-[350px] max-h-[400px] overflow-y-auto">
              <div className="text-xs font-semibold mb-2 text-white/90 sticky top-0 bg-inherit pb-1">
                Customers with Outstanding Balance
              </div>
              <div className="space-y-1">
                {customerDebtSummary.customersList.map((customer, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center text-xs py-1.5 px-2 rounded hover:bg-white/5 transition-colors"
                  >
                    <span className="text-white/80 truncate pr-2" title={customer.name}>
                      {customer.name}
                    </span>
                    <span className="font-medium text-red-400 whitespace-nowrap">
                      ₦{customer.balance.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-white/70">No customers with outstanding balance</div>
          )
        }
        placement="top"
        className="max-w-[90vw]"
      >
        <GlassCard className="lg:h-full">
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
      </Tooltip>

      <GlassCard className="lg:h-full">
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