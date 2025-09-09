import { useState } from 'react';
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
import { useSuppliers } from '../../hooks/useSuppliers';
import { useToast } from '../../hooks/useToast';
import { SupplierStats } from '../../components/suppliers/SupplierStats';
import { SupplierFilters } from '../../components/suppliers/SupplierFilters';
import { SupplierTable } from '../../components/suppliers/SupplierTable';
import { AddSupplierModal } from '../../components/suppliers/AddSupplierModal';
import { EditSupplierModal } from '../../components/suppliers/EditSupplierModal';
import { 
  exportSuppliersToJSON, 
  exportSuppliersToCSV,
  importSuppliersFromJSON 
} from '../../utils/suppliers';
import type { Supplier } from '../../types';

export const SupplierList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showImportExportMenu, setShowImportExportMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const {
    suppliers,
    loading,
    syncInProgress,
    pendingChanges,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getStatistics,
    forceSync,
    refreshData
  } = useSuppliers();
  
  const { toasts, showSuccess, showError, removeToast } = useToast();
  
  const statistics = getStatistics();
  
  // Get unique agents for filter
  const uniqueAgents = Array.from(new Set(suppliers.map(s => s.agent))).sort();

  const handleAddSupplier = (
    name: string,
    phone: string,
    agent: string
  ) => {
    const result = addSupplier(name, phone, agent);
    if (result.success) {
      showSuccess(`Supplier "${name}" added successfully`);
      setShowAddModal(false);
    }
    return result;
  };

  const handleUpdateSupplier = (
    id: string,
    updates: Partial<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    const result = updateSupplier(id, updates);
    if (result.success) {
      showSuccess(`Supplier updated successfully`);
      setEditingSupplier(null);
    }
    return result;
  };

  const handleDeleteSupplier = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    const result = deleteSupplier(supplierId);
    
    if (result.success) {
      if (result.error) {
        showError(result.error);
      } else {
        showSuccess(`Supplier "${supplier?.name}" deleted`);
      }
    } else {
      showError('Failed to delete supplier');
    }
  };

  const handleExportJSON = () => {
    exportSuppliersToJSON(suppliers);
    showSuccess('Suppliers exported to JSON');
    setShowImportExportMenu(false);
  };

  const handleExportCSV = () => {
    exportSuppliersToCSV(suppliers);
    showSuccess('Suppliers exported to CSV');
    setShowImportExportMenu(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedSuppliers = await importSuppliersFromJSON(file);
      
      // Check for duplicates and add suppliers
      let successCount = 0;
      let duplicateCount = 0;
      
      for (const supplier of importedSuppliers) {
        const result = addSupplier(
          supplier.name,
          supplier.phone,
          supplier.agent
        );
        
        if (result.success) {
          successCount++;
        } else {
          duplicateCount++;
        }
      }
      
      if (successCount > 0) {
        showSuccess(`Imported ${successCount} suppliers successfully`);
      }
      
      if (duplicateCount > 0) {
        showError(`${duplicateCount} suppliers were duplicates and were skipped`);
      }
    } catch (error: any) {
      showError(error.message || 'Failed to import suppliers');
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
          <h1 className="text-3xl font-bold mb-2">Suppliers</h1>
          <p className="text-muted">Manage your supplier information and relationships</p>
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
                    handleExportJSON();
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
          </div>
          
          {/* Add Supplier Button - perfect square on mobile */}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-white text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            title="Add Supplier"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Supplier</span>
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
              <p className="text-sm text-muted mt-3">Loading suppliers...</p>
            </div>
          </div>
        </div>
      ) : (
        <SupplierStats stats={statistics} loading={loading} />
      )}
      
      {/* Main Content Card */}
      <GlassCard>
        {/* Filters */}
        <div className="mb-4">
          <SupplierFilters
            searchTerm={searchTerm}
            agentFilter={agentFilter}
            onSearchChange={setSearchTerm}
            onAgentChange={setAgentFilter}
            agents={uniqueAgents}
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
          <SupplierTable
            suppliers={suppliers}
            searchTerm={searchTerm}
            agentFilter={agentFilter}
            loading={false}
            onEditSupplier={setEditingSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            refreshData={refreshData}
          />
        )}
      </GlassCard>
      
      {/* Modals */}
      <AddSupplierModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddSupplier}
      />
      
      <EditSupplierModal
        isOpen={!!editingSupplier}
        supplier={editingSupplier}
        onClose={() => setEditingSupplier(null)}
        onUpdate={handleUpdateSupplier}
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