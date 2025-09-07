// Loadings hook - always uses GitHub Direct mode
import { useLoadingsDirect } from './useLoadingsDirect';

export const useLoadings = () => {
  console.log('[Loadings] Using GitHub-direct mode (no localStorage)');
  return useLoadingsDirect();
};