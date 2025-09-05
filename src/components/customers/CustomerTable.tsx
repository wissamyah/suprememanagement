import { useState, useMemo } from 'react';
import type { Customer } from '../../types';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import { 
  User,
  Edit2,
  Trash2,
  Package,
  ChevronUp,
  ChevronDown,
  CheckSquare,
  Square,
  FileText,
  Users,
  RefreshCw
} from 'lucide-react';
import { 
  formatCurrency, 
  formatPhoneNumber,
  getBalanceColor,
  getBalanceBackgroundColor,
  sortCustomers,
  filterCustomers
} from '../../utils/customers';

interface CustomerTableProps {
  customers: Customer[];
  searchTerm: string;
  stateFilter: string;
  balanceFilter: string;
  loading?: boolean;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
  onViewLedger: (customer: Customer) => void;
  onViewBookings: (customer: Customer) => void;
  refreshData?: () => void;
}

type SortField = 'name' | 'state' | 'balance';
type SortDirection = 'asc' | 'desc';

export const CustomerTable = ({
  customers,
  searchTerm,
  stateFilter,
  balanceFilter,
  loading,
  onEditCustomer,
  onDeleteCustomer,
  onViewLedger,
  onViewBookings,
  refreshData
}: CustomerTableProps) => {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; customer: Customer | null }>({ 
    show: false, 
    customer: null 
  });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedCustomers = useMemo(() => {
    const filtered = filterCustomers(customers, searchTerm, stateFilter, balanceFilter);
    return sortCustomers(filtered, sortField, sortDirection);
  }, [customers, searchTerm, stateFilter, balanceFilter, sortField, sortDirection]);

  const toggleSelectAll = () => {
    if (selectedCustomers.size === filteredAndSortedCustomers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(filteredAndSortedCustomers.map(c => c.id)));
    }
  };

  const toggleSelectCustomer = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const handleDeleteConfirm = (customer: Customer) => {
    setDeleteConfirm({ show: true, customer });
  };

  const handleDelete = () => {
    if (deleteConfirm.customer) {
      onDeleteCustomer(deleteConfirm.customer.id);
      setDeleteConfirm({ show: false, customer: null });
    }
  };

  const handleBulkDelete = () => {
    selectedCustomers.forEach(customerId => {
      onDeleteCustomer(customerId);
    });
    setSelectedCustomers(new Set());
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
      {selectedCustomers.size > 0 && (
        <div className="glass p-3 rounded-lg mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="text-sm">
            {selectedCustomers.size} customer{selectedCustomers.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedCustomers(new Set())}
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
        {filteredAndSortedCustomers.length === 0 ? (
          <div className="p-8 text-center text-muted">
            {searchTerm || stateFilter || balanceFilter ? 
              'No customers found matching your filters' : 
              'No customers yet'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedCustomers.map((customer) => (
              <div 
                key={customer.id}
                className={`glass rounded-lg p-4 ${
                  selectedCustomers.has(customer.id) ? 'ring-2 ring-white/20' : ''
                } ${getBalanceBackgroundColor(customer.balance)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => toggleSelectCustomer(customer.id)}
                      className="p-1 rounded hover:bg-glass transition-colors mt-1"
                    >
                      {selectedCustomers.has(customer.id) ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                    <div className="flex-1">
                      <p className="font-medium text-base">{customer.name}</p>
                      <p className="text-xs text-muted mt-1">ID: {customer.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <span className={`font-bold text-lg ${getBalanceColor(customer.balance)}`}>
                    {formatCurrency(customer.balance)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-muted text-xs">Phone:</span>
                    <p>{formatPhoneNumber(customer.phone)}</p>
                  </div>
                  <div>
                    <span className="text-muted text-xs">State:</span>
                    <p>{customer.state}</p>
                  </div>
                </div>
                
                <div className="flex gap-1 justify-end border-t border-white/5 pt-3">
                  <button
                    onClick={() => onEditCustomer(customer)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200"
                    title="Edit Customer"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => onViewLedger(customer)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200"
                    title="View Ledger"
                  >
                    <FileText size={16} />
                  </button>
                  <button
                    onClick={() => onViewBookings(customer)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200"
                    title="View Bookings"
                  >
                    <Package size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteConfirm(customer)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200"
                    title="Delete Customer"
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
                  {selectedCustomers.size === filteredAndSortedCustomers.length && 
                   filteredAndSortedCustomers.length > 0 ? (
                    <CheckSquare size={18} />
                  ) : (
                    <Square size={18} />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-3">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-white/80 transition-colors"
                >
                  Customer
                  <SortIcon field="name" />
                </button>
              </th>
              <th className="text-left py-3 px-3">Phone</th>
              <th className="text-left py-3 px-3">
                <button
                  onClick={() => handleSort('state')}
                  className="flex items-center gap-1 hover:text-white/80 transition-colors"
                >
                  State
                  <SortIcon field="state" />
                </button>
              </th>
              <th className="text-right py-3 px-3">
                <button
                  onClick={() => handleSort('balance')}
                  className="flex items-center gap-1 hover:text-white/80 transition-colors ml-auto"
                >
                  Balance
                  <SortIcon field="balance" />
                </button>
              </th>
              <th className="text-center py-3 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedCustomers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted">
                  {searchTerm || stateFilter || balanceFilter ? 
                    'No customers found matching your filters' : 
                    'No customers yet'}
                </td>
              </tr>
            ) : (
              filteredAndSortedCustomers.map((customer) => (
                <tr 
                  key={customer.id}
                  className={`border-b border-white/5 hover:bg-glass/50 transition-colors ${
                    selectedCustomers.has(customer.id) ? 'bg-glass/50' : ''
                  } ${getBalanceBackgroundColor(customer.balance)}`}
                >
                  <td className="py-3 px-3">
                    <button
                      onClick={() => toggleSelectCustomer(customer.id)}
                      className="p-1 rounded hover:bg-glass transition-colors"
                    >
                      {selectedCustomers.has(customer.id) ? (
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
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-xs text-muted">
                          ID: {customer.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm">{formatPhoneNumber(customer.phone)}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm">{customer.state}</span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`font-medium ${getBalanceColor(customer.balance)}`}>
                      {formatCurrency(customer.balance)}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex justify-center gap-0.5 sm:gap-1">
                      <button
                        onClick={() => onEditCustomer(customer)}
                        className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                        title="Edit Customer"
                      >
                        <Edit2 size={14} className="sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => onViewLedger(customer)}
                        className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                        title="View Ledger"
                      >
                        <FileText size={14} className="sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => onViewBookings(customer)}
                        className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                        title="View Bookings"
                      >
                        <Package size={14} className="sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteConfirm(customer)}
                        className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                        title="Delete Customer"
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
      {filteredAndSortedCustomers.length > 0 && (
        <div className="mt-4 text-sm text-muted">
          Showing {filteredAndSortedCustomers.length} of {customers.length} customers
        </div>
      )}
      
      {/* Footer Actions */}
      {!loading && customers.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-muted-text" />
            <span>Total: {customers.length} customers</span>
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
      {deleteConfirm.show && deleteConfirm.customer && (
        <ConfirmModal
          isOpen={deleteConfirm.show}
          onClose={() => setDeleteConfirm({ show: false, customer: null })}
          onConfirm={handleDelete}
          title="Delete Customer"
          message={
            <div>
              Are you sure you want to delete <strong>{deleteConfirm.customer.name}</strong>?
              {deleteConfirm.customer.balance !== 0 && (
                <div className={`mt-2 p-2 rounded ${
                  deleteConfirm.customer.balance > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}>
                  <p className="text-sm">
                    This customer has an outstanding balance of{' '}
                    <span className={`font-semibold ${getBalanceColor(deleteConfirm.customer.balance)}`}>
                      {formatCurrency(deleteConfirm.customer.balance)}
                    </span>
                  </p>
                </div>
              )}
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
          title="Delete Multiple Customers"
          message={`Are you sure you want to delete ${selectedCustomers.size} selected customer${
            selectedCustomers.size > 1 ? 's' : ''
          }? This action cannot be undone.`}
          confirmText="Delete All"
          type="danger"
        />
      )}
    </>
  );
};