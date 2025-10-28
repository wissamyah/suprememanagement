import { useState, useMemo } from 'react';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  User,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Users,
  RefreshCw,
  StickyNote
} from 'lucide-react';
import { filterSuppliers, sortSuppliers, formatPhoneNumber } from '../../utils/suppliers';
import type { Supplier } from '../../types';

interface SupplierTableProps {
  suppliers: Supplier[];
  searchTerm: string;
  agentFilter: string;
  loading: boolean;
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplierId: string) => void;
  onNotesSupplier: (supplier: Supplier) => void;
  refreshData: () => void;
  highlightId?: string | null;
}

type SortField = 'name' | 'agent';
type SortDirection = 'asc' | 'desc';

export const SupplierTable = ({
  suppliers,
  searchTerm,
  agentFilter,
  loading,
  onEditSupplier,
  onDeleteSupplier,
  onNotesSupplier,
  refreshData,
  highlightId
}: SupplierTableProps) => {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; supplier: Supplier | null }>({ 
    show: false, 
    supplier: null 
  });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDeleteConfirm = (supplier: Supplier) => {
    setDeleteConfirm({ show: true, supplier });
  };

  const handleDelete = () => {
    if (deleteConfirm.supplier) {
      onDeleteSupplier(deleteConfirm.supplier.id);
      setDeleteConfirm({ show: false, supplier: null });
    }
  };

  const handleBulkDelete = () => {
    selectedSuppliers.forEach(supplierId => {
      onDeleteSupplier(supplierId);
    });
    setSelectedSuppliers(new Set());
    setBulkDeleteConfirm(false);
  };

  // Filter and sort suppliers
  const processedSuppliers = useMemo(() => {
    const filtered = filterSuppliers(suppliers, searchTerm, agentFilter);
    return sortSuppliers(filtered, sortField, sortDirection);
  }, [suppliers, searchTerm, agentFilter, sortField, sortDirection]);

  const toggleSelectAll = () => {
    if (selectedSuppliers.size === processedSuppliers.length) {
      setSelectedSuppliers(new Set());
    } else {
      setSelectedSuppliers(new Set(processedSuppliers.map(s => s.id)));
    }
  };

  const toggleSelectSupplier = (supplierId: string) => {
    const newSelected = new Set(selectedSuppliers);
    if (newSelected.has(supplierId)) {
      newSelected.delete(supplierId);
    } else {
      newSelected.add(supplierId);
    }
    setSelectedSuppliers(newSelected);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp size={14} /> : 
      <ChevronDown size={14} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-3">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          </div>
          <p className="text-sm text-muted mt-3">Loading suppliers...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedSuppliers.size > 0 && (
        <div className="glass p-3 rounded-lg mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="text-sm">
            {selectedSuppliers.size} supplier{selectedSuppliers.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedSuppliers(new Set())}
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
        {processedSuppliers.length === 0 ? (
          <div className="p-8 text-center text-muted">
            {searchTerm || agentFilter !== 'all' ? 
              'No suppliers found matching your filters' : 
              'No suppliers yet'}
          </div>
        ) : (
          <div className="space-y-3">
            {processedSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                className={`glass rounded-lg p-4 transition-all duration-300 ${
                  highlightId === supplier.id
                    ? 'ring-2 ring-blue-400/50 bg-blue-500/10'
                    : selectedSuppliers.has(supplier.id)
                    ? 'ring-2 ring-white/20'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => toggleSelectSupplier(supplier.id)}
                      className="p-1 rounded hover:bg-glass transition-colors mt-1"
                    >
                      {selectedSuppliers.has(supplier.id) ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                    <div className="flex-1">
                      <p className="font-medium text-base">{supplier.name}</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-muted text-xs">Phone:</span>
                    <p>{formatPhoneNumber(supplier.phone)}</p>
                  </div>
                  <div>
                    <span className="text-muted text-xs">Agent:</span>
                    <p>{supplier.agent}</p>
                  </div>
                </div>
                
                <div className="flex gap-1 justify-end border-t border-white/5 pt-3">
                  <button
                    onClick={() => onNotesSupplier(supplier)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200"
                    title="View Notes"
                  >
                    <StickyNote size={16} className={supplier.notes ? 'text-blue-400' : ''} />
                  </button>
                  <button
                    onClick={() => onEditSupplier(supplier)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200"
                    title="Edit Supplier"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteConfirm(supplier)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200"
                    title="Delete Supplier"
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
                  {selectedSuppliers.size === processedSuppliers.length && 
                   processedSuppliers.length > 0 ? (
                    <CheckSquare size={18} />
                  ) : (
                    <Square size={18} />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-3 font-medium text-sm">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  Name
                  <SortIcon field="name" />
                </button>
              </th>
              <th className="text-left py-3 px-3 font-medium text-sm">Phone</th>
              <th className="text-left py-3 px-3 font-medium text-sm">
                <button
                  onClick={() => handleSort('agent')}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  Agent
                  <SortIcon field="agent" />
                </button>
              </th>
              <th className="text-center py-3 px-3 font-medium text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {processedSuppliers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted">
                  {searchTerm || agentFilter !== 'all' ? 
                    'No suppliers found matching your filters' : 
                    'No suppliers yet'}
                </td>
              </tr>
            ) : (
              processedSuppliers.map((supplier) => (
                <tr
                  key={supplier.id}
                  className={`border-b border-white/5 hover:bg-glass/50 transition-all duration-300 ${
                    highlightId === supplier.id
                      ? 'bg-blue-500/10 ring-2 ring-blue-400/50'
                      : selectedSuppliers.has(supplier.id)
                      ? 'bg-white/5'
                      : ''
                  }`}
                >
                  <td className="py-3 px-3">
                    <button
                      onClick={() => toggleSelectSupplier(supplier.id)}
                      className="p-1 rounded hover:bg-glass transition-colors"
                    >
                      {selectedSuppliers.has(supplier.id) ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 glass rounded-lg">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="font-medium">{supplier.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm">{formatPhoneNumber(supplier.phone)}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm">{supplier.agent}</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex justify-center gap-0.5 sm:gap-1">
                      <button
                        onClick={() => onNotesSupplier(supplier)}
                        className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-all duration-200 relative"
                        title="View Notes"
                      >
                        <StickyNote size={14} className={`sm:w-4 sm:h-4 ${supplier.notes ? 'text-blue-400' : ''}`} />
                        {supplier.notes && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full"></span>
                        )}
                      </button>
                      <button
                        onClick={() => onEditSupplier(supplier)}
                        className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                        title="Edit Supplier"
                      >
                        <Edit2 size={14} className="sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteConfirm(supplier)}
                        className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                        title="Delete Supplier"
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

      {/* Footer Actions */}
      {!loading && suppliers.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-muted-text" />
            <span>Total: {suppliers.length} suppliers</span>
          </div>
          {refreshData && (
            <Button variant="ghost" size="sm" onClick={refreshData}>
              <RefreshCw size={14} />
              Refresh
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && deleteConfirm.supplier && (
        <ConfirmModal
          isOpen={deleteConfirm.show}
          onClose={() => setDeleteConfirm({ show: false, supplier: null })}
          onConfirm={handleDelete}
          title="Delete Supplier"
          message={
            <div>
              Are you sure you want to delete <strong>{deleteConfirm.supplier.name}</strong>?
              <div className="mt-2 p-2 rounded bg-amber-500/10">
                <p className="text-sm text-amber-400">
                  This action cannot be undone. All supplier information will be permanently removed.
                </p>
              </div>
              <div className="mt-2 space-y-1 text-sm text-muted">
                <p><strong>Phone:</strong> {formatPhoneNumber(deleteConfirm.supplier.phone)}</p>
                <p><strong>Agent:</strong> {deleteConfirm.supplier.agent}</p>
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
          title="Delete Multiple Suppliers"
          message={
            <div>
              Are you sure you want to delete <strong>{selectedSuppliers.size} suppliers</strong>?
              <div className="mt-2 p-2 rounded bg-amber-500/10">
                <p className="text-sm text-amber-400">
                  This action cannot be undone. All selected suppliers will be permanently removed.
                </p>
              </div>
            </div>
          }
          confirmText={`Delete ${selectedSuppliers.size} Suppliers`}
          type="danger"
        />
      )}
    </>
  );
};