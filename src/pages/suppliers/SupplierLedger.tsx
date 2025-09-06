import { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Search, Download, TrendingUp, Wallet, TrendingDown } from 'lucide-react';

const ledgerEntries = [
  {
    id: 1,
    date: '2024-01-15',
    supplier: 'Punjab Agro Industries',
    description: 'Paddy Purchase - 10,000 kg',
    debit: 0,
    credit: 280000,
    balance: 280000,
    type: 'purchase'
  },
  {
    id: 2,
    date: '2024-01-15',
    supplier: 'Punjab Agro Industries',
    description: 'Payment Made - Cheque #123456',
    debit: 200000,
    credit: 0,
    balance: 80000,
    type: 'payment'
  },
  {
    id: 3,
    date: '2024-01-14',
    supplier: 'Haryana Rice Mills',
    description: 'Paddy Purchase - 12,500 kg',
    debit: 0,
    credit: 343750,
    balance: 343750,
    type: 'purchase'
  },
  {
    id: 4,
    date: '2024-01-13',
    supplier: 'UP Grain Traders',
    description: 'Grain Purchase - Mixed',
    debit: 0,
    credit: 185000,
    balance: 185000,
    type: 'purchase'
  },
  {
    id: 5,
    date: '2024-01-13',
    supplier: 'UP Grain Traders',
    description: 'Advance Payment',
    debit: 100000,
    credit: 0,
    balance: 85000,
    type: 'payment'
  },
  {
    id: 6,
    date: '2024-01-12',
    supplier: 'Bihar Agricultural Co-op',
    description: 'Paddy Purchase - 10,800 kg',
    debit: 0,
    credit: 280800,
    balance: 280800,
    type: 'purchase'
  },
  {
    id: 7,
    date: '2024-01-12',
    supplier: 'Bihar Agricultural Co-op',
    description: 'Full Payment - Bank Transfer',
    debit: 280800,
    credit: 0,
    balance: 0,
    type: 'payment'
  },
];

export const SupplierLedger = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  
  const totalCredit = ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0);
  const totalDebit = ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalBalance = totalCredit - totalDebit;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Supplier Ledger</h1>
          <p className="text-muted">Track supplier transactions and payment history</p>
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
              <p className="text-sm text-muted">Total Payable</p>
              <p className="text-2xl font-bold text-red-400">₦{totalCredit.toLocaleString()}</p>
            </div>
            <TrendingDown className="text-red-400" size={24} />
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Total Paid</p>
              <p className="text-2xl font-bold text-green-400">₦{totalDebit.toLocaleString()}</p>
            </div>
            <TrendingUp className="text-green-400" size={24} />
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Outstanding Balance</p>
              <p className="text-2xl font-bold text-yellow-400">₦{totalBalance.toLocaleString()}</p>
            </div>
            <Wallet className="text-yellow-400" size={24} />
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
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
          >
            <option value="all">All Suppliers</option>
            <option value="punjab">Punjab Agro Industries</option>
            <option value="haryana">Haryana Rice Mills</option>
            <option value="up">UP Grain Traders</option>
            <option value="bihar">Bihar Agricultural Co-op</option>
          </select>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800/50">
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Supplier</th>
                <th className="text-left py-3 px-4">Description</th>
                <th className="text-right py-3 px-4">Debit (₦)</th>
                <th className="text-right py-3 px-4">Credit (₦)</th>
                <th className="text-right py-3 px-4">Balance (₦)</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-800/50/50 hover:bg-glass transition-colors">
                  <td className="py-3 px-4">{entry.date}</td>
                  <td className="py-3 px-4 font-medium">{entry.supplier}</td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-2">
                      {entry.description}
                      {entry.type === 'purchase' && (
                        <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">Purchase</span>
                      )}
                      {entry.type === 'payment' && (
                        <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">Payment</span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-green-400">
                    {entry.debit > 0 ? `₦${entry.debit.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-red-400">
                    {entry.credit > 0 ? `₦${entry.credit.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold">
                    ₦{entry.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-800/50 font-bold">
                <td colSpan={3} className="py-3 px-4">Total</td>
                <td className="py-3 px-4 text-right text-green-400">₦{totalDebit.toLocaleString()}</td>
                <td className="py-3 px-4 text-right text-red-400">₦{totalCredit.toLocaleString()}</td>
                <td className="py-3 px-4 text-right text-yellow-400">₦{totalBalance.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};