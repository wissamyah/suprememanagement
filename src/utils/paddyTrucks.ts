import type { PaddyTruck, Supplier } from '../types';
import { formatDate } from './dateFormatting';

// Export functions
export const exportPaddyTrucksToJSON = (paddyTrucks: PaddyTruck[]) => {
  const dataStr = JSON.stringify(paddyTrucks, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `paddy-trucks-${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

// Helper function to parse account details from supplier notes
const parseAccountDetails = (notes: string | undefined): {
  accountNumber: string;
  bankName: string;
  accountName: string;
} => {
  // If no notes or empty, return all empty
  if (!notes || !notes.trim()) {
    return { accountNumber: '', bankName: '', accountName: '' };
  }

  const lines = notes.split('\n').map(l => l.trim()).filter(l => l);

  // Need all 3 lines for valid parsing
  if (lines.length < 3) {
    return { accountNumber: '', bankName: '', accountName: '' };
  }

  // Known Nigerian banks (case-insensitive matching)
  const knownBanks = [
    'first bank', 'gtb', 'gtbank', 'guaranty trust', 'access bank', 'access',
    'zenith', 'zenith bank', 'uba', 'united bank', 'fcmb', 'fidelity',
    'stanbic', 'stanbic ibtc', 'sterling', 'sterling bank', 'union bank',
    'wema', 'wema bank', 'polaris', 'polaris bank', 'keystone', 'ecobank',
    'taj bank', 'taj', 'jaiz', 'jaiz bank', 'providus', 'kuda', 'opay',
    'palmpay', 'moniepoint'
  ];

  let accountNumber = '';
  let bankName = '';
  let accountName = '';

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Check if line is primarily digits (account number - typically 10 digits)
    if (/^\d{10,}$/.test(line.replace(/\s/g, ''))) {
      accountNumber = line;
    }
    // Check if line matches a known bank
    else if (knownBanks.some(bank => lowerLine.includes(bank))) {
      bankName = line;
    }
    // Otherwise it's the account name
    else if (!accountName) {
      accountName = line;
    }
  }

  return { accountNumber, bankName, accountName };
};

export const exportPaddyTrucksToCSV = (
  paddyTrucks: PaddyTruck[],
  suppliers: Supplier[],
  dateFrom?: string,
  dateTo?: string
) => {
  // Filter trucks by date range
  let filteredTrucks = [...paddyTrucks];

  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    fromDate.setHours(0, 0, 0, 0);
    filteredTrucks = filteredTrucks.filter(truck => {
      const truckDate = new Date(truck.date);
      truckDate.setHours(0, 0, 0, 0);
      return truckDate >= fromDate;
    });
  }

  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    filteredTrucks = filteredTrucks.filter(truck => {
      const truckDate = new Date(truck.date);
      return truckDate <= toDate;
    });
  }

  // Sort by date (newest first), then by creation time
  filteredTrucks.sort((a, b) => {
    const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateComparison === 0) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return dateComparison;
  });

  // Row 1: Main headers
  const row1Headers = [
    'Date',
    'Supplier Name',
    'Truck Plate',
    'Gross Weight (tons)',
    'Deduction (kg)',
    'Net Weight After Deduction (tons)',
    'Price/ton',
    'Total Value',
    'Approval',
    'Payment Status',
    'Account Details',
    '',
    ''
  ];

  // Row 2: Sub-headers for account details
  const row2SubHeaders = [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Account Number',
    'Bank Name',
    'Acc. Name'
  ];

  // Data rows with transformations
  const dataRows = filteredTrucks.map(truck => {
    // Look up supplier notes and parse account details
    const supplier = suppliers.find(s => s.id === truck.supplierId);
    const { accountNumber, bankName, accountName } = parseAccountDetails(supplier?.notes);

    // Convert weights to tons (divide by 1000, 3 decimals)
    const grossWeightTons = truck.netWeight ? (truck.netWeight / 1000).toFixed(3) : '';
    const netWeightAfterDeductionTons = (truck.weightAfterDeduction / 1000).toFixed(3);

    // Convert price to per ton (multiply by 1000)
    const pricePerTon = (truck.pricePerKg * 1000).toLocaleString();

    // Format total value with thousand separators
    const totalValue = truck.totalAmount.toLocaleString();

    return [
      formatDate(truck.date),
      truck.supplierName,
      truck.truckPlate,
      grossWeightTons,
      truck.deduction?.toString() || '',
      netWeightAfterDeductionTons,
      pricePerTon,
      totalValue,
      '', // Approval - empty
      '', // Payment Status - empty
      accountNumber,
      bankName,
      accountName
    ];
  });

  // Build CSV content
  const csvContent = [
    row1Headers.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','),
    row2SubHeaders.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','),
    ...dataRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  // Include date range in filename if filtering
  let filename = 'paddy-trucks';
  if (dateFrom && dateTo && dateFrom === dateTo) {
    filename += `-${dateFrom}`;
  } else if (dateFrom || dateTo) {
    filename += `-${dateFrom || 'start'}-to-${dateTo || 'end'}`;
  } else {
    filename += `-${new Date().toISOString().split('T')[0]}`;
  }
  filename += '.csv';

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const importPaddyTrucksFromJSON = (file: File): Promise<PaddyTruck[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (!Array.isArray(data)) {
          throw new Error('Invalid file format. Expected an array of paddy trucks.');
        }
        
        // Validate each truck
        const validatedTrucks = data.map((truck: any) => {
          if (!truck.truckPlate || !truck.supplierName) {
            throw new Error('Invalid truck data. Missing required fields.');
          }
          
          return {
            ...truck,
            date: new Date(truck.date),
            createdAt: new Date(truck.createdAt || Date.now()),
            updatedAt: new Date(truck.updatedAt || Date.now())
          } as PaddyTruck;
        });
        
        resolve(validatedTrucks);
      } catch (error) {
        reject(new Error('Failed to parse JSON file. Please ensure it contains valid paddy truck data.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

// Formatting functions
export const formatWeight = (weight: number | undefined): string => {
  if (weight === undefined || weight === null) return '-';
  return `${Math.round(weight).toLocaleString()} kg`;
};

export const formatMoistureLevel = (moisture: number): string => {
  return `${moisture.toFixed(1)}%`;
};

export const formatCurrency = (amount: number): string => {
  return `₦${amount.toLocaleString()}`;
};

// Calculation functions
export const calculateWeightAfterDeduction = (netWeight?: number, deduction?: number): number => {
  return Math.round((netWeight || 0) - (deduction || 0));
};

export const calculateTotalAmount = (weightAfterDeduction: number, pricePerKg: number): number => {
  return weightAfterDeduction * pricePerKg;
};

// Copy text formatting
export const formatTruckDetailsForCopy = (truck: PaddyTruck): string => {
  const lines: string[] = [];

  // Format number with thousand separators
  const formatNumber = (num: number) => num.toLocaleString();

  // First line: ₦Price/kg - Net weight after deduction Kgs
  lines.push(`₦${formatNumber(truck.pricePerKg)}/kg - ${formatNumber(Math.round(truck.weightAfterDeduction))} Kgs`);

  // Second line: Supplier Name Bags (moisture level%)
  const bagsText = truck.bags ? `${truck.bags} Bags` : '';
  lines.push(`${truck.supplierName} ${bagsText} (${truck.moistureLevel}%)`);

  // Third line: *Truck Plate* (bold formatting for WhatsApp)
  lines.push(`*${truck.truckPlate}*`);

  // Fourth line: Deduction (only if it exists)
  if (truck.deduction && truck.deduction > 0) {
    lines.push(`Deduction: ${formatNumber(Math.round(truck.deduction))} Kgs`);
  }

  return lines.join('\n');
};

// Filter functions
export const filterPaddyTrucks = (
  trucks: PaddyTruck[],
  searchTerm: string,
  supplierFilter: string,
  dateFrom?: Date,
  dateTo?: Date
): PaddyTruck[] => {
  let filtered = [...trucks];
  
  // Search filter
  if (searchTerm) {
    const search = searchTerm.toLowerCase();
    filtered = filtered.filter(truck =>
      truck.truckPlate.toLowerCase().includes(search) ||
      truck.supplierName.toLowerCase().includes(search) ||
      truck.agent?.toLowerCase().includes(search) ||
      truck.waybillNumber?.toLowerCase().includes(search)
    );
  }
  
  // Supplier filter
  if (supplierFilter && supplierFilter !== 'all') {
    filtered = filtered.filter(truck => truck.supplierId === supplierFilter);
  }
  
  // Date range filter
  if (dateFrom) {
    filtered = filtered.filter(truck => new Date(truck.date) >= dateFrom);
  }
  if (dateTo) {
    filtered = filtered.filter(truck => new Date(truck.date) <= dateTo);
  }
  
  return filtered;
};

// Sort functions
export const sortPaddyTrucks = (
  trucks: PaddyTruck[],
  sortField: string,
  sortDirection: 'asc' | 'desc'
): PaddyTruck[] => {
  const sorted = [...trucks];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'date':
        // Primary sort by date
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();

        // If dates are the same, always sort by createdAt with most recent first
        // This secondary sort should NOT be affected by sortDirection
        if (comparison === 0) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }

        // Only apply sortDirection to the primary date comparison
        return sortDirection === 'asc' ? comparison : -comparison;

      case 'truckPlate':
        comparison = a.truckPlate.localeCompare(b.truckPlate);
        break;
      case 'supplier':
        comparison = a.supplierName.localeCompare(b.supplierName);
        break;
      case 'weight':
        comparison = a.weightAfterDeduction - b.weightAfterDeduction;
        break;
      case 'amount':
        comparison = a.totalAmount - b.totalAmount;
        break;
      default:
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return sorted;
};