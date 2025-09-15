// Sales hook - always uses GitHub Direct mode
import { useSalesDirect } from './useSalesDirect';

export const useSales = () => {
  return useSalesDirect();
};