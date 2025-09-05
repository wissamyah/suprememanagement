import type { Product, InventoryMovement } from '../../types';
import { Package, AlertTriangle, Activity, TrendingUp } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface InventoryStatsProps {
  products: Product[];
  movements: InventoryMovement[];
}

export const InventoryStats = ({ products, movements }: InventoryStatsProps) => {
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => 
    p.status === 'low-stock' || p.status === 'out-of-stock'
  ).length;
  const totalStock = products.reduce((sum, p) => sum + p.quantityOnHand, 0);
  
  const todayMovements = movements.filter(m => {
    const today = new Date();
    const movementDate = new Date(m.date);
    return movementDate.toDateString() === today.toDateString();
  }).length;

  const recentProduction = movements
    .filter(m => m.movementType === 'production')
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted text-sm">Total Products</p>
            <p className="text-2xl font-bold mt-1">{totalProducts}</p>
          </div>
          <div className="p-3 glass rounded-lg">
            <Package size={24} className="text-blue-400" />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted text-sm">Low Stock Alerts</p>
            <p className="text-2xl font-bold mt-1">{lowStockProducts}</p>
            {lowStockProducts > 0 && (
              <p className="text-xs text-yellow-400 mt-1">Needs attention</p>
            )}
          </div>
          <div className="p-3 glass rounded-lg">
            <AlertTriangle size={24} className={lowStockProducts > 0 ? 'text-yellow-400' : 'text-green-400'} />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted text-sm">Total Stock</p>
            <p className="text-2xl font-bold mt-1">{totalStock.toLocaleString()} units</p>
          </div>
          <div className="p-3 glass rounded-lg">
            <TrendingUp size={24} className="text-green-400" />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted text-sm">Today's Movements</p>
            <p className="text-2xl font-bold mt-1">{todayMovements}</p>
            {recentProduction.length > 0 && (
              <p className="text-xs text-blue-400 mt-1">
                {recentProduction[0].quantity} units produced
              </p>
            )}
          </div>
          <div className="p-3 glass rounded-lg">
            <Activity size={24} className="text-purple-400" />
          </div>
        </div>
      </GlassCard>
    </div>
  );
};