// Customers hook - always uses GitHub Direct mode
import { useCustomersDirect } from './useCustomersDirect';

export const useCustomers = () => {
  console.log('[Customers] Using GitHub-direct mode (no localStorage)');
  return useCustomersDirect();
};