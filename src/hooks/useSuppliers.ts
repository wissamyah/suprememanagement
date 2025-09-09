// Suppliers hook - always uses GitHub Direct mode
import { useSuppliersDirect } from './useSuppliersDirect';

export const useSuppliers = () => {
  console.log('[Suppliers] Using GitHub-direct mode (no localStorage)');
  return useSuppliersDirect();
};