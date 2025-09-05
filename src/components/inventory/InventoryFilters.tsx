import { Search, X } from 'lucide-react';
import { Button } from '../ui/Button';
import type { ProductCategory } from '../../types';

interface InventoryFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  stockFilter: string;
  onStockFilterChange: (value: string) => void;
  categories: ProductCategory[];
  onClearFilters: () => void;
}

export const InventoryFilters = ({
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  stockFilter,
  onStockFilterChange,
  categories,
  onClearFilters
}: InventoryFiltersProps) => {
  const hasActiveFilters = searchTerm || categoryFilter || stockFilter;

  return (
    <div className="flex flex-col md:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={20} />
        <input
          type="text"
          placeholder="Search products by name..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-muted-text"
        />
      </div>

      <select
        value={categoryFilter}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 min-w-[150px] text-gray-100"
      >
        <option value="">All Categories</option>
        {categories.map(cat => (
          <option key={cat.id} value={cat.name}>
            {cat.name}
          </option>
        ))}
      </select>

      <select
        value={stockFilter}
        onChange={(e) => onStockFilterChange(e.target.value)}
        className="px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 min-w-[150px] text-gray-100"
      >
        <option value="">All Stock Levels</option>
        <option value="in-stock">In Stock</option>
        <option value="low-stock">Low Stock</option>
        <option value="out-of-stock">Out of Stock</option>
      </select>

      {hasActiveFilters && (
        <Button variant="ghost" onClick={onClearFilters}>
          <X size={20} />
          Clear
        </Button>
      )}
    </div>
  );
};