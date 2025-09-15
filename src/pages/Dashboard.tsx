import { Users, Package, DollarSign, ShoppingCart } from 'lucide-react';
import { useInventoryDirect } from '../hooks/useInventoryDirect';
import { useCustomersDirect } from '../hooks/useCustomersDirect';
import { useSalesDirect } from '../hooks/useSalesDirect';
import { useLoadingsDirect } from '../hooks/useLoadingsDirect';
import { usePaddyTrucksDirect } from '../hooks/usePaddyTrucksDirect';
import { useSuppliersDirect } from '../hooks/useSuppliersDirect';
import { useDashboardData } from '../hooks/useDashboardData';
import { DashboardStats } from '../components/dashboard/DashboardStats';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { PendingDeliveries } from '../components/dashboard/PendingDeliveries';
import { TopSellingProducts } from '../components/dashboard/TopSellingProducts';
import { LowStockAlerts } from '../components/dashboard/LowStockAlerts';
import { SummaryCards } from '../components/dashboard/SummaryCards';

export const Dashboard = () => {
  const { products, loading: inventoryLoading } = useInventoryDirect();
  const { customers, loading: customersLoading } = useCustomersDirect();
  const { sales, bookedStock, loading: salesLoading } = useSalesDirect();
  const { loadings, loading: loadingsLoading } = useLoadingsDirect();
  const { paddyTrucks, loading: paddyTrucksLoading } = usePaddyTrucksDirect();
  const { suppliers, loading: suppliersLoading } = useSuppliersDirect();

  const isLoading = inventoryLoading || customersLoading || salesLoading ||
                   loadingsLoading || paddyTrucksLoading || suppliersLoading;

  const {
    totalRevenue,
    revenuePercentageChange,
    totalCustomers,
    newCustomersThisMonth,
    totalInventoryItems,
    lowStockItems,
    activeOrders,
    ordersPercentageChange,
    recentActivities,
    pendingDeliveries,
    topSellingProducts,
    todaySummary,
    customerDebtSummary,
    supplierSummary
  } = useDashboardData({
    sales,
    products,
    customers,
    loadings,
    paddyTrucks,
    suppliers,
    bookedStock
  });



  const stats = [
    {
      title: 'Total Revenue',
      value: `₦${totalRevenue.toLocaleString()}`,
      change: `${revenuePercentageChange >= 0 ? '+' : ''}${revenuePercentageChange.toFixed(1)}%`,
      trend: (revenuePercentageChange >= 0 ? 'up' : 'down') as 'up' | 'down',
      icon: <DollarSign size={24} />,
      subtitle: 'vs last month'
    },
    {
      title: 'Total Customers',
      value: totalCustomers.toString(),
      change: `+${newCustomersThisMonth} this month`,
      trend: 'up' as 'up' | 'down',
      icon: <Users size={24} />,
      subtitle: 'active customers'
    },
    {
      title: 'Inventory Items',
      value: totalInventoryItems.toString(),
      change: lowStockItems > 0 ? `${lowStockItems} low stock` : 'All stocked',
      trend: (lowStockItems > 0 ? 'down' : 'up') as 'up' | 'down',
      icon: <Package size={24} />,
      subtitle: 'unique products'
    },
    {
      title: 'Active Orders',
      value: activeOrders.toString(),
      change: `${ordersPercentageChange >= 0 ? '+' : ''}${ordersPercentageChange.toFixed(0)}%`,
      trend: (ordersPercentageChange >= 0 ? 'up' : 'down') as 'up' | 'down',
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
      
      <DashboardStats stats={stats} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity activities={recentActivities} />
        <PendingDeliveries deliveries={pendingDeliveries} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopSellingProducts products={topSellingProducts} />
        <LowStockAlerts products={products} />
      </div>

      <SummaryCards
        todaySummary={todaySummary}
        customerDebtSummary={customerDebtSummary}
        supplierSummary={supplierSummary}
      />
    </div>
  );
};