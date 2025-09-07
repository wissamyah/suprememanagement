import type { Sale, SaleItem } from '../types';

/**
 * Generate a unique order ID in the format ORD-YYYY-XXX
 * Now accepts existing sales as parameter for GitHub Direct mode
 */
export const generateOrderId = (existingSales: Sale[] = []): string => {
  const now = new Date();
  const year = now.getFullYear();
  
  // Filter sales from current year
  const currentYearSales = existingSales.filter(sale => {
    const saleYear = new Date(sale.date).getFullYear();
    return saleYear === year;
  });
  
  // Find the highest number for current year
  let nextNumber = 1;
  if (currentYearSales.length > 0) {
    const numbers = currentYearSales
      .map(sale => {
        const match = sale.orderId.match(/ORD-\d{4}-(\d{3})/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n));
    
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1;
    }
  }
  
  // Format with leading zeros
  const formattedNumber = nextNumber.toString().padStart(3, '0');
  return `ORD-${year}-${formattedNumber}`;
};

/**
 * Calculate the total amount for a sale
 */
export const calculateSaleTotal = (items: SaleItem[]): number => {
  return items.reduce((total, item) => total + item.total, 0);
};

/**
 * Calculate line item total
 */
export const calculateLineTotal = (quantity: number, unitPrice: number): number => {
  return quantity * unitPrice;
};

/**
 * Format currency amount in Naira
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount).replace('NGN', '₦');
};

/**
 * Get sales for a specific date range
 */
export const getDateRangeSales = (sales: Sale[], range: 'today' | 'week' | 'month' | 'all'): Sale[] => {
  if (range === 'all') return sales;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (range) {
    case 'today': {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= today && saleDate < tomorrow;
      });
    }
    
    case 'week': {
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      
      return sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startOfWeek && saleDate < endOfWeek;
      });
    }
    
    case 'month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      
      return sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startOfMonth && saleDate < endOfMonth;
      });
    }
    
    default:
      return sales;
  }
};

/**
 * Calculate summary statistics for sales
 */
export const calculateSalesStats = (sales: Sale[]) => {
  const todaysSales = getDateRangeSales(sales, 'today');
  const weekSales = getDateRangeSales(sales, 'week');
  const monthSales = getDateRangeSales(sales, 'month');
  
  const pendingPaymentSales = sales.filter(sale => sale.paymentStatus !== 'paid');
  
  return {
    todaysTotal: todaysSales.reduce((sum, sale) => sum + sale.totalAmount, 0),
    weekTotal: weekSales.reduce((sum, sale) => sum + sale.totalAmount, 0),
    monthTotal: monthSales.reduce((sum, sale) => sum + sale.totalAmount, 0),
    pendingPaymentTotal: pendingPaymentSales.reduce((sum, sale) => sum + sale.totalAmount, 0),
  };
};

/**
 * Validate sale data
 */
export const validateSaleData = (sale: Partial<Sale>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!sale.customerId) {
    errors.push('Customer is required');
  }
  
  if (!sale.date) {
    errors.push('Sale date is required');
  }
  
  if (!sale.items || sale.items.length === 0) {
    errors.push('At least one product is required');
  } else {
    sale.items.forEach((item, index) => {
      if (!item.productId) {
        errors.push(`Product is required for item ${index + 1}`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Valid quantity is required for item ${index + 1}`);
      }
      if (item.price === undefined || item.price <= 0) {
        errors.push(`Valid unit price is required for item ${index + 1}`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Export sales to JSON
 */
export const exportSalesToJSON = (sales: Sale[]) => {
  const dataStr = JSON.stringify(sales, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `sales-export-${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

/**
 * Export sales to CSV
 */
export const exportSalesToCSV = (sales: Sale[]) => {
  const headers = ['Order ID', 'Date', 'Customer', 'Total Items', 'Total Amount', 'Payment Status'];
  
  const rows = sales.map(sale => [
    sale.orderId,
    new Date(sale.date).toLocaleDateString('en-NG'),
    sale.customerName,
    sale.items.reduce((sum, item) => sum + item.quantity, 0),
    formatCurrency(sale.totalAmount),
    sale.paymentStatus
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `sales-export-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};