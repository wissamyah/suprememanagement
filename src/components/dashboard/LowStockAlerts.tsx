import { GlassCard } from '../ui/GlassCard';
import { AlertTriangle } from 'lucide-react';
import type { Product } from '../../types';

interface LowStockAlertsProps {
  products: Product[];
}

export const LowStockAlerts = ({ products }: LowStockAlertsProps) => {
  const lowStockProducts = products.filter(p => p.status === 'low-stock' || p.status === 'out-of-stock').slice(0, 5);

  return (
    <GlassCard>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <AlertTriangle size={20} />
        Low Stock Alerts
      </h2>
      <div className="space-y-3">
        {lowStockProducts.length > 0 ? (
          lowStockProducts.map((product) => (
            <div key={product.id} className="flex items-center justify-between p-3 glass rounded-lg">
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-gray-400">{product.category}</p>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${
                  product.status === 'out-of-stock' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {product.quantityOnHand} {product.unit}
                </p>
                <p className="text-xs text-gray-500">
                  {product.status === 'out-of-stock' ? 'Out of Stock' : 'Low Stock'}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center py-4">All products are well stocked</p>
        )}
      </div>
    </GlassCard>
  );
};