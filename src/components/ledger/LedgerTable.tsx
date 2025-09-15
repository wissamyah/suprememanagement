import { LedgerTableEntry } from './LedgerTableEntry';
import type { LedgerEntry, Sale } from '../../types';

interface LedgerTableProps {
  entries: LedgerEntry[];
  sales: Sale[];
  customerId?: string;
  isDeletingId: string | null;
  onEdit: (entry: LedgerEntry) => void;
  onDelete: (entry: LedgerEntry) => void;
  pageTotalDebit: number;
  pageTotalCredit: number;
  totalDebit: number;
  totalCredit: number;
  balance: number;
  loading: boolean;
  searchTerm: string;
  transactionFilter: string;
  dateFrom: string;
  dateTo: string;
}

export const LedgerTable = ({
  entries,
  sales,
  customerId,
  isDeletingId,
  onEdit,
  onDelete,
  pageTotalDebit,
  pageTotalCredit,
  totalDebit,
  totalCredit,
  balance,
  loading,
  searchTerm,
  transactionFilter,
  dateFrom,
  dateTo
}: LedgerTableProps) => {
  const formatCurrency = (amount: number) => {
    return `₦${Math.abs(amount).toLocaleString()}`;
  };

  if (loading) {
    return (
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
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-20 text-muted">
        {searchTerm || transactionFilter !== 'all' || dateFrom || dateTo
          ? 'No transactions found matching your filters'
          : customerId
            ? 'No transactions for this customer yet'
            : 'No transactions recorded yet'}
      </div>
    );
  }

  return (
    <>
      {/* Mobile Cards View */}
      <div className="sm:hidden space-y-3">
        {entries.map((entry) => (
          <LedgerTableEntry
            key={entry.id}
            entry={entry}
            sales={sales}
            customerId={customerId}
            isDeletingId={isDeletingId}
            onEdit={onEdit}
            onDelete={onDelete}
            isMobile={true}
          />
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
            {entries.map((entry) => (
              <LedgerTableEntry
                key={entry.id}
                entry={entry}
                sales={sales}
                customerId={customerId}
                isDeletingId={isDeletingId}
                onEdit={onEdit}
                onDelete={onDelete}
                isMobile={false}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-800/30">
              <td colSpan={customerId ? 3 : 4} className="py-3 px-4 text-sm text-muted">Page Total</td>
              <td className="py-3 px-4 text-right text-sm text-red-400">
                {formatCurrency(pageTotalDebit)}
              </td>
              <td className="py-3 px-4 text-right text-sm text-green-400">
                {formatCurrency(pageTotalCredit)}
              </td>
              <td></td>
              {customerId && <td></td>}
            </tr>
            <tr className="border-t-2 border-gray-800/50 font-bold">
              <td colSpan={customerId ? 3 : 4} className="py-3 px-4">Overall Total</td>
              <td className="py-3 px-4 text-right text-red-400">
                {formatCurrency(totalDebit)}
              </td>
              <td className="py-3 px-4 text-right text-green-400">
                {formatCurrency(totalCredit)}
              </td>
              <td className={`py-3 px-4 text-right ${
                balance > 0
                  ? 'text-green-400'
                  : balance < 0
                    ? 'text-red-400'
                    : 'text-yellow-400'
              }`}>
                {formatCurrency(balance)}
              </td>
              {customerId && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
};