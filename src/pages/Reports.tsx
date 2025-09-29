import { useState, useMemo } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import {
  Download,
  Calendar,
  TrendingUp,
  BarChart3,
  PieChart,
  FileText,
  Filter,
  Printer,
  Package,
  Users,
  Truck,
  Activity,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useInventoryDirect } from '../hooks/useInventoryDirect';
import { useSalesDirect } from '../hooks/useSalesDirect';
import { useDataContext } from '../contexts/DataContext';
import { formatCurrency } from '../utils/inventory';

export const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const { products, movements, categories, loading: invLoading } = useInventoryDirect();
  const { sales, customers, bookedStock, loading: salesLoading } = useSalesDirect();
  const { data } = useDataContext();

  // Date filtering based on selected period
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (selectedPeriod) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { start: weekStart, end: now };
      case 'month':
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        return { start: new Date(now.getFullYear(), quarter * 3, 1), end: now };
      case 'year':
        return { start: new Date(now.getFullYear(), 0, 1), end: now };
      default:
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    }
  };

  const { start: periodStart, end: periodEnd } = getDateRange();

  // Filter data by period
  const filteredSales = useMemo(() =>
    sales.filter(s => {
      const saleDate = new Date(s.date);
      return saleDate >= periodStart && saleDate <= periodEnd;
    }), [sales, periodStart, periodEnd]);

  const filteredMovements = useMemo(() =>
    movements.filter(m => {
      const movementDate = new Date(m.date);
      return movementDate >= periodStart && movementDate <= periodEnd;
    }), [movements, periodStart, periodEnd]);

  // Quick Stats
  const totalRevenue = useMemo(() =>
    filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0),
    [filteredSales]);

  const totalOrders = filteredSales.length;

  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const activeCustomers = useMemo(() =>
    new Set(filteredSales.map(s => s.customerId)).size,
    [filteredSales]);

  // Inventory Stats
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.status === 'low-stock').length;
  const outOfStockProducts = products.filter(p => p.status === 'out-of-stock').length;

  const totalStockValue = useMemo(() =>
    products.reduce((sum, p) => sum + p.quantityOnHand, 0),
    [products]);

  const totalBookedQty = useMemo(() =>
    bookedStock
      .filter(b => ['pending', 'confirmed', 'partial-loaded'].includes(b.status))
      .reduce((sum, b) => sum + (b.quantity - (b.quantityLoaded || 0)), 0),
    [bookedStock]);

  // Category breakdown
  const categoryDistribution = useMemo(() => {
    const catMap = new Map<string, number>();
    products.forEach(p => {
      const current = catMap.get(p.category) || 0;
      catMap.set(p.category, current + p.quantityOnHand);
    });

    const total = Array.from(catMap.values()).reduce((a, b) => a + b, 0);
    return Array.from(catMap.entries()).map(([name, qty]) => ({
      name,
      quantity: qty,
      percentage: total > 0 ? Math.round((qty / total) * 100) : 0
    })).sort((a, b) => b.quantity - a.quantity);
  }, [products]);

  // Movement type breakdown
  const movementsByType = useMemo(() => {
    const typeMap = new Map<string, number>();
    filteredMovements.forEach(m => {
      const current = typeMap.get(m.movementType) || 0;
      typeMap.set(m.movementType, current + Math.abs(m.quantity));
    });
    return Array.from(typeMap.entries()).map(([type, qty]) => ({ type, quantity: qty }));
  }, [filteredMovements]);

  // Top customers by sales value
  const topCustomers = useMemo(() => {
    const customerMap = new Map<string, { name: string; total: number; orders: number }>();
    filteredSales.forEach(s => {
      const current = customerMap.get(s.customerId) || { name: s.customerName, total: 0, orders: 0 };
      customerMap.set(s.customerId, {
        name: s.customerName,
        total: current.total + s.totalAmount,
        orders: current.orders + 1
      });
    });
    return Array.from(customerMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredSales]);

  // Recent activities
  const recentActivities = useMemo(() => {
    const activities = [
      ...filteredMovements.map(m => ({
        time: new Date(m.date),
        action: `${m.movementType}: ${m.productName} (${m.quantity} units)`,
        type: m.movementType
      })),
      ...filteredSales.map(s => ({
        time: new Date(s.date),
        action: `Sale: ${s.orderId} - ${s.customerName}`,
        type: 'sale'
      }))
    ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 10);

    return activities;
  }, [filteredMovements, filteredSales]);

  // Sales trend (last 7 days)
  const salesTrend = useMemo(() => {
    const days = 7;
    const trend = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const daySales = sales.filter(s => {
        const saleDate = new Date(s.date);
        return saleDate >= date && saleDate < nextDate;
      });

      const total = daySales.reduce((sum, s) => sum + s.totalAmount, 0);
      trend.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        total,
        orders: daySales.length
      });
    }

    return trend;
  }, [sales]);

  const maxSalesValue = Math.max(...salesTrend.map(d => d.total), 1);

  const quickStats = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: <TrendingUp size={20} />, color: 'text-green-400' },
    { label: 'Total Orders', value: totalOrders.toString(), icon: <FileText size={20} />, color: 'text-blue-400' },
    { label: 'Active Customers', value: activeCustomers.toString(), icon: <Users size={20} />, color: 'text-purple-400' },
    { label: 'Avg Order Value', value: formatCurrency(avgOrderValue), icon: <BarChart3 size={20} />, color: 'text-yellow-400' },
  ];

  const inventoryStats = [
    { label: 'Total Products', value: totalProducts.toString(), icon: <Package size={20} />, color: 'text-blue-400' },
    { label: 'Total Stock (units)', value: totalStockValue.toLocaleString(), icon: <Activity size={20} />, color: 'text-green-400' },
    { label: 'Booked Stock', value: totalBookedQty.toLocaleString(), icon: <Truck size={20} />, color: 'text-purple-400' },
    { label: 'Low/Out of Stock', value: `${lowStockProducts}/${outOfStockProducts}`, icon: <AlertTriangle size={20} />, color: 'text-red-400' },
  ];
  
  if (invLoading || salesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-muted">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
          <p className="text-muted">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <select
            className="px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Sales Overview */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={20} />
          Sales Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {quickStats.map((stat, index) => (
            <GlassCard key={index}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={stat.color}>{stat.icon}</div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Inventory Overview */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Package size={20} />
          Inventory Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {inventoryStats.map((stat, index) => (
            <GlassCard key={index}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={stat.color}>{stat.icon}</div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
      {/* Sales Trend */}
      <GlassCard>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BarChart3 size={20} />
          Sales Trend (Last 7 Days)
        </h2>

        <div className="h-64 flex items-end justify-between gap-2">
          {salesTrend.map((day, index) => {
            const height = maxSalesValue > 0 ? (day.total / maxSalesValue) * 100 : 0;
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="relative w-full">
                  <div
                    className="w-full bg-gradient-to-t from-blue-500/50 to-blue-400/50 rounded-t-lg transition-all duration-300 hover:from-blue-500/70 hover:to-blue-400/70"
                    style={{ height: `${Math.max(height, 5)}px`, minHeight: '20px' }}
                  />
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-dark-surface px-2 py-1 rounded text-xs whitespace-nowrap">
                    {formatCurrency(day.total)}
                  </div>
                </div>
                <span className="text-xs text-muted">{day.day}</span>
                <span className="text-xs text-muted/60">{day.orders} orders</span>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <PieChart size={20} />
            Stock by Category
          </h2>

          {categoryDistribution.length > 0 ? (
            <div className="space-y-3">
              {categoryDistribution.map((category, index) => {
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-pink-500'];
                return (
                  <div key={index}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">{category.name}</span>
                      <span className="text-sm font-semibold">{category.percentage}% ({category.quantity.toLocaleString()} units)</span>
                    </div>
                    <div className="w-full h-2 bg-dark-surface rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[index % colors.length]} transition-all duration-500`}
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted text-center py-8">No category data available</p>
          )}
        </GlassCard>

        {/* Top Customers */}
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users size={20} />
            Top Customers
          </h2>

          {topCustomers.length > 0 ? (
            <div className="space-y-3">
              {topCustomers.map((customer, index) => (
                <div key={index} className="flex items-center justify-between p-3 glass rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{customer.name}</p>
                      <p className="text-xs text-muted">{customer.orders} orders</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(customer.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-center py-8">No customer data available</p>
          )}
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movement Type Breakdown */}
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity size={20} />
            Inventory Movements
          </h2>

          {movementsByType.length > 0 ? (
            <div className="space-y-3">
              {movementsByType.map((movement, index) => {
                const icons = {
                  production: <CheckCircle size={16} className="text-green-400" />,
                  sales: <TrendingUp size={16} className="text-blue-400" />,
                  loading: <Truck size={16} className="text-purple-400" />,
                  adjustment: <Activity size={16} className="text-yellow-400" />,
                  return: <Package size={16} className="text-cyan-400" />,
                  damage: <AlertTriangle size={16} className="text-red-400" />
                };
                return (
                  <div key={index} className="flex items-center justify-between p-3 glass rounded-lg">
                    <div className="flex items-center gap-3">
                      {icons[movement.type as keyof typeof icons]}
                      <span className="text-sm capitalize">{movement.type}</span>
                    </div>
                    <span className="text-sm font-semibold">{movement.quantity.toLocaleString()} units</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted text-center py-8">No movement data for selected period</p>
          )}
        </GlassCard>

        {/* Recent Activities */}
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Recent Activities
          </h2>

          {recentActivities.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              {recentActivities.map((activity, index) => {
                const timeAgo = () => {
                  const diff = Date.now() - activity.time.getTime();
                  const minutes = Math.floor(diff / 60000);
                  const hours = Math.floor(diff / 3600000);
                  const days = Math.floor(diff / 86400000);

                  if (days > 0) return `${days}d ago`;
                  if (hours > 0) return `${hours}h ago`;
                  if (minutes > 0) return `${minutes}m ago`;
                  return 'Just now';
                };

                const getActivityIcon = () => {
                  switch (activity.type) {
                    case 'production':
                      return <CheckCircle size={16} className="text-green-400" />;
                    case 'sales':
                    case 'sale':
                      return <TrendingUp size={16} className="text-blue-400" />;
                    case 'loading':
                      return <Truck size={16} className="text-purple-400" />;
                    case 'adjustment':
                      return <Activity size={16} className="text-yellow-400" />;
                    case 'return':
                      return <Package size={16} className="text-cyan-400" />;
                    case 'damage':
                      return <AlertTriangle size={16} className="text-red-400" />;
                    default:
                      return <Activity size={16} className="text-gray-400" />;
                  }
                };

                const getActivityColor = () => {
                  switch (activity.type) {
                    case 'production':
                      return 'border-l-green-400';
                    case 'sales':
                    case 'sale':
                      return 'border-l-blue-400';
                    case 'loading':
                      return 'border-l-purple-400';
                    case 'adjustment':
                      return 'border-l-yellow-400';
                    case 'return':
                      return 'border-l-cyan-400';
                    case 'damage':
                      return 'border-l-red-400';
                    default:
                      return 'border-l-gray-400';
                  }
                };

                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 glass rounded-lg border-l-4 ${getActivityColor()} hover:bg-white/5 transition-colors`}
                  >
                    <div className="mt-0.5">
                      {getActivityIcon()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium break-words">{activity.action}</p>
                      <p className="text-xs text-muted mt-1">
                        {activity.time.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <span className="text-xs text-muted whitespace-nowrap">{timeAgo()}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted text-center py-8">No activities for selected period</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
};