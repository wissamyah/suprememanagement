import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { ToastContainer } from '../../components/ui/Toast';
import { Pagination } from '../../components/ui/Pagination';
import { useToast } from '../../hooks/useToast';
import { useDataContext } from '../../contexts/DataContext';
import { useSales } from '../../hooks/useSales';
import { useLedgerOperations } from '../../hooks/useLedgerOperations';
import {
  Download,
  Plus,
  RefreshCw,
  ArrowLeft,
  FileText,
  MoreVertical
} from 'lucide-react';
import type { LedgerEntry } from '../../types';
import { PaymentModal } from '../../components/ledger/PaymentModal';
import { ManualEntryModal } from '../../components/ledger/ManualEntryModal';
import { LedgerStatistics } from '../../components/ledger/LedgerStatistics';
import { LedgerFilters } from '../../components/ledger/LedgerFilters';
import { LedgerTable } from '../../components/ledger/LedgerTable';
import { formatDate } from '../../utils/dateFormatting';

export const CustomerLedger = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionFilter, setTransactionFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<LedgerEntry | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const { sales } = useSales();
  const { customersHook } = useDataContext();
  const {
    ledgerEntries,
    customers,
    loading,
    syncInProgress,
    pendingChanges,
    addLedgerEntry,
    deleteLedgerEntry,
    forceSync
  } = customersHook;
  const { toasts, showSuccess, showError, removeToast } = useToast();

  const {
    currentCustomer,
    filteredEntries,
    paginatedEntries,
    totals,
    totalPages
  } = useLedgerOperations({
    customerId,
    ledgerEntries,
    customers,
    searchTerm,
    transactionFilter,
    dateFrom,
    dateTo,
    currentPage,
    itemsPerPage
  });
  
  useEffect(() => {
    const handleClickOutside = () => setShowMobileMenu(false);
    if (showMobileMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMobileMenu]);

  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, transactionFilter, dateFrom, dateTo, customerId]);
  
  const handleAddPayment = async (
    amount: number,
    paymentMethod: LedgerEntry['paymentMethod'],
    referenceNumber: string,
    notes: string,
    date: Date
  ) => {
    if (!customerId || !currentCustomer) {
      showError('Please select a customer to add payment');
      return { success: false };
    }
    
    const result = await addLedgerEntry(
      customerId,
      'payment',
      `Payment received via ${paymentMethod}`,
      0, // No debit for payments
      amount, // Credit amount
      undefined,
      referenceNumber,
      date,
      notes
    );
    
    if (result.success) {
      showSuccess('Payment recorded successfully');
      setShowPaymentModal(false);
    } else {
      showError(result.error || 'Failed to record payment');
    }
    
    return result;
  };
  
  const handleAddManualEntry = async (
    transactionType: LedgerEntry['transactionType'],
    debit: number,
    credit: number,
    description: string,
    notes: string,
    date: Date
  ) => {
    if (!customerId || !currentCustomer) {
      showError('Please select a customer to add entry');
      return { success: false };
    }
    
    const result = await addLedgerEntry(
      customerId,
      transactionType as any,
      description,
      debit,
      credit,
      undefined,
      undefined,
      date,
      notes
    );
    
    if (result.success) {
      showSuccess('Entry added successfully');
      setShowManualEntryModal(false);
    } else {
      showError(result.error || 'Failed to add entry');
    }
    
    return result;
  };
  
  const handleUpdateEntry = (
    _entryId: string,
    _updates: Partial<Omit<LedgerEntry, 'id' | 'customerId' | 'customerName' | 'createdAt' | 'runningBalance'>>
  ) => {
    const result = { success: false, error: 'Entry updates are not supported. Please delete and recreate.' };

    if (result.success) {
      showSuccess('Entry updated successfully');
      setEditingEntry(null);
      setShowManualEntryModal(false);
      setShowPaymentModal(false);
    } else {
      showError(result.error || 'Failed to update entry');
    }

    return result;
  };
  
  const handleDeleteEntry = async (entry: LedgerEntry) => {
    setIsDeletingId(entry.id);
    const result = await deleteLedgerEntry(entry.id);

    if (result.success) {
      showSuccess('Entry deleted successfully');
      setDeletingEntry(null);
    } else {
      showError(result.error || 'Failed to delete entry');
    }

    setIsDeletingId(null);
  };

  const handleEditEntry = (entry: LedgerEntry) => {
    setEditingEntry(entry);
    setShowManualEntryModal(true);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative">
        <div className="flex-1 w-full sm:w-auto">
          {customerId ? (
            <div className="flex flex-col">
              {/* Mobile: Back link on top */}
              <button 
                onClick={() => navigate('/customers/ledger')}
                className="sm:hidden flex items-center gap-2 text-sm text-muted hover:text-white transition-colors mb-2"
              >
                <ArrowLeft size={16} />
                All Customers
              </button>
              
              {/* Desktop: Side by side layout */}
              <div className="hidden sm:flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/customers/ledger')}>
                  <ArrowLeft size={20} />
                  All Customers
                </Button>
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    {currentCustomer?.name}'s Ledger
                  </h1>
                  <p className="text-muted">
                    Track transactions and balance for this customer
                  </p>
                </div>
              </div>
              
              {/* Mobile: Stacked layout */}
              <div className="sm:hidden">
                <h1 className="text-2xl font-bold mb-1">
                  {currentCustomer?.name}
                </h1>
                <p className="text-sm text-muted">
                  Track transactions and balance
                </p>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Customer Ledger
              </h1>
              <p className="text-muted">
                Overview of all customer transactions and balances
              </p>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Sync Status - Only visible on desktop */}
          {syncInProgress && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 glass rounded-lg">
              <RefreshCw className="animate-spin" size={16} />
              <span className="text-sm">Syncing...</span>
            </div>
          )}
          
          {pendingChanges > 0 && !syncInProgress && (
            <Button variant="ghost" onClick={forceSync} size="sm" className="hidden sm:flex">
              <RefreshCw size={16} />
              Sync ({pendingChanges})
            </Button>
          )}
          
          {/* Desktop buttons */}
          {customerId && (
            <>
              <Button variant="secondary" onClick={() => setShowManualEntryModal(true)} className="hidden sm:flex">
                <Plus size={20} />
                Manual Entry
              </Button>
              <Button variant="primary" onClick={() => setShowPaymentModal(true)} className="hidden sm:flex">
                <Plus size={20} />
                Add Payment
              </Button>
            </>
          )}
          
          <Button variant="ghost" className="hidden sm:flex">
            <Download size={20} />
            Export
          </Button>
          
          {/* Mobile buttons - positioned absolutely at top right */}
          <div className="sm:hidden absolute top-0 right-0 flex items-center gap-2">
            {customerId && (
              <>
                {/* Mobile dropdown menu - no background like Inventory page */}
                <div className="relative">
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
                      {syncInProgress && (
                        <div className="px-3 py-2 text-sm text-muted flex items-center gap-2">
                          <RefreshCw className="animate-spin" size={14} />
                          Syncing...
                        </div>
                      )}
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
                          setShowManualEntryModal(true);
                          setShowMobileMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                      >
                        <FileText size={16} />
                        Manual Entry
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Export functionality
                          setShowMobileMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                      >
                        <Download size={16} />
                        Export
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Mobile Add Payment button - white background like Inventory page */}
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-10 h-10 bg-white text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center justify-center"
                  title="Add Payment"
                >
                  <Plus size={18} />
                </button>
              </>
            )}
            
            {/* Mobile Export button when no customerId */}
            {!customerId && (
              <button
                onClick={() => {
                  // Export functionality
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                title="Export"
              >
                <Download size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Statistics Cards */}
      <LedgerStatistics
        totalDebit={totals.totalDebit}
        totalCredit={totals.totalCredit}
        balance={totals.balance}
        customerId={customerId}
      />
      
      {/* Main Content */}
      <GlassCard>
        {/* Filters */}
        <LedgerFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          transactionFilter={transactionFilter}
          setTransactionFilter={setTransactionFilter}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
        />
        
        {/* Table/Cards */}
        <LedgerTable
          entries={paginatedEntries}
          sales={sales}
          customerId={customerId}
          isDeletingId={isDeletingId}
          onEdit={handleEditEntry}
          onDelete={setDeletingEntry}
          pageTotalDebit={totals.pageTotalDebit}
          pageTotalCredit={totals.pageTotalCredit}
          totalDebit={totals.totalDebit}
          totalCredit={totals.totalCredit}
          balance={totals.balance}
          loading={loading}
          searchTerm={searchTerm}
          transactionFilter={transactionFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={filteredEntries.length}
          onPageChange={setCurrentPage}
        />
      </GlassCard>
      
      {/* Modals */}
      {showPaymentModal && customerId && (
        <PaymentModal
          isOpen={showPaymentModal}
          customerName={currentCustomer?.name || ''}
          onClose={() => {
            setShowPaymentModal(false);
          }}
          onAdd={handleAddPayment}
        />
      )}
      
      {showManualEntryModal && customerId && (
        <ManualEntryModal
          isOpen={showManualEntryModal}
          customerName={currentCustomer?.name || ''}
          onClose={() => {
            setShowManualEntryModal(false);
            setEditingEntry(null);
          }}
          onAdd={handleAddManualEntry}
          editingEntry={editingEntry}
          onUpdate={editingEntry ? handleUpdateEntry : undefined}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {deletingEntry && (
        <ConfirmModal
          isOpen={!!deletingEntry}
          onClose={() => setDeletingEntry(null)}
          onConfirm={() => handleDeleteEntry(deletingEntry)}
          title="Delete Ledger Entry"
          message={
            <div>
              Are you sure you want to delete this entry?
              <div className="mt-2 p-2 rounded bg-gray-800/50">
                <p className="text-sm">{deletingEntry.description}</p>
                <p className="text-xs text-muted mt-1">
                  Date: {formatDate(deletingEntry.date)}
                </p>
              </div>
              <p className="text-sm text-yellow-400 mt-2">
                This will recalculate all subsequent balances.
              </p>
            </div>
          }
          confirmText="Delete"
          type="danger"
        />
      )}
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};