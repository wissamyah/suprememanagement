import { githubDataManager } from '../services/githubDataManager';

// Data types that can be backed up
export type BackupDataType = 'products' | 'categories' | 'movements' | 'productionEntries' |
                             'customers' | 'sales' | 'ledgerEntries' | 'bookedStock' |
                             'loadings' | 'suppliers' | 'paddyTrucks';

export interface BackupMetadata {
  exportedAt: string;
  version: string;
  totalRecords: number;
  dataTypes: BackupDataType[];
  appVersion?: string;
}

export interface BackupData {
  products?: any[];
  categories?: any[];
  movements?: any[];
  productionEntries?: any[];
  customers?: any[];
  sales?: any[];
  ledgerEntries?: any[];
  bookedStock?: any[];
  loadings?: any[];
  suppliers?: any[];
  paddyTrucks?: any[];
  metadata: BackupMetadata;
}

export interface RestoreOptions {
  mode: 'replace' | 'merge' | 'append';
  preserveRelationships: boolean;
  validateIntegrity: boolean;
  selectedTypes?: BackupDataType[];
}

export interface RestoreResult {
  success: boolean;
  restoredTypes: BackupDataType[];
  recordCounts: Record<BackupDataType, number>;
  errors: string[];
  warnings: string[];
}

// Create a complete backup of all data
export const createBackup = (selectedTypes?: BackupDataType[]): BackupData => {
  const allTypes: BackupDataType[] = [
    'products', 'categories', 'movements', 'productionEntries',
    'customers', 'sales', 'ledgerEntries', 'bookedStock',
    'loadings', 'suppliers', 'paddyTrucks'
  ];

  const typesToBackup = selectedTypes || allTypes;
  const backup: BackupData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '2.0',
      totalRecords: 0,
      dataTypes: typesToBackup
    }
  };

  // Get data for each selected type
  typesToBackup.forEach(type => {
    const data = githubDataManager.getData(type);
    if (data && data.length > 0) {
      backup[type] = data;
      backup.metadata.totalRecords += data.length;
    }
  });

  return backup;
};

// Export backup to file
export const exportBackup = (backup: BackupData, filename?: string): void => {
  const dataStr = JSON.stringify(backup, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

  const exportFilename = filename || `supreme_backup_${new Date().toISOString().split('T')[0]}.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFilename);
  linkElement.click();
};

// Validate backup data integrity
export const validateBackup = (data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check basic structure
  if (!data || typeof data !== 'object') {
    errors.push('Invalid backup format: not an object');
    return { valid: false, errors };
  }

  // Check metadata
  if (!data.metadata) {
    errors.push('Missing metadata');
  } else {
    if (!data.metadata.version) errors.push('Missing version in metadata');
    if (!data.metadata.exportedAt) errors.push('Missing export date in metadata');
  }

  // Validate data types
  const validTypes: BackupDataType[] = [
    'products', 'categories', 'movements', 'productionEntries',
    'customers', 'sales', 'ledgerEntries', 'bookedStock',
    'loadings', 'suppliers', 'paddyTrucks'
  ];

  Object.keys(data).forEach(key => {
    if (key !== 'metadata' && !validTypes.includes(key as BackupDataType)) {
      errors.push(`Unknown data type: ${key}`);
    }
  });

  // Validate arrays
  validTypes.forEach(type => {
    if (data[type] !== undefined && !Array.isArray(data[type])) {
      errors.push(`${type} must be an array`);
    }
  });

  // Validate relationships if present
  if (data.sales && data.customers) {
    const customerIds = new Set(data.customers.map((c: any) => c.id));
    data.sales.forEach((sale: any, index: number) => {
      if (sale.customerId && !customerIds.has(sale.customerId)) {
        errors.push(`Sale ${index} references non-existent customer ${sale.customerId}`);
      }
    });
  }

  if (data.ledgerEntries && data.customers) {
    const customerIds = new Set(data.customers.map((c: any) => c.id));
    data.ledgerEntries.forEach((entry: any, index: number) => {
      if (entry.customerId && !customerIds.has(entry.customerId)) {
        errors.push(`Ledger entry ${index} references non-existent customer ${entry.customerId}`);
      }
    });
  }

  if (data.bookedStock && data.customers) {
    const customerIds = new Set(data.customers.map((c: any) => c.id));
    data.bookedStock.forEach((stock: any, index: number) => {
      if (stock.customerId && !customerIds.has(stock.customerId)) {
        errors.push(`Booked stock ${index} references non-existent customer ${stock.customerId}`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
};

// Restore data from backup
export const restoreBackup = async (
  backup: BackupData,
  options: RestoreOptions = {
    mode: 'replace',
    preserveRelationships: true,
    validateIntegrity: true
  }
): Promise<RestoreResult> => {
  const result: RestoreResult = {
    success: false,
    restoredTypes: [],
    recordCounts: {} as Record<BackupDataType, number>,
    errors: [],
    warnings: []
  };

  try {
    // Validate backup if requested
    if (options.validateIntegrity) {
      const validation = validateBackup(backup);
      if (!validation.valid) {
        result.errors = validation.errors;
        return result;
      }
    }

    // Determine which types to restore
    const typesToRestore = options.selectedTypes || backup.metadata.dataTypes;

    // Start batch update
    githubDataManager.startBatchUpdate();

    // Process each data type
    for (const type of typesToRestore) {
      const data = backup[type];
      if (!data || !Array.isArray(data)) continue;

      try {
        if (options.mode === 'replace') {
          // Replace all existing data
          await githubDataManager.updateData(type, data, true);
          result.recordCounts[type] = data.length;
        } else if (options.mode === 'merge') {
          // Merge with existing data
          const existingData = githubDataManager.getData(type);
          const existingIds = new Set(existingData.map((item: any) => item.id));

          const mergedData = [...existingData];
          let newCount = 0;
          let updatedCount = 0;

          data.forEach((item: any) => {
            if (existingIds.has(item.id)) {
              // Update existing item
              const index = mergedData.findIndex((existing: any) => existing.id === item.id);
              if (index !== -1) {
                mergedData[index] = item;
                updatedCount++;
              }
            } else {
              // Add new item
              mergedData.push(item);
              newCount++;
            }
          });

          await githubDataManager.updateData(type, mergedData, true);
          result.recordCounts[type] = newCount + updatedCount;

          if (updatedCount > 0) {
            result.warnings.push(`${type}: Updated ${updatedCount} existing records`);
          }
        } else if (options.mode === 'append') {
          // Append only new data (skip existing)
          const existingData = githubDataManager.getData(type);
          const existingIds = new Set(existingData.map((item: any) => item.id));

          const newData = data.filter((item: any) => !existingIds.has(item.id));
          const appendedData = [...existingData, ...newData];

          await githubDataManager.updateData(type, appendedData, true);
          result.recordCounts[type] = newData.length;

          const skipped = data.length - newData.length;
          if (skipped > 0) {
            result.warnings.push(`${type}: Skipped ${skipped} existing records`);
          }
        }

        result.restoredTypes.push(type);
      } catch (error) {
        result.errors.push(`Failed to restore ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // End batch update
    await githubDataManager.endBatchUpdate();

    result.success = result.errors.length === 0;
  } catch (error) {
    result.errors.push(`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
};

// Read backup file
export const readBackupFile = (file: File): Promise<BackupData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid backup file format'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read backup file'));
    };

    reader.readAsText(file);
  });
};

// Get backup summary
export const getBackupSummary = (backup: BackupData): string => {
  const lines: string[] = [];

  lines.push(`Backup created: ${new Date(backup.metadata.exportedAt).toLocaleString()}`);
  lines.push(`Version: ${backup.metadata.version}`);
  lines.push(`Total records: ${backup.metadata.totalRecords}`);
  lines.push('');
  lines.push('Data types:');

  const types: BackupDataType[] = [
    'products', 'categories', 'movements', 'productionEntries',
    'customers', 'sales', 'ledgerEntries', 'bookedStock',
    'loadings', 'suppliers', 'paddyTrucks'
  ];

  types.forEach(type => {
    const data = backup[type];
    if (data && Array.isArray(data)) {
      lines.push(`• ${type}: ${data.length} records`);
    }
  });

  return lines.join('\n');
};