import { useMemo, useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import { useCustomersDirect } from './useCustomersDirect';
import { useSuppliersDirect } from './useSuppliersDirect';
import { useInventoryDirect } from './useInventoryDirect';
import { useSalesDirect } from './useSalesDirect';
import { useLoadingsDirect } from './useLoadingsDirect';
import { usePaddyTrucksDirect } from './usePaddyTrucksDirect';
import { useBookedStockDirect } from './useBookedStockDirect';
import type {
  GroupedSearchResults
} from '../types';

export const useGlobalSearch = (query: string, debounceMs: number = 300) => {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Fetch all data using Direct hooks
  const { customers, loading: customersLoading } = useCustomersDirect();
  const { suppliers, loading: suppliersLoading } = useSuppliersDirect();
  const { products, loading: productsLoading } = useInventoryDirect();
  const { sales, loading: salesLoading } = useSalesDirect();
  const { loadings, loading: loadingsLoading } = useLoadingsDirect();
  const { paddyTrucks, loading: paddyTrucksLoading } = usePaddyTrucksDirect();
  const { bookedStock, loading: bookedStockLoading } = useBookedStockDirect();

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Configure Fuse.js for each entity type
  const customersFuse = useMemo(() => {
    return new Fuse(customers, {
      keys: ['name', 'phone', 'state'],
      threshold: 0.3, // Lower = more strict, higher = more fuzzy
      includeScore: true,
      ignoreLocation: true
    });
  }, [customers]);

  const suppliersFuse = useMemo(() => {
    return new Fuse(suppliers, {
      keys: ['name', 'phone', 'agent'],
      threshold: 0.3,
      includeScore: true,
      ignoreLocation: true
    });
  }, [suppliers]);

  const productsFuse = useMemo(() => {
    return new Fuse(products, {
      keys: ['name', 'category'],
      threshold: 0.3,
      includeScore: true,
      ignoreLocation: true
    });
  }, [products]);

  const salesFuse = useMemo(() => {
    return new Fuse(sales, {
      keys: ['orderId', 'customerName'],
      threshold: 0.3,
      includeScore: true,
      ignoreLocation: true
    });
  }, [sales]);

  const loadingsFuse = useMemo(() => {
    return new Fuse(loadings, {
      keys: ['loadingId', 'customerName', 'truckPlateNumber', 'wayBillNumber'],
      threshold: 0.3,
      includeScore: true,
      ignoreLocation: true
    });
  }, [loadings]);

  const paddyTrucksFuse = useMemo(() => {
    return new Fuse(paddyTrucks, {
      keys: ['truckPlate', 'supplierName', 'agent', 'waybillNumber'],
      threshold: 0.3,
      includeScore: true,
      ignoreLocation: true
    });
  }, [paddyTrucks]);

  // Perform search across all entities
  const results: GroupedSearchResults = useMemo(() => {
    // Return empty results if query is too short
    if (debouncedQuery.trim().length < 2) {
      return {
        customers: [],
        suppliers: [],
        products: [],
        sales: [],
        loadings: [],
        paddyTrucks: []
      };
    }

    // Search each entity type
    const customerResults = customersFuse.search(debouncedQuery).map(result => ({
      type: 'customer' as const,
      data: result.item,
      score: result.score
    }));

    const supplierResults = suppliersFuse.search(debouncedQuery).map(result => ({
      type: 'supplier' as const,
      data: result.item,
      score: result.score
    }));

    const productResults = productsFuse.search(debouncedQuery).map(result => ({
      type: 'product' as const,
      data: result.item,
      score: result.score
    }));

    const saleResults = salesFuse.search(debouncedQuery).map(result => ({
      type: 'sale' as const,
      data: result.item,
      score: result.score
    }));

    const loadingResults = loadingsFuse.search(debouncedQuery).map(result => ({
      type: 'loading' as const,
      data: result.item,
      score: result.score
    }));

    const paddyTruckResults = paddyTrucksFuse.search(debouncedQuery).map(result => ({
      type: 'paddyTruck' as const,
      data: result.item,
      score: result.score
    }));

    return {
      customers: customerResults,
      suppliers: supplierResults,
      products: productResults,
      sales: saleResults,
      loadings: loadingResults,
      paddyTrucks: paddyTruckResults
    };
  }, [
    debouncedQuery,
    customersFuse,
    suppliersFuse,
    productsFuse,
    salesFuse,
    loadingsFuse,
    paddyTrucksFuse
  ]);

  // Calculate total results count
  const totalResults = useMemo(() => {
    return (
      results.customers.length +
      results.suppliers.length +
      results.products.length +
      results.sales.length +
      results.loadings.length +
      results.paddyTrucks.length
    );
  }, [results]);

  // Check if any data is still loading
  const loading =
    customersLoading ||
    suppliersLoading ||
    productsLoading ||
    salesLoading ||
    loadingsLoading ||
    paddyTrucksLoading ||
    bookedStockLoading;

  return {
    results,
    totalResults,
    loading,
    isSearching: query !== debouncedQuery, // True if debounce is in progress
    hasQuery: debouncedQuery.trim().length >= 2,
    bookedStock // Return booked stock for product result enhancement
  };
};
