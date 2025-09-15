import { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { ToastContainer } from '../../components/ui/Toast';
import { 
  Plus, 
  Search, 
  Calendar, 
  TrendingUp, 
  RefreshCw,
  Download,
  FileJson,
  FileText,
  DollarSign,
  MoreVertical
} from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { useToast } from '../../hooks/useToast';
import { SaleTable } from '../../components/sales/SaleTable';
import { AddSaleModal } from '../../components/sales/AddSaleModal';
import { EditSaleModal } from '../../components/sales/EditSaleModal';
import { BookedStockSummary } from '../../components/sales/BookedStockSummary';
import { 
  formatCurrency, 
  calculateSalesStats,
  exportSalesToJSON,
  exportSalesToCSV 
} from '../../utils/sales';
import type { Sale } from '../../types';

export const Sales = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [showImportExportMenu, setShowImportExportMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const {
    sales,
    loading,
    syncInProgress,
    pendingChanges,
    addSale,
    updateSale,
    deleteSale,
    getProducts,
    getCustomers,
    forceSync
  } = useSales();
  
  const { toasts, showSuccess, showError, removeToast } = useToast();
  
  // Calculate real-time statistics
  const stats = calculateSalesStats(sales);
  
  const handleAddSale = async (
    customerId: string,
    date: Date,
    items: any[],
    paymentStatus: 'pending' | 'partial' | 'paid'
  ) => {
    // Map items to the required format
    const mappedItems = items.map(item => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unit: item.unit || 'unit',
      price: item.price || item.unitPrice || 0,
      total: item.total || (item.quantity * (item.price || item.unitPrice || 0))
    }));
    
    const result = await addSale(customerId, mappedItems, date, paymentStatus);
    if (result.success) {
      showSuccess('Sale created successfully');
      setShowAddModal(false);
    }
    return result;
  };

  const handleUpdateSale = async (
    id: string,
    updates: Partial<Omit<Sale, 'id' | 'orderId' | 'createdAt' | 'updatedAt'>>
  ) => {
    const result = await updateSale(id, updates);
    if (result.success) {
      showSuccess('Sale updated successfully');
      setEditingSale(null);
    }
    return result;
  };

  const handleDeleteSale = async (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    const result = await deleteSale(saleId);

    if (result.success) {
      showSuccess(`Sale ${sale?.orderId} deleted`);
    } else {
      showError('Failed to delete sale');
    }
  };

  const handleExportJSON = () => {
    exportSalesToJSON(sales);
    showSuccess('Sales exported to JSON');
    setShowImportExportMenu(false);
  };

  const handleExportCSV = () => {
    exportSalesToCSV(sales);
    showSuccess('Sales exported to CSV');
    setShowImportExportMenu(false);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sales</h1>
          <p className="text-muted">Track and manage your sales transactions</p>
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
            
            {/* Export Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setShowImportExportMenu(!showImportExportMenu)}
              >
                <Download size={20} />
                Export
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
                </div>
              )}
            </div>
          </div>
          
          {/* Add Sale Button - perfect square on mobile */}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-white text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            title="New Sale"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">New Sale</span>
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
              <p className="text-sm text-muted mt-3">Loading sales data...</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Today's Sales</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.todaysTotal)}</p>
              </div>
              <TrendingUp className="text-green-400" size={24} />
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">This Week</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.weekTotal)}</p>
              </div>
              <Calendar className="text-blue-400" size={24} />
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">This Month</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.monthTotal)}</p>
              </div>
              <Calendar className="text-purple-400" size={24} />
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Pending Payment</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.pendingPaymentTotal)}</p>
              </div>
              <DollarSign className="text-yellow-400" size={24} />
            </div>
          </GlassCard>
        </div>
      )}
      
      {/* Booked Stock Summary */}
      <BookedStockSummary />
      
      {/* Main Table Card */}
      <GlassCard>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={20} />
            <input
              type="text"
              placeholder="Search by order ID or customer..."
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
        
        {/* Sales Table */}
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
          <SaleTable
            sales={sales}
            searchTerm={searchTerm}
            dateFilter={dateFilter}
            loading={false}
            onEditSale={setEditingSale}
            onDeleteSale={handleDeleteSale}
          />
        )}
      </GlassCard>
      
      {/* Modals */}
      <AddSaleModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddSale}
        products={getProducts()}
        customers={getCustomers()}
      />
      
      <EditSaleModal
        isOpen={!!editingSale}
        sale={editingSale}
        onClose={() => setEditingSale(null)}
        onUpdate={handleUpdateSale}
        products={getProducts()}
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