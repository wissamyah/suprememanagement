import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Users, Package, Calendar, AlertCircle } from 'lucide-react';
import { useBookedStock } from '../../hooks/useBookedStock';
import type { Product, BookedStock } from '../../types';

interface BookedStockModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
}

export const BookedStockModal = ({ isOpen, product, onClose }: BookedStockModalProps) => {
  const [bookings, setBookings] = useState<BookedStock[]>([]);
  const { getBookedStockByProduct } = useBookedStock();

  useEffect(() => {
    if (product) {
      const productBookings = getBookedStockByProduct(product.id);
      setBookings(productBookings);
    }
  }, [product, getBookedStockByProduct]);

  if (!product) return null;

  const totalBookedQuantity = bookings.reduce((sum, booking) => 
    sum + (booking.quantity - booking.quantityLoaded), 0
  );

  // Group bookings by customer
  const customerGroups = bookings.reduce((groups, booking) => {
    if (!groups[booking.customerId]) {
      groups[booking.customerId] = {
        customerName: booking.customerName,
        bookings: [],
        totalQuantity: 0
      };
    }
    groups[booking.customerId].bookings.push(booking);
    groups[booking.customerId].totalQuantity += (booking.quantity - booking.quantityLoaded);
    return groups;
  }, {} as Record<string, { customerName: string; bookings: BookedStock[]; totalQuantity: number }>);

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Booked Stock Details - ${product.name}`}>
      <div className="space-y-4">
        {/* Summary Card */}
        <div className="glass rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted">On Hand</p>
              <p className="text-xl font-bold">{product.quantityOnHand} {product.unit}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Booked</p>
              <p className="text-xl font-bold text-yellow-400">{totalBookedQuantity} {product.unit}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Available</p>
              <p className="text-xl font-bold text-green-400">
                {product.quantityOnHand - totalBookedQuantity} {product.unit}
              </p>
            </div>
          </div>
        </div>

        {/* Customer-wise Bookings */}
        {bookings.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto mb-3 text-muted" size={48} />
            <p className="text-muted">No active bookings for this product</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {Object.entries(customerGroups).map(([customerId, group]) => (
              <div key={customerId} className="glass rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="text-blue-400" size={18} />
                    <h4 className="font-semibold">{group.customerName}</h4>
                  </div>
                  <span className="text-sm font-medium text-yellow-400">
                    Total: {group.totalQuantity} {product.unit}
                  </span>
                </div>

                <div className="space-y-2">
                  {group.bookings.map((booking) => (
                    <div key={booking.id} className="pl-6 py-2 border-l-2 border-gray-700">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm">Order: {booking.orderId}</p>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                              {booking.status.replace('-', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted">
                            <span className="flex items-center gap-1">
                              <Package size={12} />
                              {booking.quantity} {booking.unit}
                            </span>
                            {booking.quantityLoaded > 0 && (
                              <span>Loaded: {booking.quantityLoaded}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(booking.bookingDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {booking.quantity - booking.quantityLoaded} {booking.unit}
                          </p>
                          <p className="text-xs text-muted">remaining</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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