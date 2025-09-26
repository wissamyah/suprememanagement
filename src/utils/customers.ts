import type { Customer } from '../types';
import { formatDate } from './dateFormatting';

// Format Nigerian phone number
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format based on length
  if (cleaned.startsWith('234')) {
    // International format
    const match = cleaned.match(/^(234)(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `+234 ${match[2]} ${match[3]} ${match[4]}`;
    }
  } else if (cleaned.startsWith('0')) {
    // Local format
    const match = cleaned.match(/^(0)(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `${match[1]}${match[2]} ${match[3]} ${match[4]}`;
    }
  } else if (cleaned.length === 10) {
    // Without leading 0
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `0${match[1]} ${match[2]} ${match[3]}`;
    }
  }
  
  return phone; // Return original if no match
};

// Validate Nigerian phone number
export const validatePhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  
  // Check various valid formats
  // International: 234XXXXXXXXXX (13 digits)
  // Local with 0: 0XXXXXXXXXX (11 digits)
  // Without 0: XXXXXXXXXX (10 digits)
  
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    return true;
  }
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return true;
  }
  if (!cleaned.startsWith('234') && !cleaned.startsWith('0') && cleaned.length === 10) {
    return true;
  }
  
  return false;
};

// Get balance color class
// Negative balance = Customer owes us money (red - accounts receivable)
// Positive balance = We owe the customer (green - credit/overpayment)
// Zero balance = Settled (gray)
export const getBalanceColor = (balance: number): string => {
  if (balance < 0) return 'text-red-400';  // Customer owes us money
  if (balance > 0) return 'text-green-400'; // We owe customer (credit/overpayment)
  return 'text-gray-400'; // No balance
};

// Get balance background class for rows
export const getBalanceBackgroundColor = (balance: number): string => {
  if (balance < 0) return 'bg-red-500/5';
  return '';
};

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Check for duplicate customer
export const checkDuplicateCustomer = (
  customers: Customer[],
  name: string,
  phone: string,
  excludeId?: string
): { isDuplicate: boolean; message?: string } => {
  const normalizedName = name.toLowerCase().trim();
  const normalizedPhone = phone.replace(/\D/g, '');
  
  const duplicateByName = customers.find(c => 
    c.id !== excludeId && 
    c.name.toLowerCase().trim() === normalizedName
  );
  
  const duplicateByPhone = customers.find(c => 
    c.id !== excludeId && 
    c.phone.replace(/\D/g, '') === normalizedPhone
  );
  
  if (duplicateByName) {
    return {
      isDuplicate: true,
      message: `A customer with the name "${name}" already exists`
    };
  }
  
  if (duplicateByPhone) {
    return {
      isDuplicate: true,
      message: `A customer with the phone number "${phone}" already exists`
    };
  }
  
  return { isDuplicate: false };
};

// Export customers to JSON (with optional related data)
export const exportCustomersToJSON = (
  customers: Customer[],
  includeRelatedData: boolean = false,
  relatedData?: {
    sales?: any[];
    ledgerEntries?: any[];
    bookedStock?: any[];
  }
): void => {
  const exportData = includeRelatedData && relatedData ? {
    customers,
    sales: relatedData.sales || [],
    ledgerEntries: relatedData.ledgerEntries || [],
    bookedStock: relatedData.bookedStock || [],
    exportedAt: new Date().toISOString(),
    version: '2.0' // Version to handle backward compatibility
  } : customers;

  const dataStr = JSON.stringify(exportData, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

  const exportFileDefaultName = `customers_${includeRelatedData ? 'full_' : ''}${new Date().toISOString().split('T')[0]}.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

// Export customers to CSV
export const exportCustomersToCSV = (customers: Customer[]): void => {
  const headers = ['ID', 'Name', 'Phone', 'State', 'Balance', 'Created At', 'Updated At'];
  const rows = customers.map(customer => [
    customer.id,
    customer.name,
    customer.phone,
    customer.state,
    customer.balance.toString(),
    formatDate(customer.createdAt),
    formatDate(customer.updatedAt)
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `customers_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Import customers from JSON (supports both old and new format)
export interface ImportResult {
  customers: Customer[];
  relatedData?: {
    sales?: any[];
    ledgerEntries?: any[];
    bookedStock?: any[];
  };
  isFullBackup: boolean;
}

export const importCustomersFromJSON = async (file: File): Promise<ImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);

        let customers: Customer[] = [];
        let relatedData: any = {};
        let isFullBackup = false;

        // Check if it's the new format (object with version) or old format (array)
        if (Array.isArray(importedData)) {
          // Old format - array of customers
          customers = importedData;
        } else if (importedData.version === '2.0' && importedData.customers) {
          // New format - includes related data
          customers = importedData.customers;
          relatedData = {
            sales: importedData.sales || [],
            ledgerEntries: importedData.ledgerEntries || [],
            bookedStock: importedData.bookedStock || []
          };
          isFullBackup = true;
        } else {
          throw new Error('Invalid file format: Unrecognized data structure');
        }

        // Validate and preserve all customer data
        const validatedCustomers = customers.map((customer, index) => {
          if (!customer.name || !customer.phone || !customer.state) {
            throw new Error(`Invalid customer at position ${index + 1}: Missing required fields`);
          }

          // Preserve ALL fields from the imported data
          return {
            id: customer.id, // PRESERVE original ID
            name: customer.name,
            phone: customer.phone,
            state: customer.state,
            balance: typeof customer.balance === 'number' ? customer.balance : 0, // PRESERVE balance
            createdAt: customer.createdAt ? new Date(customer.createdAt) : new Date(),
            updatedAt: customer.updatedAt ? new Date(customer.updatedAt) : new Date()
          } as Customer;
        });

        resolve({
          customers: validatedCustomers,
          relatedData: isFullBackup ? relatedData : undefined,
          isFullBackup
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
};

// Sort customers
export const sortCustomers = (
  customers: Customer[],
  sortField: keyof Customer,
  sortDirection: 'asc' | 'desc'
): Customer[] => {
  const sorted = [...customers];
  
  sorted.sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];
    
    // Handle different types
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue?.toLowerCase() || '';
    }
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
  
  return sorted;
};

// Filter customers
export const filterCustomers = (
  customers: Customer[],
  searchTerm: string,
  stateFilter: string,
  balanceFilter: string
): Customer[] => {
  let filtered = [...customers];
  
  // Apply search filter
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(customer =>
      customer.name.toLowerCase().includes(term) ||
      customer.phone.includes(term)
    );
  }
  
  // Apply state filter
  if (stateFilter && stateFilter !== 'all') {
    filtered = filtered.filter(customer => customer.state === stateFilter);
  }
  
  // Apply balance filter
  // Note: Negative balance = customer owes us, Positive = we owe customer
  if (balanceFilter && balanceFilter !== 'all') {
    switch (balanceFilter) {
      case 'positive':  // We owe customer (credit)
        filtered = filtered.filter(customer => customer.balance > 0);
        break;
      case 'negative':  // Customer owes us (accounts receivable)
        filtered = filtered.filter(customer => customer.balance < 0);
        break;
      case 'zero':  // Settled
        filtered = filtered.filter(customer => customer.balance === 0);
        break;
    }
  }
  
  return filtered;
};