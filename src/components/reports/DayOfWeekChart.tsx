import { formatCurrency } from '../../utils/inventory';
import type { DayOfWeekStats } from '../../utils/calendarAnalytics';

interface DayOfWeekChartProps {
  data: DayOfWeekStats[];
}

export const DayOfWeekChart = ({ data }: DayOfWeekChartProps) => {
  const maxAvg = Math.max(...data.map(d => d.averageSales), 1);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-semibold text-muted/80">Day of Week</h4>
        <span className="text-[10px] text-muted/50">{data.reduce((sum, d) => sum + d.orderCount, 0)} total orders</span>
      </div>
      {data.map((day) => {
        const percentage = maxAvg > 0 ? (day.averageSales / maxAvg) * 100 : 0;
        return (
          <div key={day.dayIndex} className="flex items-center gap-2">
            <span className={`text-[11px] font-medium w-7 ${day.isBest ? 'text-green-400' : 'text-muted'}`}>
              {day.shortName}
            </span>
            <div className="flex-1 h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  day.isBest ? 'bg-green-400' : 'bg-blue-500/70'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className={`text-[10px] font-medium w-16 text-right ${day.isBest ? 'text-green-400' : ''}`}>
              {formatCurrency(day.averageSales)}
            </span>
          </div>
        );
      })}
    </div>
  );
};
