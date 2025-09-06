import { useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { 
  Download, 
  Calendar, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  FileText,
  Filter,
  Printer
} from 'lucide-react';

const reportTypes = [
  {
    id: 1,
    title: 'Sales Report',
    description: 'Detailed sales analysis with customer breakdown',
    icon: <TrendingUp size={24} />,
    lastGenerated: '2024-01-14',
    frequency: 'Daily'
  },
  {
    id: 2,
    title: 'Inventory Report',
    description: 'Stock levels and movement analysis',
    icon: <BarChart3 size={24} />,
    lastGenerated: '2024-01-13',
    frequency: 'Weekly'
  },
  {
    id: 3,
    title: 'Financial Summary',
    description: 'Revenue, expenses, and profit analysis',
    icon: <PieChart size={24} />,
    lastGenerated: '2024-01-01',
    frequency: 'Monthly'
  },
  {
    id: 4,
    title: 'Customer Analysis',
    description: 'Customer behavior and purchase patterns',
    icon: <FileText size={24} />,
    lastGenerated: '2024-01-10',
    frequency: 'Monthly'
  },
];

const quickStats = [
  { label: 'Total Revenue (MTD)', value: '₦45,67,000', change: '+12.3%', positive: true },
  { label: 'Total Orders (MTD)', value: '342', change: '+8.5%', positive: true },
  { label: 'Avg Order Value', value: '₦13,350', change: '-2.1%', positive: false },
  { label: 'Customer Retention', value: '87%', change: '+3.2%', positive: true },
];

export const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedReport, setSelectedReport] = useState('');
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reports</h1>
          <p className="text-muted">Generate and view business reports and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">
            <Filter size={20} />
            Filters
          </Button>
          <Button variant="primary">
            <Download size={20} />
            Export All
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <GlassCard key={index}>
            <div>
              <p className="text-sm text-muted mb-1">{stat.label}</p>
              <p className="text-2xl font-bold mb-1">{stat.value}</p>
              <p className={`text-sm ${stat.positive ? 'text-green-400' : 'text-red-400'}`}>
                {stat.change} from last period
              </p>
            </div>
          </GlassCard>
        ))}
      </div>
      
      <GlassCard>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold">Available Reports</h2>
          <div className="flex gap-2">
            <select 
              className="px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportTypes.map((report) => (
            <div 
              key={report.id} 
              className="glass rounded-lg p-4 glass-hover cursor-pointer"
              onClick={() => setSelectedReport(report.title)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 glass rounded-lg">
                  {report.icon}
                </div>
                <span className="text-xs text-muted">{report.frequency}</span>
              </div>
              
              <h3 className="font-semibold text-lg mb-2">{report.title}</h3>
              <p className="text-sm text-muted mb-4">{report.description}</p>
              
              <div className="flex items-center justify-between pt-3 border-t border-gray-800/50">
                <p className="text-xs text-muted">
                  Last generated: {report.lastGenerated}
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Printer size={16} />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download size={16} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
      
      <GlassCard>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BarChart3 size={20} />
          Revenue Trend (Last 7 Days)
        </h2>
        
        <div className="h-64 flex items-end justify-between gap-2">
          {[65, 80, 45, 90, 75, 60, 85].map((height, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div 
                className="w-full bg-gradient-to-t from-blue-500/50 to-blue-400/50 rounded-t-lg transition-all duration-300 hover:from-blue-500/70 hover:to-blue-400/70"
                style={{ height: `${height}%` }}
              />
              <span className="text-xs text-muted">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <PieChart size={20} />
            Product Category Distribution
          </h2>
          
          <div className="space-y-3">
            {[
              { name: 'Rice Products', percentage: 45, color: 'bg-blue-500' },
              { name: 'Wheat & Flour', percentage: 25, color: 'bg-green-500' },
              { name: 'Pulses & Lentils', percentage: 15, color: 'bg-purple-500' },
              { name: 'Oil & Ghee', percentage: 10, color: 'bg-yellow-500' },
              { name: 'Others', percentage: 5, color: 'bg-red-500' },
            ].map((category, index) => (
              <div key={index}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">{category.name}</span>
                  <span className="text-sm font-semibold">{category.percentage}%</span>
                </div>
                <div className="w-full h-2 bg-dark-surface rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${category.color} transition-all duration-500`}
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
        
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Recent Activities
          </h2>
          
          <div className="space-y-3">
            {[
              { time: '2 hours ago', action: 'Sales report generated', user: 'Admin' },
              { time: '5 hours ago', action: 'Inventory report exported', user: 'Manager' },
              { time: '1 day ago', action: 'Financial summary created', user: 'Accountant' },
              { time: '2 days ago', action: 'Customer analysis completed', user: 'Admin' },
              { time: '3 days ago', action: 'Monthly report scheduled', user: 'System' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 glass rounded-lg">
                <div>
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-xs text-muted">by {activity.user}</p>
                </div>
                <span className="text-xs text-muted">{activity.time}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};