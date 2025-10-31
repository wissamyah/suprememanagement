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
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {deliveries.length > 0 ? (
          deliveries.map((delivery) => (
            <div key={delivery.id} className="p-2.5 glass rounded-lg">
              {/* Header: Customer name with status and balance badges */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="font-semibold text-sm truncate flex-1 min-w-0">{delivery.customerName}</p>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap ${
                    delivery.status === 'confirmed'
                      ? 'bg-blue-500/20 text-blue-400'
                      : delivery.status === 'partial-loaded'
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {delivery.status === 'confirmed' ? 'Confirmed' : delivery.status === 'partial-loaded' ? 'Partial' : 'Pending'}
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap ${
                    delivery.balance < 0
                      ? 'bg-red-500/20 text-red-400'
                      : delivery.balance > 0
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {delivery.balance < 0 ? '-' : '+'}₦{Math.abs(delivery.balance).toLocaleString()}
                  </span>
                </div>
              </div>
              
              {/* Subtle product list */}
              <Tooltip
                content={<ProductTooltip items={delivery.products} />}
                placement="top"
              >
                <div className="text-xs text-gray-400/70 cursor-help">
                  <div className="flex items-center gap-2 flex-wrap">
                    {delivery.products.slice(0, 3).map((product, index) => (
                      <span key={index} className="truncate">
                        {product.productName} <span className="text-gray-500">({product.quantity})</span>
                        {index < Math.min(2, delivery.products.length - 1) && <span className="text-gray-600 mx-1">•</span>}
                      </span>
                    ))}
                    {delivery.products.length > 3 && (
                      <span className="text-gray-500">
                        +{delivery.products.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </Tooltip>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center py-4">No pending deliveries</p>
        )}
      </div>
    </GlassCard>
  );
};