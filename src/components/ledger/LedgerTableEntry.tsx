import { Edit2, Trash2, RefreshCw } from 'lucide-react';
import { Tooltip, ProductTooltip } from '../ui/Tooltip';
import type { LedgerEntry, Sale } from '../../types';
import { formatDate } from '../../utils/dateFormatting';

interface LedgerTableEntryProps {
  entry: LedgerEntry;
  sales: Sale[];
  customerId?: string;
  isDeletingId: string | null;
  onEdit: (entry: LedgerEntry) => void;
  onDelete: (entry: LedgerEntry) => void;
  isMobile?: boolean;
}

export const LedgerTableEntry = ({
  entry,
  sales,
  customerId,
  isDeletingId,
  onEdit,
  onDelete,
  isMobile = false
}: LedgerTableEntryProps) => {
  const formatCurrency = (amount: number) => {
    return `₦${Math.abs(amount).toLocaleString()}`;
  };

  const getTransactionTypeLabel = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const renderDescription = () => {
    if (entry.transactionType === 'sale') {
      const orderMatch = entry.description.match(/#?(ORD-\d+-\d+)/i);
      const orderId = orderMatch ? orderMatch[1] : null;
      const sale = orderId ? sales.find(s => s.orderId === orderId) : null;

      if (sale && sale.items && sale.items.length > 0 && orderId) {
        const parts = entry.description.split(orderId);
        return (
          <>
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
          </>
        );
      }
      return entry.description;
    }
    return entry.description;
  };

  const renderActions = () => {
    if (!customerId) return null;

    if (entry.transactionType === 'sale') {
      if (isMobile) {
        return (
          <div className="flex gap-2 justify-end border-t border-white/5 pt-3">
            <p className="text-xs text-muted italic">Sales can only be edited from the Sales page</p>
          </div>
        );
      }
      return (
        <div className="text-center">
          <span className="text-xs text-muted italic">Via Sales</span>
        </div>
      );
    }

    return (
      <div className={isMobile ? "flex gap-2 justify-end border-t border-white/5 pt-3" : "flex justify-center gap-1"}>
        {entry.transactionType !== 'payment' && (
          <button
            onClick={() => onEdit(entry)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200"
            title="Edit Entry"
          >
            <Edit2 size={isMobile ? 16 : 14} />
          </button>
        )}
        <button
          onClick={() => onDelete(entry)}
          disabled={isDeletingId === entry.id}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200 disabled:opacity-50"
          title="Delete Entry"
        >
          {isDeletingId === entry.id ? (
            <RefreshCw size={isMobile ? 16 : 14} className="animate-spin" />
          ) : (
            <Trash2 size={isMobile ? 16 : 14} className="text-red-400" />
          )}
        </button>
      </div>
    );
  };

  if (isMobile) {
    return (
      <div
        className={`glass rounded-lg p-2 ${
          entry.runningBalance > 0
            ? 'bg-green-500/5'
            : entry.runningBalance < 0
              ? 'bg-red-500/5'
              : ''
        }`}
      >
        {/* Compact Header: Customer, Date, Type, Balance, Actions - All in One Line */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              {!customerId && (
                <span className="font-bold text-sm truncate">
                  {entry.customerName}
                </span>
              )}
              <span className="text-[10px] text-muted whitespace-nowrap">
                {formatDate(entry.date)}
              </span>
              <span className={`px-1.5 py-0.5 text-[9px] rounded leading-none ${
                entry.transactionType === 'payment'
                  ? 'bg-green-500/20 text-green-400'
                  : entry.transactionType === 'sale'
                    ? 'bg-red-500/20 text-red-400'
                    : entry.transactionType === 'credit_note'
                      ? 'bg-blue-500/20 text-blue-400'
                      : entry.transactionType === 'opening_balance'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-gray-500/20 text-gray-400'
              }`}>
                {getTransactionTypeLabel(entry.transactionType)}
              </span>
            </div>
          </div>
          
          {/* Balance & Actions on Same Line */}
          <div className="flex items-center gap-1.5">
            <div className="text-right">
              <div className={`font-bold text-sm leading-none ${
                entry.runningBalance > 0
                  ? 'text-green-400'
                  : entry.runningBalance < 0
                    ? 'text-red-400'
                    : 'text-yellow-400'
              }`}>
                {formatCurrency(entry.runningBalance)}
              </div>
              {entry.runningBalance !== 0 && (
                <div className="text-[8px] text-muted leading-none mt-0.5">
                  {entry.runningBalance < 0 ? 'Owes' : 'Credit'}
                </div>
              )}
            </div>
            
            {/* Actions */}
            {customerId && entry.transactionType !== 'sale' && (
              <div className="flex gap-0.5">
                {entry.transactionType !== 'payment' && (
                  <button
                    onClick={() => onEdit(entry)}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={13} />
                  </button>
                )}
                <button
                  onClick={() => onDelete(entry)}
                  disabled={isDeletingId === entry.id}
                  className="p-1 rounded hover:bg-white/10 transition-colors text-red-400 hover:text-red-300 disabled:opacity-50"
                  title="Delete"
                >
                  {isDeletingId === entry.id ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Description - Compact Single Line */}
        <div className="text-[11px] leading-tight text-gray-300 mb-1">
          {renderDescription()}
        </div>

        {/* Inline Debit/Credit - Only Show What Exists */}
        <div className="flex items-center gap-3 text-[10px]">
          {entry.debit > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-muted">Dr:</span>
              <span className="font-medium text-red-400">
                {formatCurrency(entry.debit)}
              </span>
            </div>
          )}
          {entry.credit > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-muted">Cr:</span>
              <span className="font-medium text-green-400">
                {formatCurrency(entry.credit)}
              </span>
            </div>
          )}
          {entry.notes && (
            <>
              <span className="text-muted">•</span>
              <span className="text-muted italic truncate flex-1">{entry.notes}</span>
            </>
          )}
          {customerId && entry.transactionType === 'sale' && (
            <>
              <span className="text-muted">•</span>
              <span className="text-muted italic text-[9px]">Via Sales</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <tr
      className={`border-b border-gray-800/30 hover:bg-glass transition-colors ${
        entry.runningBalance > 0
          ? 'bg-green-500/5'
          : entry.runningBalance < 0
            ? 'bg-red-500/5'
            : ''
      }`}
    >
      <td className="py-1.5 px-2 text-xs">
        {formatDate(entry.date)}
      </td>
      {!customerId && (
        <td className="py-1.5 px-2 text-xs font-medium">{entry.customerName}</td>
      )}
      <td className="py-1.5 px-2 text-xs">
        <div className="leading-tight">
          {renderDescription()}
          {entry.notes && (
            <div className="text-[10px] text-muted mt-0.5">{entry.notes}</div>
          )}
        </div>
      </td>
      <td className="py-1.5 px-2">
        <span className={`px-1 py-0.5 text-[10px] rounded ${
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
      <td className="py-1.5 px-2 text-right text-xs font-medium text-red-400">
        {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
      </td>
      <td className="py-1.5 px-2 text-right text-xs font-medium text-green-400">
        {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
      </td>
      <td className={`py-1.5 px-2 text-right text-xs font-bold ${
        entry.runningBalance < 0
          ? 'text-red-400'
          : entry.runningBalance > 0
            ? 'text-green-400'
            : 'text-yellow-400'
      }`}>
        {formatCurrency(Math.abs(entry.runningBalance))}
        {entry.runningBalance < 0 && (
          <span className="text-[10px] block text-red-400">Owes</span>
        )}
        {entry.runningBalance > 0 && (
          <span className="text-[10px] block text-green-400">Credit</span>
        )}
      </td>
      {customerId && (
        <td className="py-1.5 px-2">
          {renderActions()}
        </td>
      )}
    </tr>
  );
};