// Loadings hook - always uses GitHub Direct mode
import { useLoadingsDirect } from './useLoadingsDirect';

export const useLoadings = () => {
  return useLoadingsDirect();
};