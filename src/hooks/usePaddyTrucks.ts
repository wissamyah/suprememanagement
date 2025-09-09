// PaddyTrucks hook - always uses GitHub Direct mode
import { usePaddyTrucksDirect } from './usePaddyTrucksDirect';

export const usePaddyTrucks = () => {
  console.log('[PaddyTrucks] Using GitHub-direct mode (no localStorage)');
  return usePaddyTrucksDirect();
};