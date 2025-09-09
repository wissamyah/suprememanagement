import type { Supplier } from '../types';

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

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Check for duplicate supplier
export const checkDuplicateSupplier = (
  suppliers: Supplier[],
  name: string,
  phone: string,
  excludeId?: string
): { isDuplicate: boolean; message?: string } => {
  const normalizedName = name.toLowerCase().trim();
  const normalizedPhone = phone.replace(/\D/g, '');
  
  const duplicateByName = suppliers.find(s => 
    s.id !== excludeId && 
    s.name.toLowerCase().trim() === normalizedName
  );
  
  const duplicateByPhone = suppliers.find(s => 
    s.id !== excludeId && 
    s.phone.replace(/\D/g, '') === normalizedPhone
  );
  
  if (duplicateByName) {
    return {
      isDuplicate: true,
      message: `A supplier with the name "${name}" already exists`
    };
  }
  
  if (duplicateByPhone) {
    return {
      isDuplicate: true,
      message: `A supplier with the phone number "${phone}" already exists`
    };
  }
  
  return { isDuplicate: false };
};

// Export suppliers to JSON
export const exportSuppliersToJSON = (suppliers: Supplier[]): void => {
  const dataStr = JSON.stringify(suppliers, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `suppliers_${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

// Export suppliers to CSV
export const exportSuppliersToCSV = (suppliers: Supplier[]): void => {
  const headers = ['ID', 'Name', 'Phone', 'Agent', 'Created At', 'Updated At'];
  const rows = suppliers.map(supplier => [
    supplier.id,
    supplier.name,
    supplier.phone,
    supplier.agent,
    new Date(supplier.createdAt).toLocaleDateString(),
    new Date(supplier.updatedAt).toLocaleDateString()
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `suppliers_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Import suppliers from JSON
export const importSuppliersFromJSON = async (file: File): Promise<Supplier[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedSuppliers = JSON.parse(content);
        
        // Validate the structure
        if (!Array.isArray(importedSuppliers)) {
          throw new Error('Invalid file format: Expected an array of suppliers');
        }
        
        // Validate each supplier
        const validatedSuppliers = importedSuppliers.map((supplier, index) => {
          if (!supplier.name || !supplier.phone || !supplier.agent) {
            throw new Error(`Invalid supplier at position ${index + 1}: Missing required fields`);
          }
          
          return {
            ...supplier,
            createdAt: supplier.createdAt ? new Date(supplier.createdAt) : new Date(),
            updatedAt: supplier.updatedAt ? new Date(supplier.updatedAt) : new Date()
          };
        });
        
        resolve(validatedSuppliers);
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

// Sort suppliers
export const sortSuppliers = (
  suppliers: Supplier[],
  sortField: keyof Supplier,
  sortDirection: 'asc' | 'desc'
): Supplier[] => {
  const sorted = [...suppliers];
  
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

// Filter suppliers
export const filterSuppliers = (
  suppliers: Supplier[],
  searchTerm: string,
  agentFilter: string
): Supplier[] => {
  let filtered = [...suppliers];
  
  // Apply search filter
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(supplier =>
      supplier.name.toLowerCase().includes(term) ||
      supplier.phone.includes(term)
    );
  }
  
  // Apply agent filter
  if (agentFilter && agentFilter !== 'all') {
    filtered = filtered.filter(supplier => supplier.agent === agentFilter);
  }
  
  return filtered;
};