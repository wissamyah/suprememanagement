// Inventory hook - always uses GitHub Direct mode
import { useInventoryDirect } from './useInventoryDirect';

export const useInventory = () => {
  // Always use GitHub Direct mode now
  return useInventoryDirect();
};