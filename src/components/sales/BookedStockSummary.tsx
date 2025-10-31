import { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Package, Users, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { useBookedStock } from '../../hooks/useBookedStock';
import { Tooltip } from '../ui/Tooltip';
import type { BookedStock } from '../../types';
import { formatDate } from '../../utils/dateFormatting';

export const BookedStockSummary = () => {
  const { bookedStock } = useBookedStock();
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  // Filter only active bookings
  const activeBookings = bookedStock.filter(booking => 
    ['pending', 'confirmed', 'partial-loaded'].includes(booking.status)
  );

  // Group bookings by customer
  const customerGroups = activeBookings.reduce((groups, booking) => {
    if (!groups[booking.customerId]) {
      groups[booking.customerId] = {
        customerName: booking.customerName,
        bookings: [],
        totalQuantity: 0,
        productTypes: new Set<string>()
      };
    }
    groups[booking.customerId].bookings.push(booking);
    groups[booking.customerId].totalQuantity += (booking.quantity - booking.quantityLoaded);
    groups[booking.customerId].productTypes.add(booking.productName);
    return groups;
  }, {} as Record<string, { 
    customerName: string; 
    bookings: BookedStock[]; 
    totalQuantity: number;
    productTypes: Set<string>;
  }>);

  const totalActiveBookings = activeBookings.length;
  const totalCustomersWithBookings = Object.keys(customerGroups).length;
  const totalBookedQuantity = activeBookings.reduce((sum, booking) =>
    sum + (booking.quantity - booking.quantityLoaded), 0
  );

  // Calculate product breakdown for tooltip
  const productBreakdown = activeBookings.reduce((breakdown, booking) => {
    const remaining = booking.quantity - booking.quantityLoaded;
    const key = `${booking.productName}`;
    if (!breakdown[key]) {
      breakdown[key] = { productName: booking.productName, quantity: 0, unit: booking.unit };
    }
    breakdown[key].quantity += remaining;
    return breakdown;
  }, {} as Record<string, { productName: string; quantity: number; unit: string }>);

  const productBreakdownArray = Object.values(productBreakdown).sort((a, b) =>
    b.quantity - a.quantity
  );

  const getStatusColor = (status: BookedStock['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'confirmed': return 'bg-blue-500/20 text-blue-400';
      case 'partial-loaded': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (activeBookings.length === 0) {
    return (
      <GlassCard className="max-w-full overflow-x-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Booked Stock Summary</h2>
          <Package className="text-blue-400" size={24} />
        </div>
        <div className="text-center py-8">
          <AlertCircle className="mx-auto mb-3 text-muted" size={48} />
          <p className="text-muted">No active bookings at the moment</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between mb-6 max-w-full">
        <h2 className="text-xl font-semibold truncate">Booked Stock Summary</h2>
        <Package className="text-blue-400 flex-shrink-0" size={24} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-full w-full">
        <div className="glass rounded-lg p-3 min-w-0 max-w-full w-full">
          <div className="flex items-center gap-2 text-sm text-muted mb-1">
            <Users size={16} className="flex-shrink-0" />
            <span className="truncate">Customers with Bookings</span>
          </div>
          <p className="text-2xl font-bold break-all">{totalCustomersWithBookings}</p>
        </div>
        <div className="glass rounded-lg p-3 min-w-0 max-w-full w-full">
          <div className="flex items-center gap-2 text-sm text-muted mb-1">
            <Package size={16} className="flex-shrink-0" />
            <span className="truncate">Active Bookings</span>
          </div>
          <p className="text-2xl font-bold break-all">{totalActiveBookings}</p>
        </div>
        <div className="min-w-0 max-w-full w-full">
          <Tooltip
            content={
              <div className="w-full max-w-[240px]">
                <div className="text-xs font-semibold mb-2 text-white/80">Product Breakdown</div>
                <div className="space-y-1.5">
                  {productBreakdownArray.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-xs gap-2">
                      <span className="text-white/90 truncate">{item.productName}</span>
                      <span className="font-medium text-yellow-400 flex-shrink-0">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            }
            placement="bottom"
          >
            <div className="glass rounded-lg p-3 cursor-help min-w-0 w-full">
              <div className="flex items-center gap-2 text-sm text-muted mb-1">
                <TrendingUp size={16} className="flex-shrink-0" />
                <span className="truncate">Total Quantity Booked</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400 break-all">{totalBookedQuantity}</p>
            </div>
          </Tooltip>
        </div>
      </div>

      {/* Customer-wise Bookings */}
      <div className="space-y-3 max-h-96 overflow-y-auto overflow-x-hidden w-full">
        {Object.entries(customerGroups).map(([customerId, group]) => (
          <div key={customerId} className="glass rounded-lg p-4 w-full max-w-full overflow-x-hidden">
            <div
              className="flex justify-between items-start cursor-pointer gap-2 w-full"
              onClick={() => setExpandedCustomer(expandedCustomer === customerId ? null : customerId)}
            >
              <div className="flex-1 min-w-0 overflow-x-hidden">
                <div className="flex items-center gap-2 mb-2 min-w-0">
                  <Users className="text-blue-400 flex-shrink-0" size={18} />
                  <h3 className="font-semibold text-lg truncate min-w-0">{group.customerName}</h3>
                </div>
                <div className="flex flex-wrap gap-3 text-sm w-full">
                  <div className="whitespace-nowrap">
                    <span className="text-muted">Products: </span>
                    <span className="font-medium">{group.productTypes.size}</span>
                  </div>
                  <div className="whitespace-nowrap">
                    <span className="text-muted">Bookings: </span>
                    <span className="font-medium">{group.bookings.length}</span>
                  </div>
                  <div className="whitespace-nowrap">
                    <span className="text-muted">Qty: </span>
                    <span className="font-medium text-yellow-400">{group.totalQuantity}</span>
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted flex-shrink-0">
                {expandedCustomer === customerId ? '▲' : '▼'}
              </div>
            </div>

            {/* Expanded Details */}
            {expandedCustomer === customerId && (
              <div className="mt-4 pt-4 border-t border-gray-800/50 space-y-2 w-full">
                {group.bookings.map((booking) => (
                  <div key={booking.id} className="flex justify-between items-center py-2 px-3 glass rounded gap-2 w-full max-w-full overflow-x-hidden">
                    <div className="flex-1 min-w-0 overflow-x-hidden">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <p className="font-medium truncate min-w-0">{booking.productName}</p>
                        <span className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap flex-shrink-0 ${getStatusColor(booking.status)}`}>
                          {booking.status.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted min-w-0">
                        <span className="truncate min-w-0" title={booking.orderId}>Order: {booking.orderId}</span>
                        <span className="flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                          <Calendar className="text-gray-400" size={12} />
                          {formatDate(booking.bookingDate)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 min-w-0">
                      <p className="font-medium whitespace-nowrap text-sm">
                        {booking.quantity - booking.quantityLoaded} {booking.unit}
                      </p>
                      {booking.quantityLoaded > 0 && (
                        <p className="text-xs text-muted whitespace-nowrap">
                          {booking.quantityLoaded} loaded
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
};