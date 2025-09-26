import type { Loading } from '../types';
import { formatDate } from './dateFormatting';

export const fixDuplicateLoadingIds = (loadings: Loading[]): Loading[] => {
  // Create a map to track loading IDs and their occurrences
  const idOccurrences = new Map<string, Loading[]>();

  // Group loadings by their loadingId
  loadings.forEach(loading => {
    const existing = idOccurrences.get(loading.loadingId) || [];
    existing.push(loading);
    idOccurrences.set(loading.loadingId, existing);
  });

  // Find the highest loading number to continue from
  let maxLoadingNumber = 0;
  loadings.forEach(loading => {
    const match = loading.loadingId.match(/^LD(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxLoadingNumber) {
        maxLoadingNumber = num;
      }
    }
  });

  // Fix duplicates
  const fixedLoadings = [...loadings];
  const duplicateReport: string[] = [];

  idOccurrences.forEach((duplicates, loadingId) => {
    if (duplicates.length > 1) {
      // Sort duplicates by creation date to preserve the original one
      duplicates.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Keep the first one, renumber the rest
      for (let i = 1; i < duplicates.length; i++) {
        maxLoadingNumber++;
        const newLoadingId = `LD${String(maxLoadingNumber).padStart(6, '0')}`;

        // Find and update in the fixed array
        const index = fixedLoadings.findIndex(l => l.id === duplicates[i].id);
        if (index !== -1) {
          fixedLoadings[index] = {
            ...fixedLoadings[index],
            loadingId: newLoadingId,
            updatedAt: new Date().toISOString()
          };

          duplicateReport.push(
            `Fixed duplicate: ${loadingId} (${duplicates[i].customerName}, ${formatDate(duplicates[i].date)}) → ${newLoadingId}`
          );
        }
      }
    }
  });

  // Log the report if any fixes were made
  if (duplicateReport.length > 0) {
    console.log('🔧 Fixed duplicate loading IDs:');
    duplicateReport.forEach(report => console.log(`  - ${report}`));
    console.log(`✅ Fixed ${duplicateReport.length} duplicate loading IDs`);
  }

  return fixedLoadings;
};

export const hasDuplicateLoadingIds = (loadings: Loading[]): boolean => {
  const idSet = new Set<string>();
  for (const loading of loadings) {
    if (idSet.has(loading.loadingId)) {
      return true;
    }
    idSet.add(loading.loadingId);
  }
  return false;
};