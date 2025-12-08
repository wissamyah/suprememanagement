import { formatCurrency } from '../../utils/inventory';
import { getOrdinalSuffix } from '../../utils/calendarAnalytics';
import type { DayOfMonthStats } from '../../utils/calendarAnalytics';

interface DayOfMonthChartProps {
  data: DayOfMonthStats[];
}

// Group days into periods
const dayGroups = [
  { label: '1-7', start: 1, end: 7 },
  { label: '8-14', start: 8, end: 14 },
  { label: '15-21', start: 15, end: 21 },
  { label: '22-28', start: 22, end: 28 },
  { label: '29-31', start: 29, end: 31 }
];

export const DayOfMonthChart = ({ data }: DayOfMonthChartProps) => {
  // Calculate group averages
  const groupStats = dayGroups.map(group => {
    const daysInGroup = data.slice(group.start - 1, group.end);
    const totalSales = daysInGroup.reduce((sum, d) => sum + d.totalSales, 0);
    const totalOccurrences = daysInGroup.reduce((sum, d) => sum + d.occurrences, 0);
    const avgSales = totalOccurrences > 0 ? totalSales / totalOccurrences : 0;

    return { ...group, avgSales };
  });

  const maxGroupAvg = Math.max(...groupStats.map(g => g.avgSales), 1);
  const bestDay = data.find(d => d.isBest);
  const bestGroupIndex = groupStats.reduce((best, curr, i) =>
    curr.avgSales > groupStats[best].avgSales ? i : best, 0);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-semibold text-muted/80">Day of Month</h4>
        {bestDay && bestDay.averageSales > 0 && (
          <span className="text-[10px] text-yellow-400">
            Best: {getOrdinalSuffix(bestDay.day)}
          </span>
        )}
      </div>
      {groupStats.map((group, index) => {
        const percentage = maxGroupAvg > 0 ? (group.avgSales / maxGroupAvg) * 100 : 0;
        const isBestGroup = index === bestGroupIndex && group.avgSales > 0;

        return (
          <div key={group.label} className="flex items-center gap-2">
            <span className={`text-[11px] font-medium w-10 ${isBestGroup ? 'text-purple-400' : 'text-muted'}`}>
              {group.label}
            </span>
            <div className="flex-1 h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isBestGroup ? 'bg-purple-400' : 'bg-indigo-500/70'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className={`text-[10px] font-medium w-16 text-right ${isBestGroup ? 'text-purple-400' : ''}`}>
              {formatCurrency(group.avgSales)}
            </span>
          </div>
        );
      })}
    </div>
  );
};
