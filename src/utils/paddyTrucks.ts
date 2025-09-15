import type { PaddyTruck } from '../types';

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

export const exportPaddyTrucksToCSV = (paddyTrucks: PaddyTruck[]) => {
  const headers = [
    'Date',
    'Truck Plate',
    'Supplier',
    'Agent',
    'Waybill Number',
    'Bags',
    'Net Weight (kg)',
    'Deduction (kg)',
    'Weight After Deduction (kg)',
    'Moisture Level (%)',
    'Price per Kg',
    'Total Amount'
  ];

  const rows = paddyTrucks.map(truck => [
    new Date(truck.date).toLocaleDateString(),
    truck.truckPlate,
    truck.supplierName,
    truck.agent || '',
    truck.waybillNumber || '',
    truck.bags?.toString() || '',
    truck.netWeight?.toString() || '',
    truck.deduction?.toString() || '',
    truck.weightAfterDeduction.toString(),
    truck.moistureLevel.toString(),
    truck.pricePerKg.toString(),
    truck.totalAmount.toString()
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `paddy-trucks-${new Date().toISOString().split('T')[0]}.csv`);
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
  
  // First line: @Price/kg - Net weight after deduction Kgs
  lines.push(`@${formatNumber(truck.pricePerKg)}/kg - ${formatNumber(Math.round(truck.weightAfterDeduction))} Kgs`);
  
  // Second line: Supplier Name *Truck details* (moisture level%)
  lines.push(`${truck.supplierName} *${truck.truckPlate}* (${truck.moistureLevel}%)`);
  
  // Third line: Deduction (only if it exists)
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
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
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