import { Search, UserCheck } from 'lucide-react';

interface SupplierFiltersProps {
  searchTerm: string;
  agentFilter: string;
  onSearchChange: (value: string) => void;
  onAgentChange: (value: string) => void;
  agents?: string[];
}

export const SupplierFilters = ({
  searchTerm,
  agentFilter,
  onSearchChange,
  onAgentChange,
  agents = []
}: SupplierFiltersProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={20} />
        <input
          type="text"
          placeholder="Search suppliers by name or phone..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-muted-text"
        />
      </div>
      
      {/* Agent Filter */}
      <div className="relative sm:w-48">
        <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-text" size={20} />
        <select 
          className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer"
          value={agentFilter}
          onChange={(e) => onAgentChange(e.target.value)}
        >
          <option value="all">All Agents</option>
          {agents.map(agent => (
            <option key={agent} value={agent}>{agent}</option>
          ))}
        </select>
      </div>
    </div>
  );
};