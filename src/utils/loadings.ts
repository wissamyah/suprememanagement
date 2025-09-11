import type { Loading } from '../types';

// Sanitize text input to remove special/invisible Unicode characters
export const sanitizeTextInput = (text: string): string => {
  if (!text) return '';
  
  // Replace various Unicode spaces with regular spaces
  return text
    // Replace non-breaking spaces (U+00A0) with regular spaces
    .replace(/\u00A0/g, ' ')
    // Replace zero-width spaces and other invisible characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Replace various Unicode space characters with regular space
    .replace(/[\u2000-\u200A\u202F\u205F]/g, ' ')
    // Replace em dash, en dash with regular dash
    .replace(/[\u2013\u2014]/g, '-')
    // Replace various quotation marks with regular quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Remove any other control characters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Normalize multiple spaces to single space
    .replace(/\s+/g, ' ')
    // Trim whitespace
    .trim();
};

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Export loadings to JSON
export const exportLoadingsToJSON = (loadings: Loading[]): void => {
  const dataStr = JSON.stringify(loadings, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `loadings_${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

// Export loadings to CSV
export const exportLoadingsToCSV = (loadings: Loading[]): void => {
  // CSV headers
  const headers = [
    'Loading ID',
    'Date',
    'Customer Name',
    'Truck Plate Number',
    'Way Bill Number',
    'Products',
    'Total Quantity',
    'Total Value',
    'Created At'
  ];
  
  // Convert loadings to CSV rows
  const rows = loadings.map(loading => {
    const products = loading.items.map(item => 
      `${item.productName} (${item.quantity} ${item.unit} @ ${formatCurrency(item.unitPrice)})`
    ).join('; ');
    
    const totalQuantity = loading.items.reduce((sum, item) => sum + item.quantity, 0);
    
    return [
      loading.loadingId,
      loading.date,
      loading.customerName,
      loading.truckPlateNumber,
      loading.wayBillNumber || '',
      products,
      totalQuantity.toString(),
      loading.totalValue.toFixed(2),
      loading.createdAt
    ];
  });
  
  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `loadings_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Import loadings from JSON
export const importLoadingsFromJSON = async (file: File): Promise<Loading[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const loadings = JSON.parse(content);
        
        // Validate the structure
        if (!Array.isArray(loadings)) {
          throw new Error('Invalid file format: expected an array of loadings');
        }
        
        // Basic validation of required fields
        const validLoadings = loadings.filter(loading => 
          loading.loadingId && 
          loading.date && 
          loading.customerId && 
          loading.customerName &&
          loading.truckPlateNumber &&
          Array.isArray(loading.items)
        );
        
        resolve(validLoadings);
      } catch (error) {
        reject(new Error('Failed to parse JSON file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

// Calculate loading statistics
export const calculateLoadingStats = (loadings: Loading[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaysLoadings = loadings.filter(loading => {
    const loadingDate = new Date(loading.date);
    loadingDate.setHours(0, 0, 0, 0);
    return loadingDate.getTime() === today.getTime();
  });
  
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekLoadings = loadings.filter(loading => {
    const loadingDate = new Date(loading.date);
    loadingDate.setHours(0, 0, 0, 0);
    return loadingDate >= weekAgo;
  });
  
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const monthLoadings = loadings.filter(loading => {
    const loadingDate = new Date(loading.date);
    loadingDate.setHours(0, 0, 0, 0);
    return loadingDate >= monthAgo;
  });
  
  return {
    todaysCount: todaysLoadings.length,
    todaysValue: todaysLoadings.reduce((sum, l) => sum + l.totalValue, 0),
    weekCount: weekLoadings.length,
    weekValue: weekLoadings.reduce((sum, l) => sum + l.totalValue, 0),
    monthCount: monthLoadings.length,
    monthValue: monthLoadings.reduce((sum, l) => sum + l.totalValue, 0),
    totalCount: loadings.length,
    totalValue: loadings.reduce((sum, l) => sum + l.totalValue, 0)
  };
};

// Filter loadings
export const filterLoadings = (
  loadings: Loading[],
  searchTerm: string,
  dateFilter: string
): Loading[] => {
  let filtered = [...loadings];
  
  // Apply search filter
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(loading =>
      loading.loadingId.toLowerCase().includes(term) ||
      loading.customerName.toLowerCase().includes(term) ||
      loading.truckPlateNumber.toLowerCase().includes(term) ||
      (loading.wayBillNumber && loading.wayBillNumber.toLowerCase().includes(term))
    );
  }
  
  // Apply date filter
  if (dateFilter && dateFilter !== 'all') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    filtered = filtered.filter(loading => {
      const loadingDate = new Date(loading.date);
      loadingDate.setHours(0, 0, 0, 0);
      
      switch (dateFilter) {
        case 'today':
          return loadingDate.getTime() === today.getTime();
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return loadingDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return loadingDate >= monthAgo;
        default:
          return true;
      }
    });
  }
  
  return filtered;
};

// Sort loadings
export const sortLoadings = (
  loadings: Loading[],
  sortField: 'date' | 'customer' | 'totalValue',
  sortDirection: 'asc' | 'desc'
): Loading[] => {
  const sorted = [...loadings];
  
  sorted.sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'customer':
        comparison = a.customerName.localeCompare(b.customerName);
        break;
      case 'totalValue':
        comparison = a.totalValue - b.totalValue;
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
};