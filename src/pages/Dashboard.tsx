import { useMemo } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  DollarSign, 
  ShoppingCart,
  Activity,
  Truck,
  AlertTriangle,
  TrendingUp as TrendingUpIcon,
  Clock,
  Package2
} from 'lucide-react';
import { useInventoryDirect } from '../hooks/useInventoryDirect';
import { useCustomersDirect } from '../hooks/useCustomersDirect';
import { useSalesDirect } from '../hooks/useSalesDirect';
import { useLoadingsDirect } from '../hooks/useLoadingsDirect';
import { usePaddyTrucksDirect } from '../hooks/usePaddyTrucksDirect';
import { useSuppliersDirect } from '../hooks/useSuppliersDirect';

export const Dashboard = () => {
  // Fetch real data from hooks
  const { products, loading: inventoryLoading } = useInventoryDirect();
  const { customers, loading: customersLoading } = useCustomersDirect();
  const { sales, bookedStock, loading: salesLoading } = useSalesDirect();
  const { loadings, loading: loadingsLoading } = useLoadingsDirect();
  const { paddyTrucks, loading: paddyTrucksLoading } = usePaddyTrucksDirect();
  const { suppliers, loading: suppliersLoading } = useSuppliersDirect();

  const isLoading = inventoryLoading || customersLoading || salesLoading || 
                   loadingsLoading || paddyTrucksLoading || suppliersLoading;

  // Calculate date ranges
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

  // Calculate total revenue
  const totalRevenue = useMemo(() => {
    return sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  }, [sales]);

  // Calculate revenue for this month
  const thisMonthRevenue = useMemo(() => {
    return sales
      .filter(sale => new Date(sale.date) >= startOfMonth)
      .reduce((sum, sale) => sum + sale.totalAmount, 0);
  }, [sales, startOfMonth]);

  // Calculate revenue for last month
  const lastMonthRevenue = useMemo(() => {
    return sales
      .filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startOfLastMonth && saleDate <= endOfLastMonth;
      })
      .reduce((sum, sale) => sum + sale.totalAmount, 0);
  }, [sales, startOfLastMonth, endOfLastMonth]);

  // Calculate revenue percentage change
  const revenuePercentageChange = useMemo(() => {
    if (lastMonthRevenue === 0) return thisMonthRevenue > 0 ? 100 : 0;
    return ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
  }, [thisMonthRevenue, lastMonthRevenue]);

  // Calculate customer statistics
  const totalCustomers = customers.length;
  const newCustomersThisMonth = useMemo(() => {
    return customers.filter(customer => 
      new Date(customer.createdAt) >= startOfMonth
    ).length;
  }, [customers, startOfMonth]);

  // Calculate inventory statistics
  const totalInventoryItems = products.length;
  const lowStockItems = useMemo(() => {
    return products.filter(product => 
      product.status === 'low-stock' || product.status === 'out-of-stock'
    ).length;
  }, [products]);


  // Calculate active orders
  const activeOrders = useMemo(() => {
    const pendingSales = sales.filter(sale => sale.paymentStatus === 'pending').length;
    const pendingBookings = bookedStock.filter(booking => 
      booking.status === 'pending' || booking.status === 'confirmed'
    ).length;
    return pendingSales + pendingBookings;
  }, [sales, bookedStock]);

  // Calculate order percentage change (compared to last week)
  const lastWeekOrders = useMemo(() => {
    const lastWeekStart = new Date(startOfWeek);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(startOfWeek);
    
    return sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate >= lastWeekStart && saleDate < lastWeekEnd;
    }).length;
  }, [sales, startOfWeek]);

  const thisWeekOrders = useMemo(() => {
    return sales.filter(sale => new Date(sale.date) >= startOfWeek).length;
  }, [sales, startOfWeek]);

  const ordersPercentageChange = useMemo(() => {
    if (lastWeekOrders === 0) return thisWeekOrders > 0 ? 100 : 0;
    return ((thisWeekOrders - lastWeekOrders) / lastWeekOrders) * 100;
  }, [thisWeekOrders, lastWeekOrders]);

  // Generate recent activities
  const recentActivities = useMemo(() => {
    const activities: Array<{
      id: string;
      type: 'sale' | 'loading' | 'supplier' | 'inventory' | 'payment';
      description: string;
      time: Date;
    }> = [];

    // Add recent sales
    sales.slice(-5).forEach(sale => {
      activities.push({
        id: sale.id,
        type: 'sale',
        description: `New sale to ${sale.customerName} - ₦${sale.totalAmount.toLocaleString()}`,
        time: new Date(sale.createdAt)
      });
    });

    // Add recent loadings
    loadings.slice(-5).forEach(loading => {
      activities.push({
        id: loading.id,
        type: 'loading',
        description: `Loading completed for ${loading.customerName} - Order ${loading.loadingId}`,
        time: new Date(loading.createdAt)
      });
    });

    // Add recent paddy trucks
    paddyTrucks.slice(-3).forEach(truck => {
      activities.push({
        id: truck.id,
        type: 'supplier',
        description: `Paddy truck received from ${truck.supplierName} - ${truck.weightAfterDeduction}kg`,
        time: new Date(truck.createdAt)
      });
    });

    // Add low stock alerts
    products.filter(p => p.status === 'low-stock').slice(0, 3).forEach(product => {
      activities.push({
        id: product.id,
        type: 'inventory',
        description: `Low stock alert: ${product.name} (${product.quantityOnHand} ${product.unit} remaining)`,
        time: new Date(product.updatedAt)
      });
    });

    // Sort by time and get the most recent
    return activities
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 10)
      .map(activity => ({
        ...activity,
        timeAgo: getRelativeTime(activity.time)
      }));
  }, [sales, loadings, paddyTrucks, products]);

  // Get pending deliveries
  const pendingDeliveries = useMemo(() => {
    return bookedStock
      .filter(booking => booking.status === 'pending' || booking.status === 'confirmed')
      .reduce((acc, booking) => {
        const existing = acc.find(d => d.orderId === booking.orderId);
        if (existing) {
          existing.items++;
          return acc;
        }
        return [...acc, {
          id: booking.id,
          orderId: booking.orderId,
          customerName: booking.customerName,
          status: booking.status,
          items: 1,
          date: booking.bookingDate
        }];
      }, [] as Array<{
        id: string;
        orderId: string;
        customerName: string;
        status: string;
        items: number;
        date: Date;
      }>)
      .slice(0, 5);
  }, [bookedStock]);

  // Get top selling products
  const topSellingProducts = useMemo(() => {
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productSales.get(item.productId) || { 
          name: item.productName, 
          quantity: 0, 
          revenue: 0 
        };
        existing.quantity += item.quantity;
        existing.revenue += item.total;
        productSales.set(item.productId, existing);
      });
    });

    return Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [sales]);

  // Helper function for relative time
  function getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  // Prepare stats data
  const stats = [
    {
      title: 'Total Revenue',
      value: `₦${totalRevenue.toLocaleString()}`,
      change: `${revenuePercentageChange >= 0 ? '+' : ''}${revenuePercentageChange.toFixed(1)}%`,
      trend: revenuePercentageChange >= 0 ? 'up' : 'down',
      icon: <DollarSign size={24} />,
      subtitle: 'vs last month'
    },
    {
      title: 'Total Customers',
      value: totalCustomers.toString(),
      change: `+${newCustomersThisMonth} this month`,
      trend: 'up',
      icon: <Users size={24} />,
      subtitle: 'active customers'
    },
    {
      title: 'Inventory Items',
      value: totalInventoryItems.toString(),
      change: lowStockItems > 0 ? `${lowStockItems} low stock` : 'All stocked',
      trend: lowStockItems > 0 ? 'down' : 'up',
      icon: <Package size={24} />,
      subtitle: 'unique products'
    },
    {
      title: 'Active Orders',
      value: activeOrders.toString(),
      change: `${ordersPercentageChange >= 0 ? '+' : ''}${ordersPercentageChange.toFixed(0)}%`,
      trend: ordersPercentageChange >= 0 ? 'up' : 'down',
      icon: <ShoppingCart size={24} />,
      subtitle: 'vs last week'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400">Welcome back! Here's what's happening with your business today.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <GlassCard key={index}>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-gray-400">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
                <div className="flex items-center gap-1">
                  {stat.trend === 'up' ? (
                    <TrendingUp size={16} className="text-green-400" />
                  ) : (
                    <TrendingDown size={16} className="text-red-400" />
                  )}
                  <span className={`text-sm ${stat.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                    {stat.change}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{stat.subtitle}</p>
              </div>
              <div className="p-3 glass rounded-lg">
                {stat.icon}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity size={20} />
            Recent Activity
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 glass rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'sale' ? 'bg-green-500/20 text-green-400' :
                      activity.type === 'loading' ? 'bg-blue-500/20 text-blue-400' :
                      activity.type === 'supplier' ? 'bg-purple-500/20 text-purple-400' :
                      activity.type === 'inventory' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {activity.type === 'sale' ? <DollarSign size={16} /> :
                       activity.type === 'loading' ? <Truck size={16} /> :
                       activity.type === 'supplier' ? <Package2 size={16} /> :
                       activity.type === 'inventory' ? <AlertTriangle size={16} /> :
                       <Activity size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-gray-400">{activity.timeAgo}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">No recent activities</p>
            )}
          </div>
        </GlassCard>
        
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Truck size={20} />
            Pending Deliveries
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {pendingDeliveries.length > 0 ? (
              pendingDeliveries.map((delivery) => (
                <div key={delivery.id} className="p-3 glass rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">Order {delivery.orderId}</p>
                      <p className="text-sm text-gray-400">Customer: {delivery.customerName}</p>
                      <p className="text-xs text-gray-500">{delivery.items} item{delivery.items > 1 ? 's' : ''}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      delivery.status === 'confirmed' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {delivery.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">No pending deliveries</p>
            )}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUpIcon size={20} />
            Top Selling Products
          </h2>
          <div className="space-y-3">
            {topSellingProducts.length > 0 ? (
              topSellingProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 glass rounded-lg">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-400">{product.quantity} units sold</p>
                  </div>
                  <p className="text-green-400 font-semibold">₦{product.revenue.toLocaleString()}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">No sales data available</p>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle size={20} />
            Low Stock Alerts
          </h2>
          <div className="space-y-3">
            {products.filter(p => p.status === 'low-stock' || p.status === 'out-of-stock').slice(0, 5).map((product) => (
              <div key={product.id} className="flex items-center justify-between p-3 glass rounded-lg">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-400">{product.category}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    product.status === 'out-of-stock' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {product.quantityOnHand} {product.unit}
                  </p>
                  <p className="text-xs text-gray-500">
                    {product.status === 'out-of-stock' ? 'Out of Stock' : 'Low Stock'}
                  </p>
                </div>
              </div>
            ))}
            {products.filter(p => p.status === 'low-stock' || p.status === 'out-of-stock').length === 0 && (
              <p className="text-gray-400 text-center py-4">All products are well stocked</p>
            )}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock size={20} />
            Today's Summary
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-2">
              <span className="text-gray-400">Sales Today</span>
              <span className="font-semibold">
                {sales.filter(s => new Date(s.date) >= startOfToday).length}
              </span>
            </div>
            <div className="flex justify-between items-center p-2">
              <span className="text-gray-400">Revenue Today</span>
              <span className="font-semibold text-green-400">
                ₦{sales
                  .filter(s => new Date(s.date) >= startOfToday)
                  .reduce((sum, s) => sum + s.totalAmount, 0)
                  .toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-2">
              <span className="text-gray-400">Loadings Today</span>
              <span className="font-semibold">
                {loadings.filter(l => new Date(l.date) >= startOfToday).length}
              </span>
            </div>
            <div className="flex justify-between items-center p-2">
              <span className="text-gray-400">Paddy Trucks</span>
              <span className="font-semibold">
                {paddyTrucks.filter(t => new Date(t.date) >= startOfToday).length}
              </span>
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
                ₦{customers
                  .reduce((sum, c) => sum + Math.min(0, c.balance), 0)
                  .toLocaleString()
                  .replace('-', '')}
              </span>
            </div>
            <div className="flex justify-between items-center p-2">
              <span className="text-gray-400">Customers with Debt</span>
              <span className="font-semibold">
                {customers.filter(c => c.balance < 0).length}
              </span>
            </div>
            <div className="flex justify-between items-center p-2">
              <span className="text-gray-400">Average Debt</span>
              <span className="font-semibold">
                ₦{customers.filter(c => c.balance < 0).length > 0
                  ? Math.abs(
                      customers
                        .filter(c => c.balance < 0)
                        .reduce((sum, c) => sum + c.balance, 0) /
                      customers.filter(c => c.balance < 0).length
                    ).toLocaleString()
                  : '0'}
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
              <span className="font-semibold">{suppliers.length}</span>
            </div>
            <div className="flex justify-between items-center p-2">
              <span className="text-gray-400">Paddy Received (kg)</span>
              <span className="font-semibold">
                {paddyTrucks
                  .filter(t => new Date(t.date) >= startOfMonth)
                  .reduce((sum, t) => sum + t.weightAfterDeduction, 0)
                  .toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-2">
              <span className="text-gray-400">This Month Value</span>
              <span className="font-semibold text-green-400">
                ₦{paddyTrucks
                  .filter(t => new Date(t.date) >= startOfMonth)
                  .reduce((sum, t) => sum + t.totalAmount, 0)
                  .toLocaleString()}
              </span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};