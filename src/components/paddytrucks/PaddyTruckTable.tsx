import { useState, useMemo } from 'react';
import type { PaddyTruck } from '../../types';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  Truck,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckSquare,
  Square,
  RefreshCw,
  Weight,
  Copy,
  Check,
  DollarSign,
  Droplets
} from 'lucide-react';
import {
  formatWeight,
  formatMoistureLevel,
  formatCurrency,
  sortPaddyTrucks,
  filterPaddyTrucks,
  formatTruckDetailsForCopy
} from '../../utils/paddyTrucks';
import { formatDate } from '../../utils/dateFormatting';

interface PaddyTruckTableProps {
  paddyTrucks: PaddyTruck[];
  searchTerm: string;
  supplierFilter: string;
  dateFrom?: Date;
  dateTo?: Date;
  loading?: boolean;
  onEditTruck: (truck: PaddyTruck) => void;
  onDeleteTruck: (truckId: string) => void;
  refreshData?: () => void;
}

type SortField = 'date' | 'truckPlate' | 'supplier' | 'weight' | 'amount';
type SortDirection = 'asc' | 'desc';

export const PaddyTruckTable = ({
  paddyTrucks,
  searchTerm,
  supplierFilter,
  dateFrom,
  dateTo,
  loading,
  onEditTruck,
  onDeleteTruck,
  refreshData
}: PaddyTruckTableProps) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedTrucks, setSelectedTrucks] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; truck: PaddyTruck | null }>({ 
    show: false, 
    truck: null 
  });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [copiedTruckId, setCopiedTruckId] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedTrucks = useMemo(() => {
    const filtered = filterPaddyTrucks(paddyTrucks, searchTerm, supplierFilter, dateFrom, dateTo);
    return sortPaddyTrucks(filtered, sortField, sortDirection);
  }, [paddyTrucks, searchTerm, supplierFilter, dateFrom, dateTo, sortField, sortDirection]);

  const toggleSelectAll = () => {
    if (selectedTrucks.size === filteredAndSortedTrucks.length) {
      setSelectedTrucks(new Set());
    } else {
      setSelectedTrucks(new Set(filteredAndSortedTrucks.map(t => t.id)));
    }
  };

  const toggleSelectTruck = (truckId: string) => {
    const newSelected = new Set(selectedTrucks);
    if (newSelected.has(truckId)) {
      newSelected.delete(truckId);
    } else {
      newSelected.add(truckId);
    }
    setSelectedTrucks(newSelected);
  };

  const handleDeleteConfirm = (truck: PaddyTruck) => {
    setDeleteConfirm({ show: true, truck });
  };

  const handleDelete = () => {
    if (deleteConfirm.truck) {
      onDeleteTruck(deleteConfirm.truck.id);
      setDeleteConfirm({ show: false, truck: null });
    }
  };

  const handleCopyDetails = async (truck: PaddyTruck) => {
    const textToCopy = formatTruckDetailsForCopy(truck);
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedTruckId(truck.id);
      
      // Reset after 2 seconds
      setTimeout(() => {
        setCopiedTruckId(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleBulkDelete = () => {
    selectedTrucks.forEach(truckId => {
      onDeleteTruck(truckId);
    });
    setSelectedTrucks(new Set());
    setBulkDeleteConfirm(false);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp size={14} /> : 
      <ChevronDown size={14} />;
  };

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedTrucks.size > 0 && (
        <div className="glass p-3 rounded-lg mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="text-sm">
            {selectedTrucks.size} truck{selectedTrucks.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedTrucks(new Set())}
            >
              Clear
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setBulkDeleteConfirm(true)}
              className="text-red-400 hover:text-red-300"
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="sm:hidden">
        {filteredAndSortedTrucks.length === 0 ? (
          <div className="p-8 text-center text-muted">
            {searchTerm || supplierFilter !== 'all' ? 
              'No trucks found matching your filters' : 
              'No paddy trucks yet'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedTrucks.map((truck) => (
              <div 
                key={truck.id}
                className={`glass rounded-lg p-4 ${
                  selectedTrucks.has(truck.id) ? 'ring-2 ring-white/20' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => toggleSelectTruck(truck.id)}
                      className="p-1 rounded hover:bg-glass transition-colors mt-1"
                    >
                      {selectedTrucks.has(truck.id) ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                    <div className="flex-1">
                      <p className="font-medium text-base">{truck.truckPlate}</p>
                      <p className="text-sm text-muted">{truck.supplierName}</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-muted text-xs">Date:</span>
                    <p>{formatDate(truck.date)}</p>
                  </div>
                  <div>
                    <span className="text-muted text-xs">Agent:</span>
                    <p>{truck.agent || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted text-xs">Bags:</span>
                    <p>{truck.bags || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted text-xs">Weight:</span>
                    <p>{formatWeight(truck.weightAfterDeduction)}</p>
                  </div>
                  <div>
                    <span className="text-muted text-xs">Moisture:</span>
                    <p>{formatMoistureLevel(truck.moistureLevel)}</p>
                  </div>
                  <div>
                    <span className="text-muted text-xs">Price/kg:</span>
                    <p>{formatCurrency(truck.pricePerKg)}</p>
                  </div>
                  <div>
                    <span className="text-muted text-xs">Total:</span>
                    <p className="font-bold text-green-400">{formatCurrency(truck.totalAmount)}</p>
                  </div>
                </div>
                
                {truck.waybillNumber && (
                  <div className="text-sm mb-3">
                    <span className="text-muted text-xs">Waybill:</span>
                    <p>{truck.waybillNumber}</p>
                  </div>
                )}
                
                <div className="flex gap-1 justify-end border-t border-white/5 pt-3">
                  <button
                    onClick={() => handleCopyDetails(truck)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200 relative"
                    title="Copy Details"
                  >
                    <div className="relative w-4 h-4">
                      <Copy 
                        size={16} 
                        className={`absolute inset-0 transition-all duration-300 ${copiedTruckId === truck.id ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}
                      />
                      <Check 
                        size={16} 
                        className={`absolute inset-0 text-green-400 transition-all duration-300 ${copiedTruckId === truck.id ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                      />
                    </div>
                  </button>
                  <button
                    onClick={() => onEditTruck(truck)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200"
                    title="Edit Truck"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteConfirm(truck)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200"
                    title="Delete Truck"
                  >
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left py-3 px-3">
                <button
                  onClick={toggleSelectAll}
                  className="p-1 rounded hover:bg-glass transition-colors"
                >
                  {selectedTrucks.size === filteredAndSortedTrucks.length && 
                   filteredAndSortedTrucks.length > 0 ? (
                    <CheckSquare size={18} />
                  ) : (
                    <Square size={18} />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-3">
                <button
                  onClick={() => handleSort('date')}
                  className="flex items-center gap-1 hover:text-white/80 transition-colors"
                >
                  Date
                  <SortIcon field="date" />
                </button>
              </th>
              <th className="text-left py-3 px-3">
                <button
                  onClick={() => handleSort('truckPlate')}
                  className="flex items-center gap-1 hover:text-white/80 transition-colors"
                >
                  Truck Plate
                  <SortIcon field="truckPlate" />
                </button>
              </th>
              <th className="text-left py-3 px-3">
                <button
                  onClick={() => handleSort('supplier')}
                  className="flex items-center gap-1 hover:text-white/80 transition-colors"
                >
                  Supplier
                  <SortIcon field="supplier" />
                </button>
              </th>
              <th className="text-left py-3 px-3">Waybill</th>
              <th className="text-center py-3 px-3">Bags</th>
              <th className="text-right py-3 px-3">
                <button
                  onClick={() => handleSort('weight')}
                  className="flex items-center gap-1 hover:text-white/80 transition-colors ml-auto"
                >
                  Weight (kg)
                  <SortIcon field="weight" />
                </button>
              </th>
              <th className="text-center py-3 px-3">Moisture</th>
              <th className="text-right py-3 px-3">Price/kg</th>
              <th className="text-right py-3 px-3">
                <button
                  onClick={() => handleSort('amount')}
                  className="flex items-center gap-1 hover:text-white/80 transition-colors ml-auto"
                >
                  Total
                  <SortIcon field="amount" />
                </button>
              </th>
              <th className="text-left py-3 px-3">Agent</th>
              <th className="text-center py-3 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedTrucks.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-8 text-center text-muted">
                  {searchTerm || supplierFilter !== 'all' ? 
                    'No trucks found matching your filters' : 
                    'No paddy trucks yet'}
                </td>
              </tr>
            ) : (
              filteredAndSortedTrucks.map((truck) => (
                <tr 
                  key={truck.id}
                  className={`border-b border-white/5 hover:bg-glass/50 transition-colors ${
                    selectedTrucks.has(truck.id) ? 'bg-glass/50' : ''
                  }`}
                >
                  <td className="py-3 px-3">
                    <button
                      onClick={() => toggleSelectTruck(truck.id)}
                      className="p-1 rounded hover:bg-glass transition-colors"
                    >
                      {selectedTrucks.has(truck.id) ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm">{formatDate(truck.date)}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-medium text-sm">{truck.truckPlate}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm">{truck.supplierName}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm text-muted">{truck.waybillNumber || '-'}</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-sm">{truck.bags || '-'}</span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="text-sm">
                      {truck.netWeight && truck.deduction ? (
                        <div>
                          <div className="font-medium">{formatWeight(truck.weightAfterDeduction)}</div>
                          <div className="text-xs text-muted">
                            ({formatWeight(truck.netWeight)} - {formatWeight(truck.deduction)})
                          </div>
                        </div>
                      ) : (
                        <span className="font-medium">{formatWeight(truck.weightAfterDeduction)}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-sm">{formatMoistureLevel(truck.moistureLevel)}</span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-sm">{formatCurrency(truck.pricePerKg)}</span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="font-medium text-green-400 text-sm">{formatCurrency(truck.totalAmount)}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm">{truck.agent || '-'}</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex justify-center gap-0.5 sm:gap-1">
                      <button
                        onClick={() => handleCopyDetails(truck)}
                        className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-all duration-200 relative"
                        title="Copy Details"
                      >
                        <div className="relative w-3.5 h-3.5 sm:w-4 sm:h-4">
                          <Copy 
                            size={14} 
                            className={`absolute inset-0 sm:w-4 sm:h-4 transition-all duration-300 ${copiedTruckId === truck.id ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}
                          />
                          <Check 
                            size={14} 
                            className={`absolute inset-0 sm:w-4 sm:h-4 text-green-400 transition-all duration-300 ${copiedTruckId === truck.id ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                          />
                        </div>
                      </button>
                      <button
                        onClick={() => onEditTruck(truck)}
                        className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                        title="Edit Truck"
                      >
                        <Edit2 size={14} className="sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteConfirm(truck)}
                        className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                        title="Delete Truck"
                      >
                        <Trash2 size={14} className="sm:w-4 sm:h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Footer Info */}
      {filteredAndSortedTrucks.length > 0 && (
        <div className="mt-4 text-sm text-muted">
          Showing {filteredAndSortedTrucks.length} of {paddyTrucks.length} trucks
        </div>
      )}
      
      {/* Footer Actions */}
      {!loading && filteredAndSortedTrucks.length > 0 && (
        <div className="mt-4 text-sm">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Truck size={16} className="text-muted-text" />
              <span>Total: {filteredAndSortedTrucks.length} trucks</span>
            </div>
            <div className="flex items-center gap-2">
              <Weight size={16} className="text-muted-text" />
              <span>
                Total Weight: {formatWeight(
                  filteredAndSortedTrucks.reduce((sum, t) => sum + t.weightAfterDeduction, 0)
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-muted-text" />
              <span>
                Avg Price: {(() => {
                  const totalWeight = filteredAndSortedTrucks.reduce((sum, t) => sum + t.weightAfterDeduction, 0);
                  const totalValue = filteredAndSortedTrucks.reduce((sum, t) => sum + t.totalAmount, 0);
                  return totalWeight > 0 ? formatCurrency(totalValue / totalWeight) : formatCurrency(0);
                })()}/kg
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Droplets size={16} className="text-muted-text" />
              <span>
                Avg Moisture: {(() => {
                  const totalWeight = filteredAndSortedTrucks.reduce((sum, t) => sum + t.weightAfterDeduction, 0);
                  const weightedMoisture = filteredAndSortedTrucks.reduce((sum, t) => sum + (t.moistureLevel * t.weightAfterDeduction), 0);
                  return totalWeight > 0 ? formatMoistureLevel(weightedMoisture / totalWeight) : '0%';
                })()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && deleteConfirm.truck && (
        <ConfirmModal
          isOpen={deleteConfirm.show}
          onClose={() => setDeleteConfirm({ show: false, truck: null })}
          onConfirm={handleDelete}
          title="Delete Paddy Truck"
          message={
            <div>
              Are you sure you want to delete this truck record?
              <div className="mt-2 p-2 rounded bg-gray-800/50">
                <p className="text-sm">
                  <strong>Truck:</strong> {deleteConfirm.truck.truckPlate}
                </p>
                <p className="text-sm">
                  <strong>Supplier:</strong> {deleteConfirm.truck.supplierName}
                </p>
                <p className="text-sm">
                  <strong>Date:</strong> {formatDate(deleteConfirm.truck.date)}
                </p>
              </div>
            </div>
          }
          confirmText="Delete"
          type="danger"
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteConfirm && (
        <ConfirmModal
          isOpen={bulkDeleteConfirm}
          onClose={() => setBulkDeleteConfirm(false)}
          onConfirm={handleBulkDelete}
          title="Delete Multiple Trucks"
          message={`Are you sure you want to delete ${selectedTrucks.size} selected truck${
            selectedTrucks.size > 1 ? 's' : ''
          }? This action cannot be undone.`}
          confirmText="Delete All"
          type="danger"
        />
      )}
    </>
  );
};