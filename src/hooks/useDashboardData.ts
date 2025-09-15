import { useMemo } from 'react';
import type { Sale, Product, Customer, Loading, PaddyTruck, Supplier, BookedStock } from '../types';

interface DashboardDataProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  loadings: Loading[];
  paddyTrucks: PaddyTruck[];
  suppliers: Supplier[];
  bookedStock: BookedStock[];
}

export const useDashboardData = ({
  sales,
  products,
  customers,
  loadings,
  paddyTrucks,
  suppliers,
  bookedStock
}: DashboardDataProps) => {
  // Calculate date ranges
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

  // Calculate revenue metrics
  const totalRevenue = useMemo(() => {
    return sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  }, [sales]);

  const thisMonthRevenue = useMemo(() => {
    return sales
      .filter(sale => new Date(sale.date) >= startOfMonth)
      .reduce((sum, sale) => sum + sale.totalAmount, 0);
  }, [sales, startOfMonth]);

  const lastMonthRevenue = useMemo(() => {
    return sales
      .filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startOfLastMonth && saleDate <= endOfLastMonth;
      })
      .reduce((sum, sale) => sum + sale.totalAmount, 0);
  }, [sales, startOfLastMonth, endOfLastMonth]);

  const revenuePercentageChange = useMemo(() => {
    if (lastMonthRevenue === 0) return thisMonthRevenue > 0 ? 100 : 0;
    return ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
  }, [thisMonthRevenue, lastMonthRevenue]);

  // Customer statistics
  const totalCustomers = customers.length;
  const newCustomersThisMonth = useMemo(() => {
    return customers.filter(customer =>
      new Date(customer.createdAt) >= startOfMonth
    ).length;
  }, [customers, startOfMonth]);

  // Inventory statistics
  const totalInventoryItems = products.length;
  const lowStockItems = useMemo(() => {
    return products.filter(product =>
      product.status === 'low-stock' || product.status === 'out-of-stock'
    ).length;
  }, [products]);

  // Active orders
  const activeOrders = useMemo(() => {
    const pendingSales = sales.filter(sale => sale.paymentStatus === 'pending').length;
    const pendingBookings = bookedStock.filter(booking =>
      booking.status === 'pending' || booking.status === 'confirmed'
    ).length;
    return pendingSales + pendingBookings;
  }, [sales, bookedStock]);

  // Order percentage change
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

  // Recent activities
  const recentActivities = useMemo(() => {
    const activities: Array<{
      id: string;
      type: 'sale' | 'loading' | 'supplier' | 'inventory' | 'payment';
      description: string;
      time: Date;
    }> = [];

    sales.slice(-5).forEach(sale => {
      activities.push({
        id: sale.id,
        type: 'sale',
        description: `New sale to ${sale.customerName} - ₦${sale.totalAmount.toLocaleString()}`,
        time: new Date(sale.createdAt)
      });
    });

    loadings.slice(-5).forEach(loading => {
      activities.push({
        id: loading.id,
        type: 'loading',
        description: `Loading completed for ${loading.customerName} - Order ${loading.loadingId}`,
        time: new Date(loading.createdAt)
      });
    });

    paddyTrucks.slice(-3).forEach(truck => {
      activities.push({
        id: truck.id,
        type: 'supplier',
        description: `Paddy truck received from ${truck.supplierName} - ${truck.weightAfterDeduction}kg`,
        time: new Date(truck.createdAt)
      });
    });

    products.filter(p => p.status === 'low-stock').slice(0, 3).forEach(product => {
      activities.push({
        id: product.id,
        type: 'inventory',
        description: `Low stock alert: ${product.name} (${product.quantityOnHand} ${product.unit} remaining)`,
        time: new Date(product.updatedAt)
      });
    });

    return activities
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 10)
      .map(activity => ({
        ...activity,
        timeAgo: getRelativeTime(activity.time)
      }));
  }, [sales, loadings, paddyTrucks, products]);

  // Pending deliveries
  const pendingDeliveries = useMemo(() => {
    return bookedStock
      .filter(booking => booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'partial-loaded')
      .reduce((acc, booking) => {
        const sale = sales.find(s => s.id === booking.saleId);
        const saleItem = sale?.items.find(item => item.productId === booking.productId);
        const price = saleItem?.price || 0;
        const existing = acc.find(d => d.orderId === booking.orderId);
        const remainingQuantity = booking.quantity - booking.quantityLoaded;
        const remainingTotal = remainingQuantity * price;

        if (existing) {
          existing.items++;
          existing.products.push({
            productName: booking.productName,
            quantity: remainingQuantity,
            price: price,
            total: remainingTotal
          });
          return acc;
        }
        return [...acc, {
          id: booking.id,
          orderId: booking.orderId,
          customerName: booking.customerName,
          status: booking.status,
          items: 1,
          date: booking.bookingDate,
          products: [{
            productName: booking.productName,
            quantity: remainingQuantity,
            price: price,
            total: remainingTotal
          }]
        }];
      }, [] as Array<{
        id: string;
        orderId: string;
        customerName: string;
        status: string;
        items: number;
        date: Date;
        products: Array<{
          productName: string;
          quantity: number;
          price: number;
          total: number;
        }>;
      }>);
  }, [bookedStock, sales]);

  // Top selling products
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

  // Summary calculations
  const todaySummary = useMemo(() => ({
    salesToday: sales.filter(s => new Date(s.date) >= startOfToday).length,
    revenueToday: sales
      .filter(s => new Date(s.date) >= startOfToday)
      .reduce((sum, s) => sum + s.totalAmount, 0),
    loadingsToday: loadings.filter(l => new Date(l.date) >= startOfToday).length,
    paddyTrucksToday: paddyTrucks.filter(t => new Date(t.date) >= startOfToday).length
  }), [sales, loadings, paddyTrucks, startOfToday]);

  const customerDebtSummary = useMemo(() => {
    const customersWithDebt = customers.filter(c => c.balance < 0);
    const totalOutstanding = Math.abs(customers.reduce((sum, c) => sum + Math.min(0, c.balance), 0));
    const averageDebt = customersWithDebt.length > 0
      ? Math.abs(customersWithDebt.reduce((sum, c) => sum + c.balance, 0) / customersWithDebt.length)
      : 0;

    return {
      totalOutstanding,
      customersWithDebt: customersWithDebt.length,
      averageDebt
    };
  }, [customers]);

  const supplierSummary = useMemo(() => ({
    totalSuppliers: suppliers.length,
    paddyReceivedKg: paddyTrucks
      .filter(t => new Date(t.date) >= startOfMonth)
      .reduce((sum, t) => sum + t.weightAfterDeduction, 0),
    thisMonthValue: paddyTrucks
      .filter(t => new Date(t.date) >= startOfMonth)
      .reduce((sum, t) => sum + t.totalAmount, 0)
  }), [suppliers, paddyTrucks, startOfMonth]);

  return {
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
  };
};

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