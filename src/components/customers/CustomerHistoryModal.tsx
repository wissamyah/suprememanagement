import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { 
  Download, 
  Calendar,
  ShoppingCart,
  Truck,
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import type { Customer } from '../../types';
import { formatCurrency } from '../../utils/customers';
import { formatDate } from '../../utils/dateFormatting';
import { useDataContext } from '../../contexts/DataContext';
import { 
  exportCustomerHistoryToPDF,
  type TimelineTransaction,
  type HistorySummary
} from '../../utils/customerHistoryExport';

interface CustomerHistoryModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
}

type DateRangePreset = 'today' | 'this-month' | 'last-month' | 'custom';

export const CustomerHistoryModal = ({ 
  isOpen, 
  customer, 
  onClose 
}: CustomerHistoryModalProps) => {
  const { data } = useDataContext();
  const { sales, loadings, ledgerEntries } = data;

  // Date range state
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('this-month');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Reset to "this month" when modal opens
  useEffect(() => {
    if (isOpen) {
      setDateRangePreset('this-month');
      setCustomDateFrom('');
      setCustomDateTo('');
    }
  }, [isOpen]);

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    let from: Date;
    let to: Date = new Date(now.setHours(23, 59, 59, 999));

    switch (dateRangePreset) {
      case 'today':
        from = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'this-month':
        from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      case 'last-month':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'custom':
        if (customDateFrom && customDateTo) {
          from = new Date(customDateFrom + 'T00:00:00');
          to = new Date(customDateTo + 'T23:59:59');
        } else {
          // Default to this month if custom dates not set
          from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        }
        break;
      default:
        from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }

    return { from, to };
  }, [dateRangePreset, customDateFrom, customDateTo]);

  // Build unified timeline
  const timeline = useMemo(() => {
    if (!customer) return [];

    const transactions: TimelineTransaction[] = [];

    // Add sales
    const customerSales = sales.filter(s => s.customerId === customer.id);
    customerSales.forEach(sale => {
      const saleDate = new Date(sale.date);
      if (saleDate >= dateRange.from && saleDate <= dateRange.to) {
        transactions.push({
          id: sale.id,
          date: saleDate,
          createdAt: new Date(sale.createdAt),
          type: 'sale',
          description: `Sale - Order #${sale.orderId}`,
          debit: sale.totalAmount,
          credit: 0,
          balance: 0, // Will be calculated later
          reference: sale.orderId,
          items: sale.items.map((item: { productName: string; quantity: number; unit: string; price: number }) => ({
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price
          }))
        });
      }
    });

    // Add loadings
    const customerLoadings = loadings.filter(l => l.customerId === customer.id);
    customerLoadings.forEach(loading => {
      const loadingDate = new Date(loading.date);
      if (loadingDate >= dateRange.from && loadingDate <= dateRange.to) {
        transactions.push({
          id: loading.id,
          date: loadingDate,
          createdAt: new Date(loading.createdAt),
          type: 'loading',
          description: `Loading - #${loading.loadingId}`,
          debit: 0,
          credit: 0,
          balance: 0, // Will be calculated later
          reference: loading.loadingId,
          items: loading.items.map((item: { productName: string; quantity: number; unit: string; unitPrice: number }) => ({
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit,
            price: item.unitPrice
          }))
        });
      }
    });

    // Add ledger entries (payments and other transactions)
    const customerLedger = ledgerEntries.filter(e => e.customerId === customer.id);
    customerLedger.forEach(entry => {
      const entryDate = new Date(entry.date);
      if (entryDate >= dateRange.from && entryDate <= dateRange.to) {
        // Skip ledger entries that are already represented as sales
        const isSaleEntry = entry.transactionType === 'sale' && 
          transactions.some(t => t.type === 'sale' && t.reference && entry.referenceId === t.id);
        
        if (!isSaleEntry) {
          const type = entry.transactionType === 'payment' ? 'payment' : 'other';
          transactions.push({
            id: entry.id,
            date: entryDate,
            createdAt: new Date(entry.createdAt),
            type,
            description: entry.description,
            debit: entry.debit,
            credit: entry.credit,
            balance: 0, // Will be calculated later
            reference: entry.referenceNumber,
            paymentMethod: entry.paymentMethod
          });
        }
      }
    });

    // Sort by date first, then by createdAt for same-day transactions (oldest first)
    transactions.sort((a, b) => {
      const dateDiff = a.date.getTime() - b.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      // If same day, sort by creation time
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    // Calculate running balance (working forwards from oldest transaction)
    // Start with customer's initial balance before these transactions
    let initialBalance = customer.balance;
    for (let i = transactions.length - 1; i >= 0; i--) {
      initialBalance = initialBalance + transactions[i].debit - transactions[i].credit;
    }
    
    let runningBalance = initialBalance;
    for (let i = 0; i < transactions.length; i++) {
      runningBalance = runningBalance - transactions[i].debit + transactions[i].credit;
      transactions[i].balance = runningBalance;
    }

    return transactions;
  }, [customer, sales, loadings, ledgerEntries, dateRange]);

  // Calculate summary statistics
  const summary = useMemo((): HistorySummary => {
    const totalSales = timeline
      .filter(t => t.type === 'sale')
      .reduce((sum, t) => sum + t.debit, 0);

    const totalLoadings = timeline
      .filter(t => t.type === 'loading')
      .reduce((sum, t) => sum + (t.items?.reduce((s, i) => s + (i.quantity * i.price), 0) || 0), 0);

    const totalPayments = timeline
      .filter(t => t.type === 'payment')
      .reduce((sum, t) => sum + t.credit, 0);

    const totalDebits = timeline.reduce((sum, t) => sum + t.debit, 0);
    const totalCredits = timeline.reduce((sum, t) => sum + t.credit, 0);

    return {
      totalSales,
      totalLoadings,
      totalPayments,
      totalDebits,
      totalCredits,
      netBalance: totalCredits - totalDebits,
      transactionCount: timeline.length
    };
  }, [timeline]);

  const handleExportPDF = () => {
    if (!customer) return;
    exportCustomerHistoryToPDF(customer, timeline, dateRange, summary);
  };

  if (!customer) return null;

  const getTransactionIcon = (type: TimelineTransaction['type']) => {
    switch (type) {
      case 'sale':
        return <ShoppingCart size={16} className="text-orange-400" />;
      case 'loading':
        return <Truck size={16} className="text-yellow-400" />;
      case 'payment':
        return <DollarSign size={16} className="text-green-400" />;
      default:
        return <FileText size={16} className="text-gray-400" />;
    }
  };

  const getTransactionColor = (type: TimelineTransaction['type']) => {
    switch (type) {
      case 'sale':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'loading':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'payment':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Customer History - ${customer.name}`}
      size="xl"
    >
      <div className="space-y-4">
        {/* Customer Info Bar */}
        <div className="glass rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Current Balance</p>
            <p className={`text-2xl font-bold ${customer.balance < 0 ? 'text-red-400' : 'text-green-400'}`}>
              {customer.balance < 0 ? '-' : '+'}{formatCurrency(Math.abs(customer.balance))}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleExportPDF}
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={timeline.length === 0}
            >
              <Download size={16} />
              <span>Export PDF</span>
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="glass rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-gray-400" />
            <h3 className="text-sm font-semibold">Date Range</h3>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => setDateRangePreset('today')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                dateRangePreset === 'today'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateRangePreset('this-month')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                dateRangePreset === 'this-month'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateRangePreset('last-month')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                dateRangePreset === 'last-month'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10'
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => setDateRangePreset('custom')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                dateRangePreset === 'custom'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10'
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* Custom Date Inputs */}
          {dateRangePreset === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">From Date</label>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">To Date</label>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Display Selected Range */}
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-xs text-muted">
              Showing: <span className="text-white font-medium">
                {dateRange.from.toLocaleDateString('en-GB')} - {dateRange.to.toLocaleDateString('en-GB')}
              </span>
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="glass rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <ShoppingCart size={16} className="text-orange-400" />
              <span className="text-xs text-muted">Sales</span>
            </div>
            <p className="text-lg font-bold text-orange-400">{formatCurrency(summary.totalSales)}</p>
          </div>

          <div className="glass rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <Truck size={16} className="text-yellow-400" />
              <span className="text-xs text-muted">Loadings</span>
            </div>
            <p className="text-lg font-bold text-yellow-400">{formatCurrency(summary.totalLoadings)}</p>
          </div>

          <div className="glass rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <DollarSign size={16} className="text-green-400" />
              <span className="text-xs text-muted">Payments</span>
            </div>
            <p className="text-lg font-bold text-green-400">{formatCurrency(summary.totalPayments)}</p>
          </div>

          <div className="glass rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              {summary.netBalance < 0 ? (
                <TrendingDown size={16} className="text-red-400" />
              ) : (
                <TrendingUp size={16} className="text-green-400" />
              )}
              <span className="text-xs text-muted">Net Balance</span>
            </div>
            <p className={`text-lg font-bold ${summary.netBalance < 0 ? 'text-red-400' : 'text-green-400'}`}>
              {summary.netBalance < 0 ? '-' : '+'}{formatCurrency(Math.abs(summary.netBalance))}
            </p>
          </div>
        </div>

        {/* Separate Ledger Entries and Loadings */}
        {(() => {
          const ledgerEntries = timeline.filter(t => t.type !== 'loading');
          const loadings = timeline.filter(t => t.type === 'loading');

          return (
            <div className="space-y-4">
              {/* Ledger Entries Section */}
              <div className="glass rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">
                    Ledger Entries - Sales & Payments ({ledgerEntries.length})
                  </h3>
                </div>

                {ledgerEntries.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="mx-auto mb-3 text-muted" size={36} />
                    <p className="text-muted text-sm">No ledger entries for this period</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                    {ledgerEntries.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="glass rounded-lg p-4 border border-white/5 hover:border-white/10 transition-colors"
                      >
                        {/* Transaction Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="mt-0.5">
                              {getTransactionIcon(transaction.type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs px-2 py-0.5 rounded border ${getTransactionColor(transaction.type)}`}>
                                  {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                                </span>
                                <span className="text-xs text-muted">
                                  {formatDate(transaction.date)}
                                </span>
                              </div>
                              <p className="text-sm font-medium">{transaction.description}</p>
                              {transaction.reference && (
                                <p className="text-xs text-muted">Ref: {transaction.reference}</p>
                              )}
                              {transaction.paymentMethod && (
                                <p className="text-xs text-muted">
                                  Method: {transaction.paymentMethod.replace('_', ' ').toUpperCase()}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            {transaction.debit > 0 && (
                              <p className="text-red-400 font-semibold">
                                {formatCurrency(transaction.debit)}
                              </p>
                            )}
                            {transaction.credit > 0 && (
                              <p className="text-green-400 font-semibold">
                                {formatCurrency(transaction.credit)}
                              </p>
                            )}
                            <p className="text-xs text-muted mt-1">
                              Balance: <span className={transaction.balance < 0 ? 'text-red-400' : 'text-green-400'}>
                                {transaction.balance < 0 ? '-' : '+'}{formatCurrency(Math.abs(transaction.balance))}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Transaction Items */}
                        {transaction.items && transaction.items.length > 0 && (
                          <div className="pt-3 border-t border-white/5">
                            <div className="flex flex-wrap gap-2">
                              {transaction.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className={`text-xs px-2 py-1 rounded border ${getTransactionColor(transaction.type)}`}
                                >
                                  <span className="font-medium">{item.productName}</span>
                                  <span className="ml-1">• {item.quantity} {item.unit}</span>
                                  <span className="text-muted ml-1">@ {formatCurrency(item.price)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Loadings Section */}
              <div className="glass rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">
                    Loadings ({loadings.length})
                  </h3>
                </div>

                {loadings.length === 0 ? (
                  <div className="text-center py-8">
                    <Truck className="mx-auto mb-3 text-muted" size={36} />
                    <p className="text-muted text-sm">No loadings for this period</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                    {loadings.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="glass rounded-lg p-4 border border-white/5 hover:border-white/10 transition-colors"
                      >
                        {/* Transaction Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="mt-0.5">
                              {getTransactionIcon(transaction.type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs px-2 py-0.5 rounded border ${getTransactionColor(transaction.type)}`}>
                                  {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                                </span>
                                <span className="text-xs text-muted">
                                  {formatDate(transaction.date)}
                                </span>
                              </div>
                              <p className="text-sm font-medium">{transaction.description}</p>
                              {transaction.reference && (
                                <p className="text-xs text-muted">Ref: {transaction.reference}</p>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            {transaction.items && transaction.items.length > 0 && (
                              <p className="text-yellow-400 font-semibold">
                                {formatCurrency(
                                  transaction.items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
                                )}
                              </p>
                            )}
                            <p className="text-xs text-muted mt-1">Total Value</p>
                          </div>
                        </div>

                        {/* Loading Items */}
                        {transaction.items && transaction.items.length > 0 && (
                          <div className="pt-3 border-t border-white/5">
                            <div className="flex flex-wrap gap-2">
                              {transaction.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className={`text-xs px-2 py-1 rounded border ${getTransactionColor(transaction.type)}`}
                                >
                                  <span className="font-medium">{item.productName}</span>
                                  <span className="ml-1">• {item.quantity} {item.unit}</span>
                                  <span className="text-muted ml-1">@ {formatCurrency(item.price)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

