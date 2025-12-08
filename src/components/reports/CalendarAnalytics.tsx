import { useState, useMemo } from 'react';
import { Calendar, TrendingUp, TrendingDown, X } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { CalendarHeatmap } from './CalendarHeatmap';
import { DayOfWeekChart } from './DayOfWeekChart';
import { DayOfMonthChart } from './DayOfMonthChart';
import { formatCurrency } from '../../utils/inventory';
import {
  generateCalendarData,
  calculateDayOfWeekStats,
  calculateDayOfMonthStats,
  getComparisonData,
  getSalesSummaryForDay,
  calculateSummaryStats,
  getOrdinalSuffix
} from '../../utils/calendarAnalytics';
import type { Sale } from '../../types';

interface CalendarAnalyticsProps {
  sales: Sale[];
}

export const CalendarAnalytics = ({ sales }: CalendarAnalyticsProps) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showComparison, setShowComparison] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Memoized calculations
  const calendarData = useMemo(
    () => generateCalendarData(sales, selectedMonth, selectedYear),
    [sales, selectedMonth, selectedYear]
  );

  const dayOfWeekStats = useMemo(
    () => calculateDayOfWeekStats(sales),
    [sales]
  );

  const dayOfMonthStats = useMemo(
    () => calculateDayOfMonthStats(sales),
    [sales]
  );

  const summaryStats = useMemo(
    () => calculateSummaryStats(dayOfWeekStats, dayOfMonthStats, sales),
    [dayOfWeekStats, dayOfMonthStats, sales]
  );

  const comparisonData = useMemo(
    () => getComparisonData(sales, selectedMonth, selectedYear),
    [sales, selectedMonth, selectedYear]
  );

  const selectedDaySummary = useMemo(
    () => selectedDay ? getSalesSummaryForDay(sales, selectedDay) : null,
    [sales, selectedDay]
  );

  // Handlers
  const handleNavigate = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(y => y - 1);
      } else {
        setSelectedMonth(m => m - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(y => y + 1);
      } else {
        setSelectedMonth(m => m + 1);
      }
    }
    setSelectedDay(null);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDay(date);
  };

  const closeDaySummary = () => {
    setSelectedDay(null);
  };

  return (
    <GlassCard>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar size={18} />
          Calendar Analytics
        </h2>
        <button
          onClick={() => setShowComparison(!showComparison)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            showComparison
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-muted hover:bg-white/10'
          }`}
        >
          {showComparison ? 'Hide' : 'Compare'}
        </button>
      </div>

      {/* Compact Summary Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center">
          <p className="text-[10px] text-muted/70 uppercase tracking-wide">Best Day</p>
          <p className="text-sm font-bold text-green-400">
            {summaryStats.bestDayOfWeek?.name?.slice(0, 3) || 'N/A'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted/70 uppercase tracking-wide">Best Date</p>
          <p className="text-sm font-bold text-purple-400">
            {summaryStats.bestDayOfMonth ? getOrdinalSuffix(summaryStats.bestDayOfMonth.day) : 'N/A'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted/70 uppercase tracking-wide">Daily Avg</p>
          <p className="text-sm font-bold text-blue-400">
            {formatCurrency(summaryStats.avgDailySales)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted/70 uppercase tracking-wide">vs Last Mo</p>
          <p className={`text-sm font-bold flex items-center justify-center gap-0.5 ${
            comparisonData.percentChange.sales >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {comparisonData.percentChange.sales >= 0 ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            {Math.abs(comparisonData.percentChange.sales).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Comparison Panel */}
      {showComparison && (
        <div className="glass rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-[10px] text-muted/70">{comparisonData.currentMonth.label}</p>
              <p className="text-base font-bold text-green-400">
                {formatCurrency(comparisonData.currentMonth.total)}
              </p>
              <p className="text-[10px] text-muted">{comparisonData.currentMonth.orders} orders</p>
            </div>
            <div>
              <p className="text-[10px] text-muted/70">{comparisonData.previousMonth.label}</p>
              <p className="text-base font-bold">
                {formatCurrency(comparisonData.previousMonth.total)}
              </p>
              <p className="text-[10px] text-muted">{comparisonData.previousMonth.orders} orders</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content: Calendar + Charts side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Heatmap */}
        <div className="lg:col-span-1">
          <CalendarHeatmap
            data={calendarData}
            month={selectedMonth}
            year={selectedYear}
            onNavigate={handleNavigate}
            onDayClick={handleDayClick}
            selectedDay={selectedDay}
          />
        </div>

        {/* Charts */}
        <div className="lg:col-span-2 space-y-3">
          <div className="glass rounded-lg p-3">
            <DayOfWeekChart data={dayOfWeekStats} />
          </div>
          <div className="glass rounded-lg p-3">
            <DayOfMonthChart data={dayOfMonthStats} />
          </div>
        </div>
      </div>

      {/* Day Summary Panel */}
      {selectedDaySummary && (
        <div className="glass rounded-lg p-3 mt-4 border-l-2 border-yellow-400">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold">
              {selectedDaySummary.date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </h3>
            <button
              onClick={closeDaySummary}
              className="p-0.5 hover:bg-white/10 rounded transition-colors"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-muted">Sales: </span>
              <span className="font-bold text-green-400">{formatCurrency(selectedDaySummary.totalSales)}</span>
            </div>
            <div>
              <span className="text-muted">Orders: </span>
              <span className="font-bold text-blue-400">{selectedDaySummary.orderCount}</span>
            </div>
            {selectedDaySummary.topProducts.length > 0 && (
              <div className="flex-1 truncate">
                <span className="text-muted">Top: </span>
                <span className="font-medium">{selectedDaySummary.topProducts[0].name}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
};
