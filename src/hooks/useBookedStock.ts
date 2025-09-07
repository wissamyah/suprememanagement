// Booked stock hook - always uses GitHub Direct mode
import { useBookedStockDirect } from './useBookedStockDirect';

export const useBookedStock = () => {
  console.log('[BookedStock] Using GitHub-direct mode (no localStorage)');
  return useBookedStockDirect();
};