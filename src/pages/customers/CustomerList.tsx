import { useState } from 'react';
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
  Users
} from 'lucide-react';
import { useCustomersWithGitHub } from '../../hooks/useCustomersWithGitHub';
import { useToast } from '../../hooks/useToast';
import { CustomerStats } from '../../components/customers/CustomerStats';
import { CustomerFilters } from '../../components/customers/CustomerFilters';
import { CustomerTable } from '../../components/customers/CustomerTable';
import { AddCustomerModal } from '../../components/customers/AddCustomerModal';
import { EditCustomerModal } from '../../components/customers/EditCustomerModal';
import { 
  exportCustomersToJSON, 
  exportCustomersToCSV,
  importCustomersFromJSON 
} from '../../utils/customers';
import type { Customer } from '../../types';

export const CustomerList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showImportExportMenu, setShowImportExportMenu] = useState(false);
  
  const {
    customers,
    loading,
    syncInProgress,
    pendingChanges,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getStatistics,
    forceSync,
    refreshData
  } = useCustomersWithGitHub();
  
  const { toasts, showSuccess, showError, removeToast } = useToast();
  
  const statistics = getStatistics();

  const handleAddCustomer = (
    name: string,
    phone: string,
    state: string,
    initialBalance: number
  ) => {
    const result = addCustomer(name, phone, state, initialBalance);
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
      if (result.warning) {
        showError(result.warning);
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
    // Navigate to bookings page when implemented
    showSuccess(`Bookings for ${customer.name} - Feature coming soon!`);
  };

  const handleExportJSON = () => {
    exportCustomersToJSON(customers);
    showSuccess('Customers exported to JSON');
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
      const importedCustomers = await importCustomersFromJSON(file);
      
      // Check for duplicates and add customers
      let successCount = 0;
      let duplicateCount = 0;
      
      for (const customer of importedCustomers) {
        const result = addCustomer(
          customer.name,
          customer.phone,
          customer.state,
          customer.balance
        );
        
        if (result.success) {
          successCount++;
        } else {
          duplicateCount++;
        }
      }
      
      if (successCount > 0) {
        showSuccess(`Imported ${successCount} customers successfully`);
      }
      
      if (duplicateCount > 0) {
        showError(`${duplicateCount} customers were duplicates and were skipped`);
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
        
        <div className="flex flex-wrap gap-2">
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
          <div className="relative order-2 sm:order-none">
            <Button
              variant="ghost"
              onClick={() => setShowImportExportMenu(!showImportExportMenu)}
            >
              <Download size={20} />
              <span className="hidden sm:inline">Import/Export</span>
            </Button>
            
            {showImportExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 glass rounded-lg shadow-xl z-10 overflow-hidden">
                <button
                  onClick={handleExportJSON}
                  className="w-full px-4 py-2 text-left hover:bg-glass flex items-center gap-2"
                >
                  <FileJson size={16} />
                  Export as JSON
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full px-4 py-2 text-left hover:bg-glass flex items-center gap-2"
                >
                  <FileText size={16} />
                  Export as CSV
                </button>
                <label className="w-full px-4 py-2 hover:bg-glass flex items-center gap-2 cursor-pointer">
                  <Upload size={16} />
                  Import from JSON
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
          
          {/* Add Customer Button */}
          <Button variant="primary" onClick={() => setShowAddModal(true)} className="order-1 sm:order-none">
            <Plus size={20} />
            <span className="hidden sm:inline">Add Customer</span>
            <span className="sm:hidden">Add</span>
          </Button>
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
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* Click outside to close menus */}
      {showImportExportMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowImportExportMenu(false)}
        />
      )}
    </div>
  );
};