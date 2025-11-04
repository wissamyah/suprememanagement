import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  MoreVertical,
  Search,
  Truck,
  Weight,
  DollarSign,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { usePaddyTrucks } from '../../hooks/usePaddyTrucks';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useToast } from '../../hooks/useToast';
import { PaddyTruckTable } from '../../components/paddytrucks/PaddyTruckTable';
import { AddPaddyTruckModal } from '../../components/paddytrucks/AddPaddyTruckModal';
import { EditPaddyTruckModal } from '../../components/paddytrucks/EditPaddyTruckModal';
import { 
  exportPaddyTrucksToJSON, 
  exportPaddyTrucksToCSV,
  importPaddyTrucksFromJSON,
  formatWeight,
  formatCurrency
} from '../../utils/paddyTrucks';
import type { PaddyTruck } from '../../types';

export const PaddyTrucks = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTruck, setEditingTruck] = useState<PaddyTruck | null>(null);
  const [showImportExportMenu, setShowImportExportMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const {
    paddyTrucks,
    loading,
    syncInProgress,
    pendingChanges,
    addPaddyTruck,
    updatePaddyTruck,
    deletePaddyTruck,
    getStatistics,
    forceSync,
    refreshData
  } = usePaddyTrucks();
  
  const { suppliers } = useSuppliers();
  const { toasts, showSuccess, showError, removeToast } = useToast();

  const statistics = getStatistics();

  // Handle deep linking from search
  useEffect(() => {
    const state = location.state as { openTruckId?: string } | null;
    if (state?.openTruckId && paddyTrucks.length > 0) {
      const truck = paddyTrucks.find(t => t.id === state.openTruckId);
      if (truck) {
        setEditingTruck(truck);
      }
    }
  }, [location.state, paddyTrucks]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return searchTerm.trim() !== '' ||
           supplierFilter !== 'all' ||
           dateFrom !== '' ||
           dateTo !== '';
  }, [searchTerm, supplierFilter, dateFrom, dateTo]);

  // Filter and paginate trucks
  const filteredTrucks = useMemo(() => {
    let filtered = [...paddyTrucks];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(truck =>
        truck.truckPlate.toLowerCase().includes(searchLower) ||
        truck.supplierName.toLowerCase().includes(searchLower) ||
        truck.agent?.toLowerCase().includes(searchLower) ||
        truck.waybillNumber?.toLowerCase().includes(searchLower) ||
        truck.id.toLowerCase().includes(searchLower)
      );
    }

    // Apply supplier filter
    if (supplierFilter !== 'all') {
      filtered = filtered.filter(truck => truck.supplierId === supplierFilter);
    }

    // Apply date filters
    const fromDate = dateFrom ? new Date(dateFrom) : undefined;
    const toDate = dateTo ? new Date(dateTo) : undefined;

    if (fromDate) {
      filtered = filtered.filter(truck => new Date(truck.date) >= fromDate);
    }
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(truck => new Date(truck.date) <= toDate);
    }

    // Sort by date and creation time in descending order (newest first)
    filtered.sort((a, b) => {
      const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
      // If dates are the same, sort by creation time (most recent first)
      if (dateComparison === 0) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return dateComparison;
    });

    return filtered;
  }, [paddyTrucks, searchTerm, supplierFilter, dateFrom, dateTo]);

  // Calculate statistics for filtered trucks
  const filteredStatistics = useMemo(() => {
    const totalTrucks = filteredTrucks.length;
    const totalWeight = filteredTrucks.reduce((sum, truck) => sum + truck.weightAfterDeduction, 0);
    const totalValue = filteredTrucks.reduce((sum, truck) => sum + truck.totalAmount, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTrucks = filteredTrucks.filter(truck => {
      const truckDate = new Date(truck.date);
      truckDate.setHours(0, 0, 0, 0);
      return truckDate.getTime() === today.getTime();
    }).length;

    return {
      totalTrucks,
      totalWeight,
      totalValue,
      todayTrucks
    };
  }, [filteredTrucks]);

  // Use filtered stats when filters are active, otherwise use all-time stats
  const displayStats = hasActiveFilters ? filteredStatistics : statistics;

  // Calculate pagination
  const totalPages = Math.ceil(filteredTrucks.length / itemsPerPage);
  const paginatedTrucks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTrucks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTrucks, currentPage]);
  
  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, supplierFilter, dateFrom, dateTo]);
  
  const handleAddPaddyTruck = async (
    date: Date,
    supplierId: string,
    supplierName: string,
    truckPlate: string,
    pricePerKg: number,
    agent: string,
    moistureLevel: number,
    waybillNumber?: string,
    netWeight?: number,
    deduction?: number,
    bags?: number
  ) => {
    const result = await addPaddyTruck(
      date,
      supplierId,
      supplierName,
      truckPlate,
      pricePerKg,
      agent,
      moistureLevel,
      waybillNumber,
      netWeight,
      deduction,
      bags
    );
    if (result.success) {
      showSuccess(`Paddy truck "${truckPlate}" added successfully`);
      setShowAddModal(false);
    }
    return result;
  };

  const handleUpdatePaddyTruck = async (
    id: string,
    updates: Partial<Omit<PaddyTruck, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    const result = await updatePaddyTruck(id, updates);
    if (result.success) {
      showSuccess(`Paddy truck updated successfully`);
      setEditingTruck(null);
    }
    return result;
  };

  const handleDeletePaddyTruck = async (truckId: string) => {
    const truck = paddyTrucks.find(t => t.id === truckId);
    const result = await deletePaddyTruck(truckId);

    if (result.success) {
      showSuccess(`Paddy truck "${truck?.truckPlate}" deleted`);
    } else {
      showError(result.error || 'Failed to delete paddy truck');
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSupplierFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const handleExportJSON = () => {
    exportPaddyTrucksToJSON(paddyTrucks);
    showSuccess('Paddy trucks exported to JSON');
    setShowImportExportMenu(false);
  };

  const handleExportCSV = () => {
    exportPaddyTrucksToCSV(paddyTrucks);
    showSuccess('Paddy trucks exported to CSV');
    setShowImportExportMenu(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedTrucks = await importPaddyTrucksFromJSON(file);
      
      // Check for duplicates and add trucks
      let successCount = 0;
      let duplicateCount = 0;
      
      for (const truck of importedTrucks) {
        const result = await addPaddyTruck(
          truck.date,
          truck.supplierId,
          truck.supplierName,
          truck.truckPlate,
          truck.pricePerKg,
          truck.agent || '',
          truck.moistureLevel,
          truck.waybillNumber,
          truck.netWeight,
          truck.deduction,
          truck.bags
        );
        
        if (result.success) {
          successCount++;
        } else {
          duplicateCount++;
        }
      }
      
      if (successCount > 0) {
        showSuccess(`Imported ${successCount} trucks successfully`);
      }
      
      if (duplicateCount > 0) {
        showError(`${duplicateCount} trucks were duplicates and were skipped`);
      }
    } catch (error: any) {
      showError(error.message || 'Failed to import trucks');
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
          <h1 className="text-3xl font-bold mb-2">Paddy Trucks</h1>
          <p className="text-muted">Track and manage incoming paddy trucks</p>
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
          
          {/* Add Truck Button - perfect square on mobile */}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-white text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            title="Add Truck"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Truck</span>
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
              <p className="text-sm text-muted mt-3">Loading trucks...</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Filter indicator and clear button */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
                  Filtered Results ({displayStats.totalTrucks} trucks)
                </span>
              </div>
              <button
                onClick={handleClearFilters}
                className="px-3 py-1 text-sm text-muted hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              >
                Clear Filters
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">
                    {hasActiveFilters ? 'Filtered' : 'Total'} Trucks
                  </p>
                  <p className="text-2xl font-bold">{displayStats.totalTrucks}</p>
                  <p className="text-sm text-muted mt-1">{displayStats.todayTrucks} today</p>
                </div>
                <Truck className="text-blue-400" size={24} />
              </div>
            </GlassCard>
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">
                    {hasActiveFilters ? 'Filtered' : 'Total'} Weight
                  </p>
                  <p className="text-2xl font-bold">{formatWeight(displayStats.totalWeight)}</p>
                </div>
                <Weight className="text-green-400" size={24} />
              </div>
            </GlassCard>
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">
                    {hasActiveFilters ? 'Filtered' : 'Total'} Value
                  </p>
                  <p className="text-2xl font-bold">{formatCurrency(displayStats.totalValue)}</p>
                </div>
                <DollarSign className="text-purple-400" size={24} />
              </div>
            </GlassCard>
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Avg Price/Kg</p>
                  <p className="text-2xl font-bold">
                    {displayStats.totalWeight > 0
                      ? formatCurrency(displayStats.totalValue / displayStats.totalWeight)
                      : formatCurrency(0)
                    }
                  </p>
                  <p className="text-sm text-muted mt-1">Weighted average</p>
                </div>
                <DollarSign className="text-orange-400" size={24} />
              </div>
            </GlassCard>
          </div>
        </div>
      )}
      
      {/* Main Content Card */}
      <GlassCard>
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1 lg:min-w-[500px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={20} />
            <input
              type="text"
              placeholder="Search by truck, supplier, waybill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-muted-text text-base"
            />
          </div>

          <select
            className="w-full lg:w-[180px] px-3 py-2.5 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
          >
            <option value="all">All Suppliers</option>
            {[...suppliers].sort((a, b) => a.name.localeCompare(b.name)).map(supplier => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>

          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-base"
              placeholder="From Date"
              style={{ fontSize: '16px' }}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-base"
              placeholder="To Date"
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>
        
        {/* Table/Cards */}
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
          <>
            <PaddyTruckTable
              paddyTrucks={paginatedTrucks}
              searchTerm=""
              supplierFilter="all"
              dateFrom={undefined}
              dateTo={undefined}
              loading={false}
              onEditTruck={setEditingTruck}
              onDeleteTruck={handleDeletePaddyTruck}
              refreshData={refreshData}
            />

            {/* Summary Stats - Always show when there are results */}
            {filteredTrucks.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="text-sm">
                  <div className="text-muted-text">
                    {totalPages > 1 ? (
                      <>
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                        {Math.min(currentPage * itemsPerPage, filteredTrucks.length)} of{' '}
                        {filteredTrucks.length} trucks
                      </>
                    ) : (
                      <>Showing {filteredTrucks.length} truck{filteredTrucks.length !== 1 ? 's' : ''}</>
                    )}
                  </div>
                  <div className="text-sm text-muted mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span>Total: {formatWeight(filteredStatistics.totalWeight)}</span>
                    <span>|</span>
                    <span>{formatCurrency(filteredStatistics.totalValue)}</span>
                    <span>|</span>
                    <span>
                      Avg: {filteredStatistics.totalWeight > 0
                        ? formatCurrency(filteredStatistics.totalValue / filteredStatistics.totalWeight)
                        : formatCurrency(0)
                      }/kg
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-4">
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="min-h-[44px]"
                  >
                    <ChevronLeft size={16} />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    {/* Show page numbers */}
                    {(() => {
                      const pages = [];
                      const showPages = 5;
                      let start = Math.max(1, currentPage - Math.floor(showPages / 2));
                      let end = Math.min(totalPages, start + showPages - 1);

                      if (end - start < showPages - 1) {
                        start = Math.max(1, end - showPages + 1);
                      }

                      if (start > 1) {
                        pages.push(
                          <button
                            key={1}
                            onClick={() => setCurrentPage(1)}
                            className="min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg text-base hover:bg-glass"
                          >
                            1
                          </button>
                        );
                        if (start > 2) {
                          pages.push(
                            <span key="start-ellipsis" className="px-2 text-muted">...</span>
                          );
                        }
                      }

                      for (let i = start; i <= end; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg text-base ${
                              i === currentPage
                                ? 'bg-white/20 text-white font-medium'
                                : 'hover:bg-glass'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }

                      if (end < totalPages) {
                        if (end < totalPages - 1) {
                          pages.push(
                            <span key="end-ellipsis" className="px-2 text-muted">...</span>
                          );
                        }
                        pages.push(
                          <button
                            key={totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            className="min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg text-base hover:bg-glass"
                          >
                            {totalPages}
                          </button>
                        );
                      }

                      return pages;
                    })()}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="min-h-[44px]"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </GlassCard>
      
      {/* Modals */}
      <AddPaddyTruckModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddPaddyTruck}
      />
      
      <EditPaddyTruckModal
        isOpen={!!editingTruck}
        truck={editingTruck}
        onClose={() => setEditingTruck(null)}
        onUpdate={handleUpdatePaddyTruck}
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