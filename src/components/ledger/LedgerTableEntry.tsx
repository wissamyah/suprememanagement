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
          <div className={isMobile ? "text-sm mb-3" : "leading-tight"}>
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
          </div>
        );
      }
      return <div className={isMobile ? "text-sm mb-3" : "leading-tight"}>{entry.description}</div>;
    }
    return <div className={isMobile ? "text-sm mb-3" : "leading-tight"}>{entry.description}</div>;
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
              {formatDate(entry.date)}
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

        {renderDescription()}

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

        {renderActions()}
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
        <div>
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