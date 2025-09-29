import { GlassCard } from '../ui/GlassCard';
import { Tooltip, ProductTooltip } from '../ui/Tooltip';
import { Truck } from 'lucide-react';

interface Delivery {
  id: string;
  orderId: string;
  customerName: string;
  status: string;
  items: number;
  balance: number;
  products: Array<{
    productName: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

interface PendingDeliveriesProps {
  deliveries: Delivery[];
}

export const PendingDeliveries = ({ deliveries }: PendingDeliveriesProps) => {
  // Calculate product breakdown across all deliveries
  const productBreakdown = deliveries.reduce((breakdown, delivery) => {
    delivery.products.forEach(product => {
      if (!breakdown[product.productName]) {
        breakdown[product.productName] = { productName: product.productName, quantity: 0 };
      }
      breakdown[product.productName].quantity += product.quantity;
    });
    return breakdown;
  }, {} as Record<string, { productName: string; quantity: number }>);

  const productBreakdownArray = Object.values(productBreakdown).sort((a, b) =>
    b.quantity - a.quantity
  );

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <Truck size={20} />
        <Tooltip
          content={
            <div className="min-w-[240px]">
              <div className="text-xs font-semibold mb-2 text-white/80">Product Breakdown</div>
              {productBreakdownArray.length > 0 ? (
                <div className="space-y-1.5">
                  {productBreakdownArray.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <span className="text-white/90">{item.productName}</span>
                      <span className="font-medium text-blue-400">{item.quantity} units</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/60">No pending deliveries</p>
              )}
            </div>
          }
          placement="bottom"
        >
          <h2 className="text-xl font-semibold cursor-help">Pending Deliveries</h2>
        </Tooltip>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {deliveries.length > 0 ? (
          deliveries.map((delivery) => (
            <div key={delivery.id} className="p-3 glass rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">Order {delivery.orderId}</p>
                  <p className="text-sm text-gray-400">Customer: {delivery.customerName}</p>
                  <Tooltip
                    content={<ProductTooltip items={delivery.products} />}
                    placement="top"
                  >
                    <p className="text-xs text-gray-500 cursor-help underline decoration-dotted">
                      {delivery.items} item{delivery.items > 1 ? 's' : ''}
                    </p>
                  </Tooltip>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  delivery.status === 'confirmed'
                    ? 'bg-blue-500/20 text-blue-400'
                    : delivery.status === 'partial-loaded'
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {delivery.status === 'confirmed' ? 'Confirmed' : delivery.status === 'partial-loaded' ? 'Partial Loaded' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-end">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  delivery.balance < 0
                    ? 'bg-red-500/20 text-red-400'
                    : delivery.balance > 0
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  ₦{Math.abs(delivery.balance).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center py-4">No pending deliveries</p>
        )}
      </div>
    </GlassCard>
  );
};