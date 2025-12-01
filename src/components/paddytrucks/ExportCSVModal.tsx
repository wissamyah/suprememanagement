import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Calendar } from 'lucide-react';

interface ExportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (dateFrom: string, dateTo: string) => void;
}

export const ExportCSVModal = ({ isOpen, onClose, onExport }: ExportCSVModalProps) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Reset to today when modal opens
  useEffect(() => {
    if (isOpen) {
      const today = getTodayString();
      setDateFrom(today);
      setDateTo(today);
    }
  }, [isOpen]);

  const handleTodayClick = () => {
    const today = getTodayString();
    setDateFrom(today);
    setDateTo(today);
  };

  const handleExport = () => {
    onExport(dateFrom, dateTo);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Export Paddy Trucks to CSV"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleExport}>
            Export CSV
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Select the date range for the trucks you want to export:
        </p>

        {/* Today Preset Button */}
        <button
          type="button"
          onClick={handleTodayClick}
          className="px-4 py-2 text-sm font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
        >
          Today
        </button>

        {/* Date Range Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full pl-10 pr-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
