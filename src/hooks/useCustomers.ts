// Customers hook - always uses GitHub Direct mode
import { useCustomersDirect } from './useCustomersDirect';

export const useCustomers = () => {
  return useCustomersDirect();
};