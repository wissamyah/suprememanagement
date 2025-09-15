import { GlassCard } from '../ui/GlassCard';
import { TrendingUp } from 'lucide-react';

interface Product {
  name: string;
  quantity: number;
  revenue: number;
}

interface TopSellingProductsProps {
  products: Product[];
}

export const TopSellingProducts = ({ products }: TopSellingProductsProps) => {
  return (
    <GlassCard>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <TrendingUp size={20} />
        Top Selling Products
      </h2>
      <div className="space-y-3">
        {products.length > 0 ? (
          products.map((product, index) => (
            <div key={index} className="flex items-center justify-between p-3 glass rounded-lg">
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-gray-400">{product.quantity} units sold</p>
              </div>
              <p className="text-green-400 font-semibold">₦{product.revenue.toLocaleString()}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center py-4">No sales data available</p>
        )}
      </div>
    </GlassCard>
  );
};