import { Search, Filter, Banknote, X, MapPin } from 'lucide-react';
import { NIGERIAN_STATES } from '../../constants/nigerianStates';

interface CustomerFiltersProps {
  searchTerm: string;
  stateFilter: string;
  balanceFilter: string;
  onSearchChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onBalanceChange: (value: string) => void;
}

export const CustomerFilters = ({
  searchTerm,
  stateFilter,
  balanceFilter,
  onSearchChange,
  onStateChange,
  onBalanceChange
}: CustomerFiltersProps) => {
  const hasActiveFilters = searchTerm || stateFilter || balanceFilter;
  const activeFilterCount = [searchTerm, stateFilter, balanceFilter].filter(Boolean).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Search Bar - Takes more space */}
      <div className="lg:col-span-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text pointer-events-none" size={18} />
          <input
            type="text"
            placeholder="Search by name or phone number..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-muted-text transition-all duration-200 text-base"
            style={{ fontSize: '16px' }}
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-text hover:text-gray-100 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Filters Container */}
      <div className="lg:col-span-7 flex flex-wrap items-center gap-3">
        {/* State Filter */}
        <div className="flex-1 min-w-[150px]">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text pointer-events-none" size={16} />
            <select
              value={stateFilter}
              onChange={(e) => onStateChange(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-base appearance-none cursor-pointer transition-all duration-200"
              style={{ fontSize: '16px' }}
            >
              <option value="">All States</option>
              {NIGERIAN_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-muted-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Balance Filter */}
        <div className="flex-1 min-w-[150px]">
          <div className="relative">
            <Banknote className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text pointer-events-none" size={16} />
            <select
              value={balanceFilter}
              onChange={(e) => onBalanceChange(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-base appearance-none cursor-pointer transition-all duration-200"
              style={{ fontSize: '16px' }}
            >
              <option value="">All Balances</option>
              <option value="positive">Positive Balance</option>
              <option value="negative">Negative Balance</option>
              <option value="zero">Zero Balance</option>
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-muted-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Filters Indicator & Clear Button */}
        {hasActiveFilters && (
          <div className="flex items-center gap-3 px-3 py-2 glass rounded-lg">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-primary" />
              <span className="text-sm font-medium">
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => {
                onSearchChange('');
                onStateChange('');
                onBalanceChange('');
              }}
              className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300 transition-colors font-medium"
            >
              <X size={14} />
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
};