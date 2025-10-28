import type { NavigateFunction } from 'react-router-dom';
import type {
  Customer,
  Supplier,
  Product,
  Sale,
  Loading,
  PaddyTruck,
  EntityType
} from '../types';

/**
 * Navigation handler for global search results
 * Routes to appropriate detail pages based on entity type
 */
export const navigateToSearchResult = (
  navigate: NavigateFunction,
  type: EntityType,
  data: any
) => {
  switch (type) {
    case 'customer': {
      const customer = data as Customer;
      // Navigate to customer ledger page
      navigate(`/customers/ledger/${customer.id}`);
      break;
    }

    case 'supplier': {
      const supplier = data as Supplier;
      // Navigate to supplier list with state to highlight the supplier
      navigate('/suppliers', {
        state: { highlightId: supplier.id }
      });
      break;
    }

    case 'product': {
      const product = data as Product;
      // Navigate to inventory page with state to open product modal/highlight
      navigate('/inventory', {
        state: { openProductId: product.id }
      });
      break;
    }

    case 'sale': {
      const sale = data as Sale;
      // Navigate to sales page with state to open sale details
      navigate('/customers/sales', {
        state: { openSaleId: sale.id }
      });
      break;
    }

    case 'loading': {
      const loading = data as Loading;
      // Navigate to loadings page with state to open loading details
      navigate('/customers/loadings', {
        state: { openLoadingId: loading.id }
      });
      break;
    }

    case 'paddyTruck': {
      const paddyTruck = data as PaddyTruck;
      // Navigate to paddy trucks page with state to open truck details
      navigate('/suppliers/paddy-trucks', {
        state: { openTruckId: paddyTruck.id }
      });
      break;
    }

    default:
      console.warn('Unknown entity type for navigation:', type);
  }
};

/**
 * Get display name for entity type (for badges and labels)
 */
export const getEntityTypeLabel = (type: EntityType): string => {
  const labels: Record<EntityType, string> = {
    customer: 'Customer',
    supplier: 'Supplier',
    product: 'Product',
    sale: 'Sale',
    loading: 'Loading',
    paddyTruck: 'Paddy Truck'
  };
  return labels[type];
};

/**
 * Get icon for entity type (lucide-react icon names)
 */
export const getEntityTypeIcon = (type: EntityType): string => {
  const icons: Record<EntityType, string> = {
    customer: 'User',
    supplier: 'Users',
    product: 'Package',
    sale: 'ShoppingCart',
    loading: 'Truck',
    paddyTruck: 'TruckIcon'
  };
  return icons[type];
};

/**
 * Get color for entity type badge
 */
export const getEntityTypeColor = (type: EntityType): string => {
  const colors: Record<EntityType, string> = {
    customer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    supplier: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    product: 'bg-green-500/20 text-green-400 border-green-500/30',
    sale: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    loading: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    paddyTruck: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
  };
  return colors[type];
};
