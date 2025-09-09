import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { useCustomers } from '../../hooks/useCustomers';
import { useSales } from '../../hooks/useSales';
import { Tooltip, ProductTooltip } from '../../components/ui/Tooltip';
import { 
  Search, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  ArrowLeft,
  FileText,
  MoreVertical,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { LedgerEntry } from '../../types';
import { PaymentModal } from '../../components/ledger/PaymentModal';
import { ManualEntryModal } from '../../components/ledger/ManualEntryModal';

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
  const [editingPayment, setEditingPayment] = useState<LedgerEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<LedgerEntry | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; // 15 items per page for ledger
  
  // Get sales data for tooltip
  const { sales } = useSales();
  
  const {
    ledgerEntries,
    customers,
    loading,
    syncInProgress,
    pendingChanges,
    addLedgerEntry,
    deleteLedgerEntry,
    getCustomerLedger,
    forceSync
  } = useCustomers();
  
  const { toasts, showSuccess, showError, removeToast } = useToast();
  
  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowMobileMenu(false);
    if (showMobileMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMobileMenu]);
  
  // Get current customer if viewing individual ledger
  const currentCustomer = customerId 
    ? customers.find(c => c.id === customerId)
    : null;
  
  // Get ledger data based on view mode
  const ledgerData = useMemo(() => {
    if (customerId) {
      // Individual customer view - filter directly here instead of using getCustomerLedger
      // This ensures the memo recalculates when ledgerEntries changes
      return ledgerEntries
        .filter(l => l.customerId === customerId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      // All customers view - show all ledger entries
      return ledgerEntries
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  }, [customerId, ledgerEntries]);
  
  // Filter ledger entries
  const filteredEntries = useMemo(() => {
    let filtered = [...ledgerData];
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.customerName.toLowerCase().includes(search) ||
        entry.description.toLowerCase().includes(search) ||
        entry.referenceNumber?.toLowerCase().includes(search) ||
        entry.notes?.toLowerCase().includes(search)
      );
    }
    
    // Transaction type filter
    if (transactionFilter !== 'all') {
      filtered = filtered.filter(entry => entry.transactionType === transactionFilter);
    }
    
    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter(entry => new Date(entry.date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(entry => new Date(entry.date) <= to);
    }
    
    return filtered;
  }, [ledgerData, searchTerm, transactionFilter, dateFrom, dateTo]);
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEntries.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEntries, currentPage]);
  
  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, transactionFilter, dateFrom, dateTo, customerId]);
  
  // Calculate totals
  const totals = useMemo(() => {
    // Calculate totals from paginated entries for display (visible page only)
    const pageTotalDebit = paginatedEntries.reduce((sum, entry) => sum + entry.debit, 0);
    const pageTotalCredit = paginatedEntries.reduce((sum, entry) => sum + entry.credit, 0);
    
    // Calculate totals from ALL filtered entries for overall totals
    const totalDebit = filteredEntries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredit = filteredEntries.reduce((sum, entry) => sum + entry.credit, 0);
    
    // Get the actual current balance from ALL entries (not filtered)
    let balance = 0;
    if (customerId) {
      // For individual customer, always get the running balance from ALL their ledger entries
      // This ensures the balance is always accurate regardless of filters
      const allCustomerEntries = ledgerEntries
        .filter(e => e.customerId === customerId)
        .sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA !== dateB) return dateA - dateB;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
      
      if (allCustomerEntries.length > 0) {
        // Take the running balance of the last (most recent) entry
        balance = allCustomerEntries[allCustomerEntries.length - 1].runningBalance;
      } else if (currentCustomer) {
        // If no ledger entries exist, use the customer's initial balance
        balance = currentCustomer.balance;
      }
    } else {
      // For all customers view, calculate net balance from filtered entries
      balance = totalCredit - totalDebit;
    }
    
    return { totalDebit, totalCredit, balance, pageTotalDebit, pageTotalCredit };
  }, [filteredEntries, paginatedEntries, customerId, ledgerEntries, currentCustomer]);
  
  const handleAddPayment = (
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
    
    const result = addLedgerEntry(
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
  
  const handleAddManualEntry = (
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
    
    const result = addLedgerEntry(
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
    // Update not supported - would need to implement in hook
    const result = { success: false, error: 'Entry updates are not supported. Please delete and recreate.' };
    
    if (result.success) {
      showSuccess('Entry updated successfully');
      setEditingEntry(null);
      setEditingPayment(null);
      setShowManualEntryModal(false);
      setShowPaymentModal(false);
    } else {
      showError(result.error || 'Failed to update entry');
    }
    
    return result;
  };
  
  const handleDeleteEntry = async (entry: LedgerEntry) => {
    setIsDeletingId(entry.id);
    
    const result = deleteLedgerEntry(entry.id);
    
    if (result.success) {
      showSuccess('Entry deleted successfully');
      setDeletingEntry(null);
    } else {
      showError(result.error || 'Failed to delete entry');
    }
    
    setIsDeletingId(null);
  };
  
  
  const getTransactionTypeLabel = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };
  
  const formatCurrency = (amount: number) => {
    return `₦${Math.abs(amount).toLocaleString()}`;
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Total Sales/Debits</p>
              <p className="text-2xl font-bold text-red-400">
                {formatCurrency(totals.totalDebit)}
              </p>
            </div>
            <TrendingUp className="text-red-400" size={24} />
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Total Payments/Credits</p>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(totals.totalCredit)}
              </p>
            </div>
            <TrendingDown className="text-green-400" size={24} />
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">
                {customerId ? 'Current Balance' : 'Net Outstanding'}
              </p>
              <p className={`text-2xl font-bold ${
                totals.balance < 0 ? 'text-red-400' : 
                totals.balance > 0 ? 'text-green-400' : 
                'text-yellow-400'
              }`}>
                {formatCurrency(Math.abs(totals.balance))}
              </p>
              {totals.balance < 0 && (
                <p className="text-xs text-red-400 mt-1">Customer owes</p>
              )}
              {totals.balance > 0 && (
                <p className="text-xs text-green-400 mt-1">Customer has credit</p>
              )}
            </div>
            <DollarSign className={
              totals.balance < 0 ? 'text-red-400' : 
              totals.balance > 0 ? 'text-green-400' : 
              'text-yellow-400'
            } size={24} />
          </div>
        </GlassCard>
      </div>
      
      {/* Main Content */}
      <GlassCard>
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={20} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-muted-text"
            />
          </div>
          
          <select 
            className="px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            value={transactionFilter}
            onChange={(e) => setTransactionFilter(e.target.value)}
          >
            <option value="all">All Transactions</option>
            <option value="payment">Payments</option>
            <option value="sale">Sales</option>
            <option value="credit_note">Credit Notes</option>
            <option value="opening_balance">Opening Balance</option>
            <option value="adjustment">Adjustments</option>
          </select>
          
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="From Date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="To Date"
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
              <p className="text-sm text-muted mt-3">Loading ledger...</p>
            </div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-20 text-muted">
            {searchTerm || transactionFilter !== 'all' || dateFrom || dateTo
              ? 'No transactions found matching your filters'
              : customerId
                ? 'No transactions for this customer yet'
                : 'No transactions recorded yet'}
          </div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="sm:hidden space-y-3">
              {paginatedEntries.map((entry) => (
                <div 
                  key={entry.id}
                  className={`glass rounded-lg p-4 ${
                    entry.runningBalance > 0 
                      ? 'bg-green-500/5' 
                      : entry.runningBalance < 0 
                        ? 'bg-red-500/5' 
                        : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium">
                        {!customerId && entry.customerName}
                      </p>
                      <p className="text-sm text-muted">
                        {new Date(entry.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      entry.transactionType === 'payment' 
                        ? 'bg-green-500/20 text-green-400'
                        : entry.transactionType === 'sale'
                          ? 'bg-red-500/20 text-red-400'
                          : entry.transactionType === 'credit_note'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {getTransactionTypeLabel(entry.transactionType)}
                    </span>
                  </div>
                  
                  {entry.transactionType === 'sale' ? (
                    (() => {
                      // Extract order ID from description (formats: "Sale Invoice #ORD-XXXX" or "Sale - ORD-XXXX")
                      const orderMatch = entry.description.match(/#?(ORD-\d+-\d+)/i);
                      const orderId = orderMatch ? orderMatch[1] : null;
                      const sale = orderId ? sales.find(s => s.orderId === orderId) : null;
                      
                      if (sale && sale.items && sale.items.length > 0 && orderId) {
                        // Split the description to separately style the order number
                        const parts = entry.description.split(orderId);
                        return (
                          <p className="text-sm mb-3">
                            {parts[0]}
                            <Tooltip
                              content={
                                <ProductTooltip
                                  items={sale.items.map(item => ({
                                    productName: item.productName,
                                    quantity: item.quantity,
                                    price: item.price,
                                    total: item.total
                                  }))}
                                />
                              }
                              placement="top"
                            >
                              <span className="cursor-help underline decoration-dotted decoration-gray-400">
                                {orderId}
                              </span>
                            </Tooltip>
                            {parts[1]}
                          </p>
                        );
                      }
                      return <p className="text-sm mb-3">{entry.description}</p>;
                    })()
                  ) : (
                    <p className="text-sm mb-3">{entry.description}</p>
                  )}
                  
                  <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                    {entry.debit > 0 && (
                      <div>
                        <span className="text-muted text-xs">Debit</span>
                        <p className="font-medium text-red-400">
                          {formatCurrency(entry.debit)}
                        </p>
                      </div>
                    )}
                    {entry.credit > 0 && (
                      <div>
                        <span className="text-muted text-xs">Credit</span>
                        <p className="font-medium text-green-400">
                          {formatCurrency(entry.credit)}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted text-xs">Balance</span>
                      <p className={`font-bold ${
                        entry.runningBalance > 0 
                          ? 'text-green-400' 
                          : entry.runningBalance < 0 
                            ? 'text-red-400' 
                            : 'text-yellow-400'
                      }`}>
                        {formatCurrency(entry.runningBalance)}
                      </p>
                    </div>
                  </div>
                  
                  {customerId && entry.transactionType !== 'sale' && (
                    <div className="flex gap-2 justify-end border-t border-white/5 pt-3">
                      <button
                        onClick={() => {
                          if (entry.transactionType === 'payment') {
                            setEditingPayment(entry);
                            setShowPaymentModal(true);
                          } else {
                            setEditingEntry(entry);
                            setShowManualEntryModal(true);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200"
                        title="Edit Entry"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeletingEntry(entry)}
                        disabled={isDeletingId === entry.id}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200 disabled:opacity-50"
                        title="Delete Entry"
                      >
                        {isDeletingId === entry.id ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} className="text-red-400" />
                        )}
                      </button>
                    </div>
                  )}
                  {customerId && entry.transactionType === 'sale' && (
                    <div className="flex gap-2 justify-end border-t border-white/5 pt-3">
                      <p className="text-xs text-muted italic">Sales can only be edited from the Sales page</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800/50">
                    <th className="text-left py-3 px-4">Date</th>
                    {!customerId && <th className="text-left py-3 px-4">Customer</th>}
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-right py-3 px-4">Debit (₦)</th>
                    <th className="text-right py-3 px-4">Credit (₦)</th>
                    <th className="text-right py-3 px-4">Balance (₦)</th>
                    {customerId && <th className="text-center py-3 px-4">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedEntries.map((entry) => (
                    <tr 
                      key={entry.id} 
                      className={`border-b border-gray-800/30 hover:bg-glass transition-colors ${
                        entry.runningBalance > 0 
                          ? 'bg-green-500/5' 
                          : entry.runningBalance < 0 
                            ? 'bg-red-500/5' 
                            : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      {!customerId && (
                        <td className="py-3 px-4 font-medium">{entry.customerName}</td>
                      )}
                      <td className="py-3 px-4">
                        <div>
                          {entry.transactionType === 'sale' ? (
                            (() => {
                              // Extract order ID from description (formats: "Sale Invoice #ORD-XXXX" or "Sale - ORD-XXXX")
                              const orderMatch = entry.description.match(/#?(ORD-\d+-\d+)/i);
                              const orderId = orderMatch ? orderMatch[1] : null;
                              const sale = orderId ? sales.find(s => s.orderId === orderId) : null;
                              
                              if (sale && sale.items && sale.items.length > 0 && orderId) {
                                // Split the description to separately style the order number
                                const parts = entry.description.split(orderId);
                                return (
                                  <p>
                                    {parts[0]}
                                    <Tooltip
                                      content={
                                        <ProductTooltip
                                          items={sale.items.map(item => ({
                                            productName: item.productName,
                                            quantity: item.quantity,
                                            price: item.price,
                                            total: item.total
                                          }))}
                                        />
                                      }
                                      placement="top"
                                    >
                                      <span className="cursor-help underline decoration-dotted decoration-gray-400">
                                        {orderId}
                                      </span>
                                    </Tooltip>
                                    {parts[1]}
                                  </p>
                                );
                              }
                              return <p>{entry.description}</p>;
                            })()
                          ) : (
                            <p>{entry.description}</p>
                          )}
                          {entry.notes && (
                            <p className="text-xs text-muted">{entry.notes}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          entry.transactionType === 'payment' 
                            ? 'bg-green-500/20 text-green-400'
                            : entry.transactionType === 'sale'
                              ? 'bg-red-500/20 text-red-400'
                              : entry.transactionType === 'credit_note'
                                ? 'bg-blue-500/20 text-blue-400'
                                : entry.transactionType === 'opening_balance'
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {getTransactionTypeLabel(entry.transactionType)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-red-400">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-green-400">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${
                        entry.runningBalance < 0 
                          ? 'text-red-400' 
                          : entry.runningBalance > 0 
                            ? 'text-green-400' 
                            : 'text-yellow-400'
                      }`}>
                        {formatCurrency(Math.abs(entry.runningBalance))}
                        {entry.runningBalance < 0 && (
                          <span className="text-xs block text-red-400">Owes</span>
                        )}
                        {entry.runningBalance > 0 && (
                          <span className="text-xs block text-green-400">Credit</span>
                        )}
                      </td>
                      {customerId && (
                        <td className="py-3 px-4">
                          {entry.transactionType !== 'sale' ? (
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => {
                                  if (entry.transactionType === 'payment') {
                                    setEditingPayment(entry);
                                    setShowPaymentModal(true);
                                  } else {
                                    setEditingEntry(entry);
                                    setShowManualEntryModal(true);
                                  }
                                }}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200"
                                title="Edit Entry"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => setDeletingEntry(entry)}
                                disabled={isDeletingId === entry.id}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200 disabled:opacity-50"
                                title="Delete Entry"
                              >
                                {isDeletingId === entry.id ? (
                                  <RefreshCw size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} className="text-red-400" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="text-center">
                              <span className="text-xs text-muted italic">Via Sales</span>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-800/30">
                    <td colSpan={customerId ? 3 : 4} className="py-3 px-4 text-sm text-muted">Page Total</td>
                    <td className="py-3 px-4 text-right text-sm text-red-400">
                      {formatCurrency(totals.pageTotalDebit)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-green-400">
                      {formatCurrency(totals.pageTotalCredit)}
                    </td>
                    <td></td>
                    {customerId && <td></td>}
                  </tr>
                  <tr className="border-t-2 border-gray-800/50 font-bold">
                    <td colSpan={customerId ? 3 : 4} className="py-3 px-4">Overall Total</td>
                    <td className="py-3 px-4 text-right text-red-400">
                      {formatCurrency(totals.totalDebit)}
                    </td>
                    <td className="py-3 px-4 text-right text-green-400">
                      {formatCurrency(totals.totalCredit)}
                    </td>
                    <td className={`py-3 px-4 text-right ${
                      totals.balance > 0 
                        ? 'text-green-400' 
                        : totals.balance < 0 
                          ? 'text-red-400' 
                          : 'text-yellow-400'
                    }`}>
                      {formatCurrency(totals.balance)}
                    </td>
                    {customerId && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                <div className="text-sm text-muted">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredEntries.length)} of{' '}
                  {filteredEntries.length} entries
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={16} />
                    Previous
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
                            className="px-3 py-1 rounded-lg text-sm hover:bg-glass"
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
                            className={`px-3 py-1 rounded-lg text-sm ${
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
                            className="px-3 py-1 rounded-lg text-sm hover:bg-glass"
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
                  >
                    Next
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </GlassCard>
      
      {/* Modals */}
      {showPaymentModal && customerId && (
        <PaymentModal
          isOpen={showPaymentModal}
          customerName={currentCustomer?.name || ''}
          onClose={() => {
            setShowPaymentModal(false);
            setEditingPayment(null);
          }}
          onAdd={handleAddPayment}
          editingEntry={editingPayment}
          onUpdate={editingPayment ? handleUpdateEntry : undefined}
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
                  Date: {new Date(deletingEntry.date).toLocaleDateString()}
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