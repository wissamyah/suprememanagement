import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Package, AlertCircle, TrendingUp } from 'lucide-react';
import { useBookedStock } from '../../hooks/useBookedStock';
import type { Customer, BookedStock } from '../../types';

interface CustomerBookingsModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
}

export const CustomerBookingsModal = ({ isOpen, customer, onClose }: CustomerBookingsModalProps) => {
  const [bookings, setBookings] = useState<BookedStock[]>([]);
  const { getBookedStockByCustomer } = useBookedStock();

  useEffect(() => {
    if (customer) {
      const customerBookings = getBookedStockByCustomer(customer.id);
      setBookings(customerBookings);
    }
  }, [customer, getBookedStockByCustomer]);

  if (!customer) return null;

  const totalBookedQuantity = bookings.reduce((sum, booking) => 
    sum + (booking.quantity - booking.quantityLoaded), 0
  );

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
        {/* Summary Card */}
        <div className="glass rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Total Active Bookings</p>
              <p className="text-2xl font-bold">{bookings.length}</p>
            </div>
            <Package className="text-blue-400" size={24} />
          </div>
          {totalBookedQuantity > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-800/50">
              <p className="text-sm text-muted">Total Quantity Booked</p>
              <p className="text-lg font-semibold text-yellow-400">{totalBookedQuantity} units</p>
            </div>
          )}
        </div>

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto mb-3 text-muted" size={48} />
            <p className="text-muted">No active bookings for this customer</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {bookings.map((booking) => (
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
                      {new Date(booking.bookingDate).toLocaleDateString()}
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