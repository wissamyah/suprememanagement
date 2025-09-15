import { GlassCard } from '../ui/GlassCard';
import { Tooltip, ProductTooltip } from '../ui/Tooltip';
import { Truck } from 'lucide-react';

interface Delivery {
  id: string;
  orderId: string;
  customerName: string;
  status: string;
  items: number;
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
  return (
    <GlassCard>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Truck size={20} />
        Pending Deliveries
      </h2>
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
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center py-4">No pending deliveries</p>
        )}
      </div>
    </GlassCard>
  );
};