// Sales hook - always uses GitHub Direct mode
import { useSalesDirect } from './useSalesDirect';

export const useSales = () => {
  console.log('[Sales] Using GitHub-direct mode (no localStorage)');
  return useSalesDirect();
};