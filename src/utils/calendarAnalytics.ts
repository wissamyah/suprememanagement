import type { Sale } from '../types';

// Types for calendar analytics
export interface CalendarDayData {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  totalSales: number;
  orderCount: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export interface DayOfWeekStats {
  dayIndex: number;
  dayName: string;
  shortName: string;
  totalSales: number;
  averageSales: number;
  orderCount: number;
  occurrences: number;
  isBest: boolean;
}

export interface DayOfMonthStats {
  day: number;
  totalSales: number;
  averageSales: number;
  orderCount: number;
  occurrences: number;
  isBest: boolean;
}

export interface DaySummary {
  date: Date;
  totalSales: number;
  orderCount: number;
  avgOrderValue: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
}

export interface ComparisonData {
  currentMonth: { label: string; total: number; orders: number; avgOrder: number };
  previousMonth: { label: string; total: number; orders: number; avgOrder: number };
  percentChange: { sales: number; orders: number };
}

export interface SummaryStats {
  bestDayOfWeek: { name: string; avgSales: number } | null;
  bestDayOfMonth: { day: number; avgSales: number } | null;
  avgDailySales: number;
  totalDaysWithSales: number;
}

/**
 * Generate calendar grid data for a specific month
 */
export const generateCalendarData = (
  sales: Sale[],
  month: number,
  year: number
): CalendarDayData[] => {
  // Get first day of month and calculate padding
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // Start from Monday (1) - adjust for weeks starting Monday
  let startPadding = firstDayOfMonth.getDay() - 1;
  if (startPadding < 0) startPadding = 6; // Sunday becomes 6

  // Calculate end padding to complete the grid (always show 6 weeks = 42 cells)
  const totalCells = 42;
  const endPadding = totalCells - daysInMonth - startPadding;

  // Group sales by date for the selected month
  const salesByDate = new Map<string, { total: number; count: number }>();

  sales.forEach(sale => {
    const saleDate = new Date(sale.date);
    if (saleDate.getMonth() === month && saleDate.getFullYear() === year) {
      const key = saleDate.toISOString().split('T')[0];
      const existing = salesByDate.get(key) || { total: 0, count: 0 };
      salesByDate.set(key, {
        total: existing.total + sale.totalAmount,
        count: existing.count + 1
      });
    }
  });

  // Calculate intensity thresholds (quartiles)
  const values = Array.from(salesByDate.values()).map(v => v.total).filter(v => v > 0);
  const sortedValues = [...values].sort((a, b) => a - b);

  const getQuartile = (arr: number[], q: number) => {
    if (arr.length === 0) return 0;
    const pos = (arr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (arr[base + 1] !== undefined) {
      return arr[base] + rest * (arr[base + 1] - arr[base]);
    }
    return arr[base];
  };

  const q1 = getQuartile(sortedValues, 0.25);
  const q2 = getQuartile(sortedValues, 0.5);
  const q3 = getQuartile(sortedValues, 0.75);

  const getIntensity = (value: number): 0 | 1 | 2 | 3 | 4 => {
    if (value <= 0) return 0;
    if (value <= q1) return 1;
    if (value <= q2) return 2;
    if (value <= q3) return 3;
    return 4;
  };

  const calendarDays: CalendarDayData[] = [];

  // Add padding days from previous month
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

  for (let i = startPadding - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    calendarDays.push({
      date: new Date(prevYear, prevMonth, dayNum),
      dayOfMonth: dayNum,
      isCurrentMonth: false,
      totalSales: 0,
      orderCount: 0,
      intensity: 0
    });
  }

  // Add current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = date.toISOString().split('T')[0];
    const dayData = salesByDate.get(key) || { total: 0, count: 0 };

    calendarDays.push({
      date,
      dayOfMonth: day,
      isCurrentMonth: true,
      totalSales: dayData.total,
      orderCount: dayData.count,
      intensity: getIntensity(dayData.total)
    });
  }

  // Add padding days from next month
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  for (let day = 1; day <= endPadding; day++) {
    calendarDays.push({
      date: new Date(nextYear, nextMonth, day),
      dayOfMonth: day,
      isCurrentMonth: false,
      totalSales: 0,
      orderCount: 0,
      intensity: 0
    });
  }

  return calendarDays;
};

/**
 * Calculate day-of-week statistics across all sales
 */
export const calculateDayOfWeekStats = (sales: Sale[]): DayOfWeekStats[] => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Initialize stats for each day
  const stats: DayOfWeekStats[] = dayNames.map((name, i) => ({
    dayIndex: i,
    dayName: name,
    shortName: shortNames[i],
    totalSales: 0,
    averageSales: 0,
    orderCount: 0,
    occurrences: 0,
    isBest: false
  }));

  // Track which dates we've counted
  const countedDates = new Set<string>();

  sales.forEach(sale => {
    const saleDate = new Date(sale.date);
    const dayIndex = saleDate.getDay();
    const dateKey = saleDate.toISOString().split('T')[0];

    stats[dayIndex].totalSales += sale.totalAmount;
    stats[dayIndex].orderCount += 1;

    // Count unique days for averaging
    if (!countedDates.has(dateKey)) {
      countedDates.add(dateKey);
      stats[dayIndex].occurrences += 1;
    }
  });

  // Calculate averages and find best
  let bestAvg = 0;
  let bestIndex = -1;

  stats.forEach((stat, i) => {
    stat.averageSales = stat.occurrences > 0 ? stat.totalSales / stat.occurrences : 0;
    if (stat.averageSales > bestAvg) {
      bestAvg = stat.averageSales;
      bestIndex = i;
    }
  });

  if (bestIndex >= 0) {
    stats[bestIndex].isBest = true;
  }

  // Reorder to start from Monday (index 1) and end with Sunday (index 0)
  return [...stats.slice(1), stats[0]];
};

/**
 * Calculate day-of-month statistics across all sales
 */
export const calculateDayOfMonthStats = (sales: Sale[]): DayOfMonthStats[] => {
  // Initialize stats for days 1-31
  const stats: DayOfMonthStats[] = Array.from({ length: 31 }, (_, i) => ({
    day: i + 1,
    totalSales: 0,
    averageSales: 0,
    orderCount: 0,
    occurrences: 0,
    isBest: false
  }));

  // Track months we've seen for each day
  const monthsPerDay: Set<string>[] = Array.from({ length: 31 }, () => new Set());

  sales.forEach(sale => {
    const saleDate = new Date(sale.date);
    const dayOfMonth = saleDate.getDate();
    const monthKey = `${saleDate.getFullYear()}-${saleDate.getMonth()}`;

    const index = dayOfMonth - 1;
    stats[index].totalSales += sale.totalAmount;
    stats[index].orderCount += 1;
    monthsPerDay[index].add(monthKey);
  });

  // Calculate averages and find best
  let bestAvg = 0;
  let bestIndex = -1;

  stats.forEach((stat, i) => {
    stat.occurrences = monthsPerDay[i].size;
    stat.averageSales = stat.occurrences > 0 ? stat.totalSales / stat.occurrences : 0;
    if (stat.averageSales > bestAvg) {
      bestAvg = stat.averageSales;
      bestIndex = i;
    }
  });

  if (bestIndex >= 0) {
    stats[bestIndex].isBest = true;
  }

  return stats;
};

/**
 * Get comparison data between current month and previous month
 */
export const getComparisonData = (
  sales: Sale[],
  month: number,
  year: number
): ComparisonData => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Previous month
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;

  // Filter sales for current and previous month
  const currentMonthSales = sales.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const prevMonthSales = sales.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });

  const currentTotal = currentMonthSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const prevTotal = prevMonthSales.reduce((sum, s) => sum + s.totalAmount, 0);

  const currentOrders = currentMonthSales.length;
  const prevOrders = prevMonthSales.length;

  // Calculate percentage changes
  const salesChange = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : (currentTotal > 0 ? 100 : 0);
  const ordersChange = prevOrders > 0 ? ((currentOrders - prevOrders) / prevOrders) * 100 : (currentOrders > 0 ? 100 : 0);

  return {
    currentMonth: {
      label: `${monthNames[month]} ${year}`,
      total: currentTotal,
      orders: currentOrders,
      avgOrder: currentOrders > 0 ? currentTotal / currentOrders : 0
    },
    previousMonth: {
      label: `${monthNames[prevMonth]} ${prevYear}`,
      total: prevTotal,
      orders: prevOrders,
      avgOrder: prevOrders > 0 ? prevTotal / prevOrders : 0
    },
    percentChange: {
      sales: salesChange,
      orders: ordersChange
    }
  };
};

/**
 * Get summary for a specific day
 */
export const getSalesSummaryForDay = (sales: Sale[], date: Date): DaySummary => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const daySales = sales.filter(s => {
    const saleDate = new Date(s.date);
    saleDate.setHours(0, 0, 0, 0);
    return saleDate.getTime() === targetDate.getTime();
  });

  const totalSales = daySales.reduce((sum, s) => sum + s.totalAmount, 0);
  const orderCount = daySales.length;

  // Aggregate products
  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

  daySales.forEach(sale => {
    sale.items.forEach(item => {
      const existing = productMap.get(item.productId) || { name: item.productName, quantity: 0, revenue: 0 };
      productMap.set(item.productId, {
        name: item.productName,
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + item.total
      });
    });
  });

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    date: targetDate,
    totalSales,
    orderCount,
    avgOrderValue: orderCount > 0 ? totalSales / orderCount : 0,
    topProducts
  };
};

/**
 * Calculate summary statistics
 */
export const calculateSummaryStats = (
  dayOfWeekStats: DayOfWeekStats[],
  dayOfMonthStats: DayOfMonthStats[],
  sales: Sale[]
): SummaryStats => {
  const bestWeekday = dayOfWeekStats.find(d => d.isBest);
  const bestDayOfMonth = dayOfMonthStats.find(d => d.isBest);

  // Calculate average daily sales
  const dateSet = new Set<string>();
  let totalSales = 0;

  sales.forEach(sale => {
    const dateKey = new Date(sale.date).toISOString().split('T')[0];
    dateSet.add(dateKey);
    totalSales += sale.totalAmount;
  });

  const totalDaysWithSales = dateSet.size;
  const avgDailySales = totalDaysWithSales > 0 ? totalSales / totalDaysWithSales : 0;

  return {
    bestDayOfWeek: bestWeekday ? { name: bestWeekday.dayName, avgSales: bestWeekday.averageSales } : null,
    bestDayOfMonth: bestDayOfMonth ? { day: bestDayOfMonth.day, avgSales: bestDayOfMonth.averageSales } : null,
    avgDailySales,
    totalDaysWithSales
  };
};

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
export const getOrdinalSuffix = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
