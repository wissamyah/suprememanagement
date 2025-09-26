import { Search, Calendar } from 'lucide-react';

interface LedgerFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  transactionFilter: string;
  setTransactionFilter: (value: string) => void;
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
}

export const LedgerFilters = ({
  searchTerm,
  setSearchTerm,
  transactionFilter,
  setTransactionFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo
}: LedgerFiltersProps) => {
  return (
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

      <div className="flex gap-2 w-full lg:w-auto">
        <div className="relative flex-1 lg:flex-initial">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full pl-10 pr-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            placeholder="From Date"
          />
        </div>
        <div className="relative flex-1 lg:flex-initial">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full pl-10 pr-3 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
            placeholder="To Date"
          />
        </div>
      </div>
    </div>
  );
};