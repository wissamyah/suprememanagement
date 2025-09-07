import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { InventoryMovement, Product } from '../../types';
import { 
  formatMovementType, 
  getMovementColor, 
  filterMovements,
  downloadFile
} from '../../utils/inventory';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';

interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  movements: InventoryMovement[];
}

export const MovementModal = ({
  isOpen,
  onClose,
  product,
  movements
}: MovementModalProps) => {
  const [filters, setFilters] = useState({
    movementType: '',
    dateFrom: '',
    dateTo: '',
    minQuantity: '',
    maxQuantity: '',
    searchTerm: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!isOpen) {
      setFilters({
        movementType: '',
        dateFrom: '',
        dateTo: '',
        minQuantity: '',
        maxQuantity: '',
        searchTerm: ''
      });
      setCurrentPage(1);
    }
  }, [isOpen]);

  const filteredMovements = useMemo(() => {
    const filtered = filterMovements(movements, {
      productId: product?.id,
      movementType: filters.movementType as InventoryMovement['movementType'] | undefined,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
      minQuantity: filters.minQuantity ? Number(filters.minQuantity) : undefined,
      maxQuantity: filters.maxQuantity ? Number(filters.maxQuantity) : undefined,
      searchTerm: filters.searchTerm
    });
    
    // Sort by date, newest first
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
  }, [movements, product, filters]);

  const paginatedMovements = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMovements.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMovements, currentPage]);

  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);

  const handleExport = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const jsonContent = JSON.stringify(filteredMovements, null, 2);
      downloadFile(jsonContent, `${product?.name || 'movements'}_history.json`, 'json');
    } else {
      const headers = ['Date', 'Type', 'Quantity', 'Previous', 'New', 'Reference', 'Notes'];
      const rows = filteredMovements.map(m => [
        new Date(m.date).toLocaleString(),
        formatMovementType(m.movementType),
        m.quantity.toString(),
        m.previousQuantity.toString(),
        m.newQuantity.toString(),
        m.reference || '',
        m.notes || ''
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      downloadFile(csvContent, `${product?.name || 'movements'}_history.csv`, 'csv');
    }
  };

  const getMovementIcon = (quantity: number) => {
    if (quantity > 0) return <TrendingUp size={16} className="text-green-400" />;
    if (quantity < 0) return <TrendingDown size={16} className="text-red-400" />;
    return <Activity size={16} className="text-yellow-400" />;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Movement History${product ? ` - ${product.name}` : ''}`}
      size="xl"
    >
      <div className="space-y-4">
        <div className="glass p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium flex items-center gap-2">
              <Filter size={18} />
              Filters
            </h3>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleExport('csv')}>
                <Download size={16} />
                CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleExport('json')}>
                <Download size={16} />
                JSON
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Movement Type</label>
              <select
                value={filters.movementType}
                onChange={(e) => setFilters({ ...filters, movementType: e.target.value })}
                className="w-full px-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm text-gray-100"
              >
                <option value="">All Types</option>
                <option value="production">Production</option>
                <option value="sales">Sales</option>
                <option value="loading">Loading</option>
                <option value="adjustment">Adjustment</option>
                <option value="return">Return</option>
                <option value="damage">Damage</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Min Quantity</label>
              <input
                type="number"
                value={filters.minQuantity}
                onChange={(e) => setFilters({ ...filters, minQuantity: e.target.value })}
                className="w-full px-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
                placeholder="Min"
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Max Quantity</label>
              <input
                type="number"
                value={filters.maxQuantity}
                onChange={(e) => setFilters({ ...filters, maxQuantity: e.target.value })}
                className="w-full px-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
                placeholder="Max"
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={16} />
                <input
                  type="text"
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
                  placeholder="Search notes..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800/50">
                <th className="text-left py-2 px-3 text-sm">Date/Time</th>
                <th className="text-left py-2 px-3 text-sm">Type</th>
                <th className="text-right py-2 px-3 text-sm">Quantity</th>
                <th className="text-right py-2 px-3 text-sm">Balance</th>
                <th className="text-left py-2 px-3 text-sm">Reference</th>
                <th className="text-left py-2 px-3 text-sm">Notes</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted">
                    <Activity size={32} className="mx-auto mb-2" />
                    No movements found
                  </td>
                </tr>
              ) : (
                paginatedMovements.map((movement) => (
                  <tr key={movement.id} className="border-b border-gray-800/30">
                    <td className="py-2 px-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-muted" />
                        {new Date(movement.date).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-sm font-medium ${getMovementColor(movement.movementType)}`}>
                        {formatMovementType(movement.movementType)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {getMovementIcon(movement.quantity)}
                        <span className={`text-sm font-medium ${
                          movement.quantity > 0 ? 'text-green-400' : 
                          movement.quantity < 0 ? 'text-red-400' : 
                          'text-yellow-400'
                        }`}>
                          {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right text-sm">
                      <div className="text-xs text-muted">
                        {movement.previousQuantity} → {movement.newQuantity}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-sm text-muted">
                      {movement.reference || '-'}
                    </td>
                    <td className="py-2 px-3 text-sm text-muted">
                      {movement.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredMovements.length)} of {filteredMovements.length} entries
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = currentPage > 3 ? currentPage - 2 + i : i + 1;
                  if (page > totalPages) return null;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        page === currentPage 
                          ? 'bg-white/20 text-white' 
                          : 'hover:bg-glass'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};