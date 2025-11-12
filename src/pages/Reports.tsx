import { useState, useMemo } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import {
  Calendar,
  TrendingUp,
  BarChart3,
  PieChart,
  FileText,
  Package,
  Users,
  Truck,
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useInventoryDirect } from '../hooks/useInventoryDirect';
import { useSalesDirect } from '../hooks/useSalesDirect';
import { usePaddyTrucks } from '../hooks/usePaddyTrucks';
import { formatCurrency } from '../utils/inventory';

export const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierDateFrom, setSupplierDateFrom] = useState('');
  const [supplierDateTo, setSupplierDateTo] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const { products, movements, loading: invLoading } = useInventoryDirect();
  const { sales, bookedStock, loading: salesLoading } = useSalesDirect();
  const { paddyTrucks, loading: trucksLoading } = usePaddyTrucks();

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

      // For sales movements, calculate actual quantity from associated sale
      if (m.movementType === 'sales' && m.referenceId) {
        const sale = sales.find(s => s.id === m.referenceId);
        if (sale) {
          const totalQuantity = sale.items.reduce((sum, item) => sum + item.quantity, 0);
          typeMap.set(m.movementType, current + totalQuantity);
        } else {
          // Fallback to movement quantity if sale not found
          typeMap.set(m.movementType, current + Math.abs(m.quantity));
        }
      } else {
        // For other movement types, use the movement quantity directly
        typeMap.set(m.movementType, current + Math.abs(m.quantity));
      }
    });
    return Array.from(typeMap.entries()).map(([type, qty]) => ({ type, quantity: qty }));
  }, [filteredMovements, sales]);

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
      // Only include non-sales movements (sales are added separately from filteredSales to avoid duplicates)
      ...filteredMovements
        .filter(m => m.movementType !== 'sales') // Skip sales movements to prevent duplicates
        .map(m => ({
          time: new Date(m.createdAt), // Use createdAt for accurate timestamp
          action: `${m.movementType}: ${m.productName} (${Math.abs(m.quantity)} units)`,
          type: m.movementType
        })),
      // Add sales from the sales array (this avoids duplicates since each sale appears once)
      ...filteredSales.map(s => {
        const totalItems = s.items.reduce((sum, item) => sum + item.quantity, 0);
        const itemCount = s.items.length;
        return {
          time: new Date(s.createdAt), // Use createdAt for accurate timestamp
          action: `Sale: ${s.orderId} - ${s.customerName} (${totalItems} ${s.items[0]?.unit || 'units'}, ${itemCount} ${itemCount === 1 ? 'item' : 'items'})`,
          type: 'sale'
        };
      })
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

  // Supplier Insights
  const setSupplierQuickDate = (period: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
      case 'today':
        setSupplierDateFrom(today.toISOString().split('T')[0]);
        setSupplierDateTo(today.toISOString().split('T')[0]);
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        setSupplierDateFrom(weekStart.toISOString().split('T')[0]);
        setSupplierDateTo(now.toISOString().split('T')[0]);
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        setSupplierDateFrom(monthStart.toISOString().split('T')[0]);
        setSupplierDateTo(now.toISOString().split('T')[0]);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
        setSupplierDateFrom(quarterStart.toISOString().split('T')[0]);
        setSupplierDateTo(now.toISOString().split('T')[0]);
        break;
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        setSupplierDateFrom(yearStart.toISOString().split('T')[0]);
        setSupplierDateTo(now.toISOString().split('T')[0]);
        break;
      case 'all':
        setSupplierDateFrom('');
        setSupplierDateTo('');
        break;
    }
  };

  const filteredPaddyTrucks = useMemo(() => {
    let filtered = [...paddyTrucks];

    if (supplierDateFrom) {
      const fromDate = new Date(supplierDateFrom);
      filtered = filtered.filter(truck => new Date(truck.date) >= fromDate);
    }
    if (supplierDateTo) {
      const toDate = new Date(supplierDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(truck => new Date(truck.date) <= toDate);
    }

    return filtered;
  }, [paddyTrucks, supplierDateFrom, supplierDateTo]);

  const supplierStats = useMemo(() => {
    const supplierMap = new Map<string, {
      name: string;
      totalWeight: number;
      totalAmount: number;
      truckCount: number;
    }>();

    filteredPaddyTrucks.forEach(truck => {
      const current = supplierMap.get(truck.supplierId) || {
        name: truck.supplierName,
        totalWeight: 0,
        totalAmount: 0,
        truckCount: 0
      };

      supplierMap.set(truck.supplierId, {
        name: truck.supplierName,
        totalWeight: current.totalWeight + truck.weightAfterDeduction,
        totalAmount: current.totalAmount + truck.totalAmount,
        truckCount: current.truckCount + 1
      });
    });

    return Array.from(supplierMap.values())
      .sort((a, b) => b.totalWeight - a.totalWeight);
  }, [filteredPaddyTrucks]);

  const topSupplier = supplierStats.length > 0 ? supplierStats[0] : null;
  const totalSuppliedWeight = supplierStats.reduce((sum, s) => sum + s.totalWeight, 0);
  const totalSuppliedValue = supplierStats.reduce((sum, s) => sum + s.totalAmount, 0);

  const filteredSupplierStats = useMemo(() => {
    if (!supplierSearch.trim()) return supplierStats;
    const searchLower = supplierSearch.toLowerCase();
    return supplierStats.filter(s => s.name.toLowerCase().includes(searchLower));
  }, [supplierStats, supplierSearch]);

  // Daily product sales breakdown
  const dailyProductSales = useMemo(() => {
    const selectedDateObj = new Date(selectedDate);
    selectedDateObj.setHours(0, 0, 0, 0);
    const nextDay = new Date(selectedDateObj);
    nextDay.setDate(selectedDateObj.getDate() + 1);

    // Filter sales for the selected date
    const daySales = sales.filter(s => {
      const saleDate = new Date(s.date);
      saleDate.setHours(0, 0, 0, 0);
      return saleDate.getTime() === selectedDateObj.getTime();
    });

    // Group by product
    const productMap = new Map<string, { name: string; quantity: number; unit: string; salesCount: number; totalRevenue: number }>();

    daySales.forEach(sale => {
      sale.items.forEach(item => {
        const current = productMap.get(item.productId) || {
          name: item.productName,
          quantity: 0,
          unit: item.unit,
          salesCount: 0,
          totalRevenue: 0
        };

        productMap.set(item.productId, {
          ...current,
          quantity: current.quantity + item.quantity,
          salesCount: current.salesCount + 1,
          totalRevenue: current.totalRevenue + (item.quantity * item.price) // Track total revenue for weighted average
        });
      });
    });

    // Calculate average price for each product (weighted average)
    return Array.from(productMap.values()).map(product => ({
      ...product,
      avgPrice: product.quantity > 0 ? product.totalRevenue / product.quantity : 0
    })).sort((a, b) => b.quantity - a.quantity);
  }, [sales, selectedDate]);

  const totalDailySales = dailyProductSales.reduce((sum, p) => sum + p.quantity, 0);

  // Date navigation helpers
  const navigateDate = (days: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

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
  
  if (invLoading || salesLoading || trucksLoading) {
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

      {/* Daily Product Sales */}
      <GlassCard>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package size={20} />
            Daily Product Sales
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDate(-1)}
              className="p-2 glass rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Previous day"
            >
              <ChevronLeft size={18} />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
            />
            <button
              onClick={() => navigateDate(1)}
              className="p-2 glass rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Next day"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {dailyProductSales.length > 0 ? (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-3 text-sm font-semibold">Product Name</th>
                    <th className="text-center py-2 px-3 text-sm font-semibold">Quantity</th>
                    <th className="text-center py-2 px-3 text-sm font-semibold">Unit</th>
                    <th className="text-center py-2 px-3 text-sm font-semibold">Avg Price</th>
                    <th className="text-center py-2 px-3 text-sm font-semibold">Total Revenue</th>
                    <th className="text-center py-2 px-3 text-sm font-semibold">Sales Count</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyProductSales.map((product, index) => (
                    <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 text-sm">{product.name}</td>
                      <td className="py-3 px-3 text-sm text-center font-semibold text-green-400">
                        {product.quantity.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-sm text-center text-muted">{product.unit}</td>
                      <td className="py-3 px-3 text-sm text-center text-blue-400">
                        {formatCurrency(product.avgPrice)}
                      </td>
                      <td className="py-3 px-3 text-sm text-center font-semibold text-yellow-400">
                        {formatCurrency(product.totalRevenue)}
                      </td>
                      <td className="py-3 px-3 text-sm text-center text-muted">
                        {product.salesCount} {product.salesCount === 1 ? 'sale' : 'sales'}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-white/20 font-bold">
                    <td className="py-3 px-3 text-sm">Total</td>
                    <td className="py-3 px-3 text-sm text-center text-green-400">
                      {totalDailySales.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-sm text-center"></td>
                    <td className="py-3 px-3 text-sm text-center"></td>
                    <td className="py-3 px-3 text-sm text-center text-yellow-400">
                      {formatCurrency(dailyProductSales.reduce((sum, p) => sum + p.totalRevenue, 0))}
                    </td>
                    <td className="py-3 px-3 text-sm text-center"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Package size={48} className="mx-auto mb-3 text-muted/50" />
            <p className="text-muted">No sales recorded for {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        )}
      </GlassCard>

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

      {/* Supplier Insights */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Truck size={20} />
          Supplier Insights
        </h2>
        
        {/* Date Range Filters */}
        <GlassCard className="mb-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="flex flex-wrap gap-2 flex-1">
              <button
                onClick={() => setSupplierQuickDate('today')}
                className="px-3 py-1.5 text-sm glass rounded-lg hover:bg-white/10 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setSupplierQuickDate('week')}
                className="px-3 py-1.5 text-sm glass rounded-lg hover:bg-white/10 transition-colors"
              >
                This Week
              </button>
              <button
                onClick={() => setSupplierQuickDate('month')}
                className="px-3 py-1.5 text-sm glass rounded-lg hover:bg-white/10 transition-colors"
              >
                This Month
              </button>
              <button
                onClick={() => setSupplierQuickDate('quarter')}
                className="px-3 py-1.5 text-sm glass rounded-lg hover:bg-white/10 transition-colors"
              >
                This Quarter
              </button>
              <button
                onClick={() => setSupplierQuickDate('year')}
                className="px-3 py-1.5 text-sm glass rounded-lg hover:bg-white/10 transition-colors"
              >
                This Year
              </button>
              <button
                onClick={() => setSupplierQuickDate('all')}
                className="px-3 py-1.5 text-sm glass rounded-lg hover:bg-white/10 transition-colors"
              >
                All Time
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <input
                type="date"
                value={supplierDateFrom}
                onChange={(e) => setSupplierDateFrom(e.target.value)}
                className="px-3 py-1.5 text-sm glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="From"
              />
              <span className="text-muted text-center sm:text-left">to</span>
              <input
                type="date"
                value={supplierDateTo}
                onChange={(e) => setSupplierDateTo(e.target.value)}
                className="px-3 py-1.5 text-sm glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="To"
              />
            </div>
          </div>
        </GlassCard>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <GlassCard>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted mb-1">Total Suppliers</p>
                <p className="text-2xl font-bold">{supplierStats.length}</p>
              </div>
              <Users size={20} className="text-blue-400" />
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted mb-1">Total Weight</p>
                <p className="text-2xl font-bold">{totalSuppliedWeight.toLocaleString()} kg</p>
              </div>
              <Package size={20} className="text-green-400" />
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted mb-1">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSuppliedValue)}</p>
              </div>
              <TrendingUp size={20} className="text-purple-400" />
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted mb-1">Total Trucks</p>
                <p className="text-2xl font-bold">{filteredPaddyTrucks.length}</p>
              </div>
              <Truck size={20} className="text-yellow-400" />
            </div>
          </GlassCard>
        </div>

        {/* Top Supplier & Detailed Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performing Supplier */}
          <GlassCard>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle size={18} className="text-green-400" />
              Top Performing Supplier
            </h3>
            {topSupplier ? (
              <div className="space-y-4">
                <div className="p-4 glass rounded-lg border-l-4 border-green-400">
                  <p className="text-xl font-bold mb-2">{topSupplier.name}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted">Total Weight:</span>
                      <span className="text-sm font-semibold text-green-400">
                        {topSupplier.totalWeight.toLocaleString()} kg
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted">Total Value:</span>
                      <span className="text-sm font-semibold text-yellow-400">
                        {formatCurrency(topSupplier.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted">Number of Trucks:</span>
                      <span className="text-sm font-semibold text-blue-400">
                        {topSupplier.truckCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted">Avg per Truck:</span>
                      <span className="text-sm font-semibold">
                        {(topSupplier.totalWeight / topSupplier.truckCount).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg
                      </span>
                    </div>
                  </div>
                </div>
                {totalSuppliedWeight > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted">Market Share</span>
                      <span className="font-semibold">
                        {((topSupplier.totalWeight / totalSuppliedWeight) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-dark-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                        style={{ width: `${(topSupplier.totalWeight / totalSuppliedWeight) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted text-center py-8">No supplier data for selected period</p>
            )}
          </GlassCard>

          {/* All Suppliers Breakdown */}
          <GlassCard>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BarChart3 size={18} />
              Supplier Performance
            </h3>
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search suppliers..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="w-full px-3 py-2 pr-8 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm placeholder-muted-text"
              />
              {supplierSearch && (
                <button
                  onClick={() => setSupplierSearch('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
                  aria-label="Clear search"
                >
                  <X size={16} className="text-muted" />
                </button>
              )}
            </div>
            {filteredSupplierStats.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {filteredSupplierStats.map((supplier, index) => (
                  <div key={index} className="p-3 glass rounded-lg hover:bg-white/5 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium">{supplier.name}</span>
                      </div>
                      <span className="text-xs text-muted">{supplier.truckCount} trucks</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted">Weight:</span>
                        <span className="font-semibold text-green-400">
                          {supplier.totalWeight.toLocaleString()} kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Value:</span>
                        <span className="font-semibold text-yellow-400">
                          {formatCurrency(supplier.totalAmount)}
                        </span>
                      </div>
                    </div>
                    {totalSuppliedWeight > 0 && (
                      <div className="mt-2">
                        <div className="w-full h-1 bg-dark-surface rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${(supplier.totalWeight / totalSuppliedWeight) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center py-8">
                {supplierSearch ? 'No suppliers match your search' : 'No supplier data for selected period'}
              </p>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};