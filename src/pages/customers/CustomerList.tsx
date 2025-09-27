import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { ToastContainer } from '../../components/ui/Toast';
import { 
  Plus, 
  Download, 
  Upload, 
  FileJson, 
  FileText,
  RefreshCw,
  MoreVertical
} from 'lucide-react';
import { useDataContext } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import { CustomerStats } from '../../components/customers/CustomerStats';
import { CustomerFilters } from '../../components/customers/CustomerFilters';
import { CustomerTable } from '../../components/customers/CustomerTable';
import { AddCustomerModal } from '../../components/customers/AddCustomerModal';
import { EditCustomerModal } from '../../components/customers/EditCustomerModal';
import { CustomerBookingsModal } from '../../components/customers/CustomerBookingsModal';
import {
  exportCustomersToJSON,
  exportCustomersToCSV,
  importCustomersFromJSON,
  calculateCustomerBalance
} from '../../utils/customers';
import type { Customer } from '../../types';

export const CustomerList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingBookingsCustomer, setViewingBookingsCustomer] = useState<Customer | null>(null);
  const [showImportExportMenu, setShowImportExportMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Use customers data from DataContext
  const { customersHook } = useDataContext();
  const {
    customers,
    ledgerEntries,
    loading,
    syncInProgress,
    pendingChanges,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    importCustomers,
    importRelatedData,
    forceSync,
    refreshData
  } = customersHook;
  
  const { toasts, showSuccess, showError, removeToast } = useToast();

  // Calculate statistics using actual balances from ledger entries
  const statistics = useMemo(() => {
    const totalCustomers = customers.length;

    // Calculate actual balance for each customer from ledger entries
    const customersWithBalances = customers.map(customer => ({
      ...customer,
      actualBalance: calculateCustomerBalance(customer.id, ledgerEntries)
    }));

    const activeCustomers = customersWithBalances.filter(c => c.actualBalance > 0).length;
    const totalBalance = customersWithBalances.reduce((sum, c) => sum + c.actualBalance, 0);
    const totalPositiveBalance = customersWithBalances.reduce((sum, c) => Math.max(0, c.actualBalance) + sum, 0);
    const totalNegativeBalance = customersWithBalances.reduce((sum, c) => Math.min(0, c.actualBalance) + sum, 0);
    const customersWithDebt = customersWithBalances.filter(c => c.actualBalance > 0).length;

    return {
      totalCustomers,
      activeCustomers,
      totalBalance,
      totalPositiveBalance,
      totalNegativeBalance,
      customersWithDebt
    };
  }, [customers, ledgerEntries]);

  const handleAddCustomer = (
    name: string,
    phone: string,
    state: string,
    _initialBalance: number
  ) => {
    const result = addCustomer(name, phone, state);
    if (result.success) {
      showSuccess(`Customer "${name}" added successfully`);
      setShowAddModal(false);
    }
    return result;
  };

  const handleUpdateCustomer = (
    id: string,
    updates: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    const result = updateCustomer(id, updates);
    if (result.success) {
      showSuccess(`Customer updated successfully`);
      setEditingCustomer(null);
    }
    return result;
  };

  const handleDeleteCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    const result = deleteCustomer(customerId);
    
    if (result.success) {
      if (result.error) {
        showError(result.error);
      } else {
        showSuccess(`Customer "${customer?.name}" deleted`);
      }
    } else {
      showError('Failed to delete customer');
    }
  };

  const handleViewLedger = (customer: Customer) => {
    navigate(`/customers/ledger/${customer.id}`);
  };

  const handleViewBookings = (customer: Customer) => {
    setViewingBookingsCustomer(customer);
  };

  const handleExportJSON = (includeRelatedData: boolean = false) => {
    if (includeRelatedData) {
      // Export with related data (full backup)
      exportCustomersToJSON(customers, true, {
        ledgerEntries: ledgerEntries
      });
      showSuccess('Full backup exported with all related data');
    } else {
      // Export only customers
      exportCustomersToJSON(customers);
      showSuccess('Customers exported to JSON');
    }
    setShowImportExportMenu(false);
  };

  const handleExportCSV = () => {
    exportCustomersToCSV(customers);
    showSuccess('Customers exported to CSV');
    setShowImportExportMenu(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importResult = await importCustomersFromJSON(file);

      // Import customers with full data preservation
      const result = await importCustomers(importResult.customers, {
        mode: 'merge', // Merge mode: update existing, add new
        preserveExisting: false // Overwrite existing with imported data
      });

      // Import related data if it's a full backup
      if (importResult.isFullBackup && importResult.relatedData) {
        const relatedResult = await importRelatedData(importResult.relatedData);
        if (!relatedResult.success) {
          showError(relatedResult.error || 'Failed to import some related data');
        }
      }

      // Show results
      const messages: string[] = [];

      if (result.imported > 0) {
        messages.push(`${result.imported} new customers imported`);
      }

      if (result.updated > 0) {
        messages.push(`${result.updated} customers updated`);
      }

      if (result.skipped > 0) {
        messages.push(`${result.skipped} customers skipped`);
      }

      if (messages.length > 0) {
        showSuccess(messages.join(', '));
      }

      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(error => showError(error));
      }

      // If it was a full backup, show additional info
      if (importResult.isFullBackup) {
        showSuccess('Full backup restored with all related data');
      }
    } catch (error: any) {
      showError(error.message || 'Failed to import customers');
    }

    // Reset input
    e.target.value = '';
    setShowImportExportMenu(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Customers</h1>
          <p className="text-muted">Manage your customer information and relationships</p>
        </div>
        
        <div className="flex items-center gap-2 self-end sm:self-start">
          {/* Mobile dropdown menu */}
          <div className="relative mobile-menu-dropdown sm:hidden">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMobileMenu(!showMobileMenu);
              }}
              className="p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
              title="More Options"
            >
              <MoreVertical size={20} />
            </button>
            {showMobileMenu && (
              <div className="absolute right-0 top-full mt-2 rounded-lg shadow-xl z-50 py-1 min-w-[160px] bg-gray-900 border border-white/20 animate-fadeIn">
                {pendingChanges > 0 && !syncInProgress && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      forceSync();
                      setShowMobileMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Sync ({pendingChanges})
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportJSON(false);
                    setShowMobileMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <FileJson size={16} />
                  Export as JSON
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportJSON(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <FileJson size={16} />
                  Export Full Backup
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportCSV();
                    setShowMobileMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <FileText size={16} />
                  Export as CSV
                </button>
                <label className="w-full px-3 py-2 hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer">
                  <Upload size={16} />
                  <span className="text-sm">Import from JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      handleImport(e);
                      setShowMobileMenu(false);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
          
          {/* Desktop buttons */}
          <div className="hidden sm:flex gap-2">
            {/* Sync Status */}
            {syncInProgress && (
              <div className="flex items-center gap-2 px-3 py-2 glass rounded-lg">
                <RefreshCw className="animate-spin" size={16} />
                <span className="text-sm">Syncing...</span>
              </div>
            )}
            
            {pendingChanges > 0 && !syncInProgress && (
              <Button variant="ghost" onClick={forceSync}>
                <RefreshCw size={16} />
                Sync ({pendingChanges})
              </Button>
            )}
            
            {/* Import/Export Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setShowImportExportMenu(!showImportExportMenu)}
              >
                <Download size={20} />
                Import/Export
              </Button>
              
              {showImportExportMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 glass rounded-lg shadow-xl z-10 overflow-hidden">
                  <button
                    onClick={() => handleExportJSON(false)}
                    className="w-full px-4 py-2 text-left hover:bg-glass flex items-center gap-2"
                  >
                    <FileJson size={16} />
                    Export as JSON
                  </button>
                  <button
                    onClick={() => handleExportJSON(true)}
                    className="w-full px-4 py-2 text-left hover:bg-glass flex items-center gap-2"
                  >
                    <FileJson size={16} />
                    Export Full Backup
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="w-full px-4 py-2 text-left hover:bg-glass flex items-center gap-2"
                  >
                    <FileText size={16} />
                    Export as CSV
                  </button>
                  <div className="border-t border-white/10 my-1"></div>
                  <label className="w-full px-4 py-2 hover:bg-glass flex items-center gap-2 cursor-pointer">
                    <Upload size={16} />
                    Import / Restore Backup
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
          
          {/* Add Customer Button - perfect square on mobile */}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-white text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            title="Add Customer"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Customer</span>
          </button>
        </div>
      </div>
      
      {/* Statistics */}
      {loading ? (
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              </div>
              <p className="text-sm text-muted mt-3">Loading customers...</p>
            </div>
          </div>
        </div>
      ) : (
        <CustomerStats stats={statistics} loading={loading} />
      )}
      
      {/* Main Content Card */}
      <GlassCard>
        {/* Filters */}
        <div className="mb-4">
          <CustomerFilters
            searchTerm={searchTerm}
            stateFilter={stateFilter}
            balanceFilter={balanceFilter}
            onSearchChange={setSearchTerm}
            onStateChange={setStateFilter}
            onBalanceChange={setBalanceFilter}
          />
        </div>
        
        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              </div>
              <p className="text-sm text-muted mt-3">Syncing with GitHub...</p>
            </div>
          </div>
        ) : (
          <CustomerTable
            customers={customers}
            ledgerEntries={ledgerEntries}
            searchTerm={searchTerm}
            stateFilter={stateFilter}
            balanceFilter={balanceFilter}
            loading={false}
            onEditCustomer={setEditingCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onViewLedger={handleViewLedger}
            onViewBookings={handleViewBookings}
            refreshData={refreshData}
          />
        )}
      </GlassCard>
      
      {/* Modals */}
      <AddCustomerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddCustomer}
      />
      
      <EditCustomerModal
        isOpen={!!editingCustomer}
        customer={editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onUpdate={handleUpdateCustomer}
      />
      
      <CustomerBookingsModal
        isOpen={!!viewingBookingsCustomer}
        customer={viewingBookingsCustomer}
        onClose={() => setViewingBookingsCustomer(null)}
      />
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* Click outside to close menus */}
      {(showImportExportMenu || showMobileMenu) && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => {
            setShowImportExportMenu(false);
            setShowMobileMenu(false);
          }}
        />
      )}
    </div>
  );
};