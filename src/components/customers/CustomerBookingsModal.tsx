import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertCircle, TrendingUp, Eye, EyeOff, CheckCircle, Clock } from 'lucide-react';
import { useBookedStock } from '../../hooks/useBookedStock';
import type { Customer, BookedStock } from '../../types';
import { formatDate } from '../../utils/dateFormatting';

interface CustomerBookingsModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
}

export const CustomerBookingsModal = ({ isOpen, customer, onClose }: CustomerBookingsModalProps) => {
  const [bookings, setBookings] = useState<BookedStock[]>([]);
  const [showFullyLoaded, setShowFullyLoaded] = useState(false);
  const { getBookedStockByCustomer } = useBookedStock();

  useEffect(() => {
    if (customer) {
      const customerBookings = getBookedStockByCustomer(customer.id);
      setBookings(customerBookings);
    }
  }, [customer, getBookedStockByCustomer]);

  if (!customer) return null;

  // Separate bookings into pending/partial and fully loaded
  const pendingBookings = bookings.filter(b =>
    b.status === 'pending' || b.status === 'confirmed' || b.status === 'partial-loaded'
  );

  const fullyLoadedBookings = bookings.filter(b =>
    b.status === 'fully-loaded'
  );

  // Calculate totals
  const totalPendingQuantity = pendingBookings.reduce((sum, booking) =>
    sum + (booking.quantity - booking.quantityLoaded), 0
  );

  const totalFullyLoadedQuantity = fullyLoadedBookings.reduce((sum, booking) =>
    sum + booking.quantity, 0
  );

  // Determine which bookings to display
  const displayBookings = showFullyLoaded ? [...pendingBookings, ...fullyLoadedBookings] : pendingBookings;

  const getStatusColor = (status: BookedStock['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'confirmed': return 'bg-blue-500/20 text-blue-400';
      case 'partial-loaded': return 'bg-orange-500/20 text-orange-400';
      case 'fully-loaded': return 'bg-green-500/20 text-green-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusIcon = (status: BookedStock['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'confirmed': return '✓';
      case 'partial-loaded': return '📦';
      case 'fully-loaded': return '✅';
      case 'cancelled': return '❌';
      default: return '•';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Booked Stock - ${customer.name}`}>
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Pending/Partial Summary */}
          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="text-gray-400" size={20} />
              <span className="text-xs text-muted">Pending</span>
            </div>
            <p className="text-xl font-bold">{pendingBookings.length}</p>
            <p className="text-sm text-muted">Active Bookings</p>
            {totalPendingQuantity > 0 && (
              <p className="text-sm font-semibold text-yellow-400 mt-1">
                {totalPendingQuantity} units remaining
              </p>
            )}
          </div>

          {/* Fully Loaded Summary */}
          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="text-green-400" size={20} />
              <span className="text-xs text-muted">Completed</span>
            </div>
            <p className="text-xl font-bold">{fullyLoadedBookings.length}</p>
            <p className="text-sm text-muted">Fully Loaded</p>
            {totalFullyLoadedQuantity > 0 && (
              <p className="text-sm font-semibold text-green-400 mt-1">
                {totalFullyLoadedQuantity} units delivered
              </p>
            )}
          </div>
        </div>

        {/* Toggle Button */}
        {fullyLoadedBookings.length > 0 && (
          <button
            onClick={() => setShowFullyLoaded(!showFullyLoaded)}
            className="w-full glass rounded-lg px-4 py-2 flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
          >
            {showFullyLoaded ? (
              <>
                <EyeOff size={16} />
                <span className="text-sm">Hide Fully Loaded ({fullyLoadedBookings.length})</span>
              </>
            ) : (
              <>
                <Eye size={16} />
                <span className="text-sm">Show Fully Loaded ({fullyLoadedBookings.length})</span>
              </>
            )}
          </button>
        )}

        {/* Section Headers and Bookings List */}
        {displayBookings.length === 0 && !showFullyLoaded ? (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto mb-3 text-muted" size={48} />
            <p className="text-muted">No pending bookings for this customer</p>
            {fullyLoadedBookings.length > 0 && (
              <p className="text-sm text-muted mt-2">
                Click "Show Fully Loaded" to view completed bookings
              </p>
            )}
          </div>
        ) : displayBookings.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto mb-3 text-muted" size={48} />
            <p className="text-muted">No bookings found for this customer</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Pending/Partial Section */}
            {pendingBookings.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-muted mb-2 flex items-center gap-2">
                  <Clock className="text-gray-400" size={14} />
                  Pending & Partially Loaded ({pendingBookings.length})
                </h4>
                <div className="space-y-3">
                  {pendingBookings.map((booking) => (
              <div key={booking.id} className="glass rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">{booking.productName}</h4>
                    <p className="text-sm text-muted">Order: {booking.orderId}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${getStatusColor(booking.status)}`}>
                    <span>{getStatusIcon(booking.status)}</span>
                    {booking.status.replace('-', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted">Quantity Booked:</span>
                    <p className="font-medium">{booking.quantity} {booking.unit}</p>
                  </div>
                  <div>
                    <span className="text-muted">Quantity Loaded:</span>
                    <p className="font-medium">{booking.quantityLoaded} {booking.unit}</p>
                  </div>
                  <div>
                    <span className="text-muted">Remaining:</span>
                    <p className="font-medium text-yellow-400">
                      {booking.quantity - booking.quantityLoaded} {booking.unit}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted">Booking Date:</span>
                    <p className="font-medium">
                      {formatDate(booking.bookingDate)}
                    </p>
                  </div>
                </div>

                {booking.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-800/50">
                    <p className="text-sm text-muted">Notes:</p>
                    <p className="text-sm">{booking.notes}</p>
                  </div>
                )}

                {booking.status === 'partial-loaded' && (
                  <div className="mt-3 pt-3 border-t border-gray-800/50">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="text-orange-400" size={16} />
                      <p className="text-sm text-orange-400">
                        {Math.round((booking.quantityLoaded / booking.quantity) * 100)}% loaded
                      </p>
                    </div>
                  </div>
                )}
              </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fully Loaded Section - Only shown when toggle is on */}
            {showFullyLoaded && fullyLoadedBookings.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-muted mb-2 flex items-center gap-2">
                  <CheckCircle size={14} />
                  Fully Loaded ({fullyLoadedBookings.length})
                </h4>
                <div className="space-y-3">
                  {fullyLoadedBookings.map((booking) => (
                    <div key={booking.id} className="glass rounded-lg p-4 opacity-75">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-lg">{booking.productName}</h4>
                          <p className="text-sm text-muted">Order: {booking.orderId}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${getStatusColor(booking.status)}`}>
                          <span>{getStatusIcon(booking.status)}</span>
                          {booking.status.replace('-', ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted">Quantity Delivered:</span>
                          <p className="font-medium text-green-400">{booking.quantity} {booking.unit}</p>
                        </div>
                        <div>
                          <span className="text-muted">Completion Date:</span>
                          <p className="font-medium">
                            {formatDate(booking.updatedAt)}
                          </p>
                        </div>
                      </div>

                      {booking.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-800/50">
                          <p className="text-sm text-muted">Notes:</p>
                          <p className="text-sm">{booking.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-800/50">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};