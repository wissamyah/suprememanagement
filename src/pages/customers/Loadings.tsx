import { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { ToastContainer } from '../../components/ui/Toast';
import { 
  Plus, 
  Search, 
  Truck, 
  Calendar, 
  TrendingUp,
  RefreshCw,
  Download,
  Upload,
  FileJson,
  FileText,
  DollarSign,
  MoreVertical,
} from 'lucide-react';
import { useLoadings } from '../../hooks/useLoadings';
import { useToast } from '../../hooks/useToast';
import { LoadingTable } from '../../components/loadings/LoadingTable';
import { AddLoadingModal } from '../../components/loadings/AddLoadingModal';
import { EditLoadingModal } from '../../components/loadings/EditLoadingModal';
import { 
  formatCurrency,
  exportLoadingsToJSON,
  exportLoadingsToCSV,
  importLoadingsFromJSON,
  calculateLoadingStats
} from '../../utils/loadings';
import type { Loading } from '../../types';

export const Loadings = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLoading, setEditingLoading] = useState<Loading | null>(null);
  const [showImportExportMenu, setShowImportExportMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const {
    loadings,
    loading,
    syncInProgress: syncPending,
    pendingChanges,
    addLoading,
    updateLoading,
    deleteLoading,
    getCustomersWithBookedStock,
    getCustomerBookedProducts,
    forceSync
  } = useLoadings();
  
  const { toasts, showSuccess, showError, removeToast } = useToast();
  
  // Calculate real-time statistics
  const stats = calculateLoadingStats(loadings);
  
  const handleAddLoading = (
    date: string,
    customerId: string,
    truckPlateNumber: string,
    wayBillNumber: string | undefined,
    items: any[]
  ) => {
    // Map items to the required format
    const mappedItems = items.map(item => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unit: item.unit || 'unit',
      unitPrice: item.unitPrice || 0,
      bookedStockId: item.bookedStockId || '',
      saleId: item.saleId,
      orderId: item.orderId
    }));
    
    const result = addLoading(
      customerId,
      mappedItems,
      truckPlateNumber,
      '', // driverName
      wayBillNumber,
      date
    );
    if (result.success) {
      showSuccess('Loading created successfully');
      setShowAddModal(false);
    }
    return result;
  };

  const handleUpdateLoading = (
    id: string,
    updates: Partial<Omit<Loading, 'id' | 'loadingId' | 'createdAt' | 'updatedAt'>>
  ) => {
    const result = updateLoading(id, updates);
    if (result.success) {
      showSuccess('Loading updated successfully');
      setEditingLoading(null);
    }
    return result;
  };

  const handleDeleteLoading = (loadingId: string) => {
    const loading = loadings.find(l => l.id === loadingId);
    const result = deleteLoading(loadingId);
    
    if (result.success) {
      showSuccess(`Loading ${loading?.loadingId} deleted`);
    } else {
      showError('Failed to delete loading');
    }
  };

  const handleExportJSON = () => {
    exportLoadingsToJSON(loadings);
    showSuccess('Loadings exported to JSON');
    setShowImportExportMenu(false);
  };

  const handleExportCSV = () => {
    exportLoadingsToCSV(loadings);
    showSuccess('Loadings exported to CSV');
    setShowImportExportMenu(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedLoadings = await importLoadingsFromJSON(file);
      showSuccess(`Imported ${importedLoadings.length} loadings`);
      // Note: You would need to add import functionality to the hook
    } catch (error: any) {
      showError(error.message || 'Failed to import loadings');
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
          <h1 className="text-3xl font-bold mb-2">Loadings</h1>
          <p className="text-muted">Track and manage loading operations</p>
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
                {pendingChanges > 0 && !syncPending && (
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
            {syncPending && (
              <div className="flex items-center gap-2 px-3 py-2 glass rounded-lg">
                <RefreshCw className="animate-spin" size={16} />
                <span className="text-sm">Syncing...</span>
              </div>
            )}
            
            {pendingChanges > 0 && !syncPending && (
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
          
          {/* New Loading Button - perfect square on mobile */}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-white text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            title="New Loading"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">New Loading</span>
          </button>
        </div>
      </div>
      
      {/* Statistics Cards */}
      {loading ? (
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              </div>
              <p className="text-sm text-muted mt-3">Loading data...</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Today's Loadings</p>
                <p className="text-2xl font-bold">{stats.todaysCount}</p>
                <p className="text-sm text-green-400">{formatCurrency(stats.todaysValue)}</p>
              </div>
              <Truck className="text-blue-400" size={24} />
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">This Week</p>
                <p className="text-2xl font-bold">{stats.weekCount}</p>
                <p className="text-sm text-green-400">{formatCurrency(stats.weekValue)}</p>
              </div>
              <Calendar className="text-purple-400" size={24} />
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">This Month</p>
                <p className="text-2xl font-bold">{stats.monthCount}</p>
                <p className="text-sm text-green-400">{formatCurrency(stats.monthValue)}</p>
              </div>
              <TrendingUp className="text-yellow-400" size={24} />
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Total Value</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(stats.totalValue)}
                </p>
                <p className="text-sm text-muted">{stats.totalCount} loadings</p>
              </div>
              <DollarSign className="text-green-400" size={24} />
            </div>
          </GlassCard>
        </div>
      )}
      
      {/* Main Table Card */}
      <GlassCard>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={20} />
            <input
              type="text"
              placeholder="Search by loading ID, customer, truck, or way bill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-muted-text"
            />
          </div>
          <select 
            className="px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        
        {/* Loadings Table */}
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
          <LoadingTable
            loadings={loadings}
            searchTerm={searchTerm}
            dateFilter={dateFilter}
            onEditLoading={setEditingLoading}
            onDeleteLoading={handleDeleteLoading}
          />
        )}
      </GlassCard>
      
      {/* Modals */}
      <AddLoadingModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddLoading}
        customersWithBookings={getCustomersWithBookedStock()}
        getCustomerBookedProducts={getCustomerBookedProducts}
      />
      
      <EditLoadingModal
        isOpen={!!editingLoading}
        loading={editingLoading}
        onClose={() => setEditingLoading(null)}
        onUpdate={handleUpdateLoading}
        customersWithBookings={getCustomersWithBookedStock()}
        getCustomerBookedProducts={getCustomerBookedProducts}
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