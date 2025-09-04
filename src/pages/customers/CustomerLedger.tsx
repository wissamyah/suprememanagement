import { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Search, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const ledgerEntries = [
  {
    id: 1,
    date: '2024-01-15',
    customer: 'Raj Kumar',
    description: 'Sale Invoice #INV-2024-001',
    debit: 45000,
    credit: 0,
    balance: 45000,
    type: 'sale'
  },
  {
    id: 2,
    date: '2024-01-14',
    customer: 'Raj Kumar',
    description: 'Payment Received',
    debit: 0,
    credit: 30000,
    balance: 15000,
    type: 'payment'
  },
  {
    id: 3,
    date: '2024-01-13',
    customer: 'Sharma Traders',
    description: 'Sale Invoice #INV-2024-002',
    debit: 32500,
    credit: 0,
    balance: 32500,
    type: 'sale'
  },
  {
    id: 4,
    date: '2024-01-12',
    customer: 'Gupta & Sons',
    description: 'Sale Invoice #INV-2024-003',
    debit: 67800,
    credit: 0,
    balance: 67800,
    type: 'sale'
  },
  {
    id: 5,
    date: '2024-01-12',
    customer: 'Gupta & Sons',
    description: 'Partial Payment',
    debit: 0,
    credit: 40000,
    balance: 27800,
    type: 'payment'
  },
  {
    id: 6,
    date: '2024-01-11',
    customer: 'Kumar Enterprises',
    description: 'Sale Invoice #INV-2024-004',
    debit: 125000,
    credit: 0,
    balance: 125000,
    type: 'sale'
  },
  {
    id: 7,
    date: '2024-01-11',
    customer: 'Kumar Enterprises',
    description: 'Full Payment',
    debit: 0,
    credit: 125000,
    balance: 0,
    type: 'payment'
  },
];

export const CustomerLedger = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  
  const totalDebit = ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0);
  const totalBalance = totalDebit - totalCredit;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Customer Ledger</h1>
          <p className="text-muted">Track customer transactions and balances</p>
        </div>
        <Button variant="primary">
          <Download size={20} />
          Export Ledger
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Total Receivable</p>
              <p className="text-2xl font-bold text-green-400">₦{totalDebit.toLocaleString()}</p>
            </div>
            <TrendingUp className="text-green-400" size={24} />
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Total Received</p>
              <p className="text-2xl font-bold text-blue-400">₦{totalCredit.toLocaleString()}</p>
            </div>
            <TrendingDown className="text-blue-400" size={24} />
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Outstanding Balance</p>
              <p className="text-2xl font-bold text-yellow-400">₦{totalBalance.toLocaleString()}</p>
            </div>
            <DollarSign className="text-yellow-400" size={24} />
          </div>
        </GlassCard>
      </div>
      
      <GlassCard>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
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
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
          >
            <option value="all">All Customers</option>
            <option value="raj">Raj Kumar</option>
            <option value="sharma">Sharma Traders</option>
            <option value="gupta">Gupta & Sons</option>
            <option value="kumar">Kumar Enterprises</option>
          </select>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-glass">
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Customer</th>
                <th className="text-left py-3 px-4">Description</th>
                <th className="text-right py-3 px-4">Debit (₦)</th>
                <th className="text-right py-3 px-4">Credit (₦)</th>
                <th className="text-right py-3 px-4">Balance (₦)</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-glass/50 hover:bg-glass transition-colors">
                  <td className="py-3 px-4">{entry.date}</td>
                  <td className="py-3 px-4 font-medium">{entry.customer}</td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-2">
                      {entry.description}
                      {entry.type === 'sale' && (
                        <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">Sale</span>
                      )}
                      {entry.type === 'payment' && (
                        <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">Payment</span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-green-400">
                    {entry.debit > 0 ? `₦${entry.debit.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-blue-400">
                    {entry.credit > 0 ? `₦${entry.credit.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold">
                    ₦{entry.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-glass font-bold">
                <td colSpan={3} className="py-3 px-4">Total</td>
                <td className="py-3 px-4 text-right text-green-400">₦{totalDebit.toLocaleString()}</td>
                <td className="py-3 px-4 text-right text-blue-400">₦{totalCredit.toLocaleString()}</td>
                <td className="py-3 px-4 text-right text-yellow-400">₦{totalBalance.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};