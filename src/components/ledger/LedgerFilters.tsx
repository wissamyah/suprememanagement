import { Search } from 'lucide-react';

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
      <div className="relative flex-1 lg:flex-[1_1_0%] min-w-0">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={20} />
        <input
          type="text"
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-muted-text text-base"
          style={{ fontSize: '16px' }}
        />
      </div>

      <select
        className="px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 w-full lg:w-auto lg:flex-[0_0_200px] text-base"
        value={transactionFilter}
        onChange={(e) => setTransactionFilter(e.target.value)}
        style={{ fontSize: '16px' }}
      >
        <option value="all">All Transactions</option>
        <option value="payment">Payments</option>
        <option value="sale">Sales</option>
        <option value="credit_note">Credit Notes</option>
        <option value="opening_balance">Opening Balance</option>
        <option value="adjustment">Adjustments</option>
      </select>

      <div className="flex flex-col lg:flex-row gap-2 w-full lg:w-auto lg:flex-[0_0_auto]">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full lg:w-[160px] px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-base"
          placeholder="From Date"
          style={{ fontSize: '16px' }}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full lg:w-[160px] px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-base"
          placeholder="To Date"
          style={{ fontSize: '16px' }}
        />
      </div>
    </div>
  );
};