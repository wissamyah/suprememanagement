import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { formatCurrency } from '../../utils/inventory';
import type { CalendarDayData } from '../../utils/calendarAnalytics';

interface CalendarHeatmapProps {
  data: CalendarDayData[];
  month: number;
  year: number;
  onNavigate: (direction: 'prev' | 'next') => void;
  onDayClick: (date: Date) => void;
  selectedDay: Date | null;
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const getIntensityColor = (intensity: 0 | 1 | 2 | 3 | 4, isCurrentMonth: boolean): string => {
  if (!isCurrentMonth) return 'bg-transparent';

  switch (intensity) {
    case 0: return 'bg-gray-800/50';
    case 1: return 'bg-green-900/70';
    case 2: return 'bg-green-700/80';
    case 3: return 'bg-green-500/90';
    case 4: return 'bg-green-400';
    default: return 'bg-gray-800/50';
  }
};

const DayTooltipContent = ({ day }: { day: CalendarDayData }) => (
  <div className="text-xs">
    <div className="font-semibold">
      {day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
    </div>
    {day.isCurrentMonth && day.totalSales > 0 && (
      <div className="text-green-400 mt-0.5">{formatCurrency(day.totalSales)} · {day.orderCount} order{day.orderCount !== 1 ? 's' : ''}</div>
    )}
  </div>
);

export const CalendarHeatmap = ({
  data,
  month,
  year,
  onNavigate,
  onDayClick,
  selectedDay
}: CalendarHeatmapProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  };

  const isSelected = (date: Date) => {
    if (!selectedDay) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const s = new Date(selectedDay);
    s.setHours(0, 0, 0, 0);
    return d.getTime() === s.getTime();
  };

  return (
    <div className="space-y-2">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('prev')}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium">
          {monthNames[month]} {year}
        </span>
        <button
          onClick={() => onNavigate('next')}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Calendar grid */}
      <div>
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-0.5">
          {weekDays.map((day, i) => (
            <div key={i} className="text-[10px] text-muted/60 text-center py-0.5 font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-0.5">
          {data.map((day, index) => (
            <Tooltip key={index} content={<DayTooltipContent day={day} />} placement="top" delay={100}>
              <button
                onClick={() => day.isCurrentMonth && onDayClick(day.date)}
                disabled={!day.isCurrentMonth}
                className={`
                  w-full h-7 rounded text-xs flex items-center justify-center
                  transition-all duration-150
                  ${day.isCurrentMonth ? 'cursor-pointer hover:ring-1 hover:ring-white/40' : 'cursor-default'}
                  ${getIntensityColor(day.intensity, day.isCurrentMonth)}
                  ${!day.isCurrentMonth ? 'text-muted/20' : ''}
                  ${isToday(day.date) && day.isCurrentMonth ? 'ring-1 ring-blue-400' : ''}
                  ${isSelected(day.date) && day.isCurrentMonth ? 'ring-1 ring-yellow-400' : ''}
                `}
              >
                {day.dayOfMonth}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Compact Legend */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted/60">
        <span>Low</span>
        <div className="flex gap-0.5">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className={`w-3 h-3 rounded-sm ${getIntensityColor(i as 0|1|2|3|4, true)}`} />
          ))}
        </div>
        <span>High</span>
      </div>
    </div>
  );
};
