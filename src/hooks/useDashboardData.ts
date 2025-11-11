import { useMemo } from 'react';
import type { Sale, Product, Customer, Loading, PaddyTruck, Supplier, BookedStock, LedgerEntry } from '../types';
import { formatDate } from '../utils/dateFormatting';
import { calculateCustomerBalance } from '../utils/customers';

interface DashboardDataProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  ledgerEntries: LedgerEntry[];
  loadings: Loading[];
  paddyTrucks: PaddyTruck[];
  suppliers: Supplier[];
  bookedStock: BookedStock[];
}

export const useDashboardData = ({
  sales,
  products,
  customers,
  ledgerEntries,
  loadings,
  paddyTrucks,
  suppliers,
  bookedStock
}: DashboardDataProps) => {
  // Calculate date ranges - memoized to prevent unnecessary recalculations
  const startOfWeek = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    return startOfWeek;
  }, []);

  const startOfMonth = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, []);

  const startOfLastMonth = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() - 1, 1);
  }, []);

  const endOfLastMonth = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 0);
  }, []);

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
    return bookedStock.filter(booking =>
      booking.status === 'pending' || booking.status === 'partial-loaded'
    ).length;
  }, [bookedStock]);

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
      metadata?: {
        customerName?: string;
        amount?: number;
        quantity?: string;
        supplierName?: string;
        weight?: number;
        productName?: string;
        unit?: string;
        itemCount?: number;
        truckPlate?: string;
        pricePerKg?: number;
        itemNames?: string;
      };
    }> = [];

    sales.slice(-5).forEach(sale => {
      activities.push({
        id: sale.id,
        type: 'sale',
        description: `Sale to ${sale.customerName}`,
        time: new Date(sale.createdAt),
        metadata: {
          customerName: sale.customerName,
          amount: sale.totalAmount,
          itemNames: sale.items.map(i => i.productName).join(', ')
        }
      });
    });

    loadings.slice(-5).forEach(loading => {
      const itemsDescription = loading.items
        .map(item => `${item.productName} (${item.quantity} bags @ ₦${item.unitPrice.toLocaleString()})`)
        .join(', ');
      
      activities.push({
        id: loading.id,
        type: 'loading',
        description: `Loading for ${loading.customerName}`,
        time: new Date(loading.createdAt),
        metadata: {
          customerName: loading.customerName,
          quantity: itemsDescription,
          truckPlate: loading.truckPlateNumber
        }
      });
    });

    paddyTrucks.slice(-3).forEach(truck => {
      const weight = truck.weightAfterDeduction > 0 ? truck.weightAfterDeduction : truck.netWeight || 0;
      activities.push({
        id: truck.id,
        type: 'supplier',
        description: `Paddy from ${truck.supplierName}`,
        time: new Date(truck.createdAt),
        metadata: {
          supplierName: truck.supplierName,
          weight: weight,
          truckPlate: truck.truckPlate,
          pricePerKg: truck.pricePerKg,
        }
      });
    });

    products.filter(p => p.status === 'low-stock').slice(0, 3).forEach(product => {
      activities.push({
        id: product.id,
        type: 'inventory',
        description: `Low stock alert`,
        time: new Date(product.updatedAt),
        metadata: {
          productName: product.name,
          quantity: `${product.quantityOnHand} ${product.unit} remaining`
        }
      });
    });

    ledgerEntries
      .filter(entry => entry.type === 'credit' && entry.notes?.toLowerCase().includes('payment'))
      .slice(-5)
      .forEach(entry => {
        const customer = customers.find(c => c.id === entry.customerId);
        activities.push({
          id: entry.id,
          type: 'payment',
          description: 'Payment received',
          time: new Date(entry.date),
          metadata: {
            customerName: customer?.name || 'Unknown Customer',
            amount: entry.amount
          }
        });
      });

    return activities
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 10)
      .map(activity => ({
        ...activity,
        timeAgo: getRelativeTime(activity.time)
      }));
  }, [sales, loadings, paddyTrucks, products, ledgerEntries, customers]);

  // Pending deliveries
  const pendingDeliveries = useMemo(() => {
    const customerDeliveries = bookedStock
      .filter(booking => booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'partial-loaded')
      .reduce((acc, booking) => {
        const sale = sales.find(s => s.id === booking.saleId);
        const saleItem = sale?.items.find(item => item.productId === booking.productId);
        const price = saleItem?.price || 0;
        const remainingQuantity = booking.quantity - booking.quantityLoaded;

        if (remainingQuantity <= 0) {
          return acc;
        }

        const remainingTotal = remainingQuantity * price;
        const customerName = booking.customerName;

        if (acc[customerName]) {
          const existing = acc[customerName];
          existing.orderIds.push(booking.orderId);
          existing.items++;

          const statusPriority: Record<string, number> = { 'partial-loaded': 3, 'confirmed': 2, 'pending': 1 };
          if (statusPriority[booking.status] > statusPriority[existing.status]) {
            existing.status = booking.status;
          }

          const existingProduct = existing.products.find(p => p.productName === booking.productName);
          if (existingProduct) {
            existingProduct.quantity += remainingQuantity;
            existingProduct.total += remainingTotal;
          } else {
            existing.products.push({
              productName: booking.productName,
              quantity: remainingQuantity,
              price: price,
              total: remainingTotal,
            });
          }
        } else {
          const customer = customers.find(c => c.name === customerName);
          const balance = customer ? calculateCustomerBalance(customer.id, ledgerEntries) : 0;

          acc[customerName] = {
            id: customerName,
            orderId: booking.orderId, // For compatibility, but orderIds array is better
            orderIds: [booking.orderId],
            customerName: customerName,
            status: booking.status,
            items: 1,
            date: booking.bookingDate,
            balance: balance,
            products: [{
              productName: booking.productName,
              quantity: remainingQuantity,
              price: price,
              total: remainingTotal,
            }],
          };
        }
        return acc;
      }, {} as Record<string, {
        id: string;
        orderId: string;
        orderIds: string[];
        customerName: string;
        status: string;
        items: number;
        date: Date;
        balance: number;
        products: Array<{
          productName: string;
          quantity: number;
          price: number;
          total: number;
        }>;
      }>);

    return Object.values(customerDeliveries);
  }, [bookedStock, sales, customers, ledgerEntries]);

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
  const todaySummary = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return {
      salesToday: sales.filter(s => new Date(s.date) >= startOfToday).length,
      revenueToday: sales
        .filter(s => new Date(s.date) >= startOfToday)
        .reduce((sum, s) => sum + s.totalAmount, 0),
      loadingsToday: loadings.filter(l => new Date(l.date) >= startOfToday).length,
      paddyTrucksToday: paddyTrucks.filter(t => new Date(t.date) >= startOfToday).length
    };
  }, [sales, loadings, paddyTrucks]);

  const customerDebtSummary = useMemo(() => {
    const customersWithBalances = customers.map(c => ({
      ...c,
      actualBalance: calculateCustomerBalance(c.id, ledgerEntries)
    }));
    const customersWithDebt = customersWithBalances.filter(c => c.actualBalance < 0);
    const totalOutstanding = Math.abs(customersWithBalances.reduce((sum, c) => sum + Math.min(0, c.actualBalance), 0));
    const averageDebt = customersWithDebt.length > 0
      ? Math.abs(customersWithDebt.reduce((sum, c) => sum + c.actualBalance, 0) / customersWithDebt.length)
      : 0;

    return {
      totalOutstanding,
      customersWithDebt: customersWithDebt.length,
      averageDebt,
      customersList: customersWithDebt
        .sort((a, b) => a.actualBalance - b.actualBalance)
        .map(c => ({
          name: c.name,
          balance: Math.abs(c.actualBalance)
        }))
    };
  }, [customers, ledgerEntries]);

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
  return formatDate(date);
}