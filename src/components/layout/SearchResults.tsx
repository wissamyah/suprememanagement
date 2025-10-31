import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Users,
  Package,
  ShoppingCart,
  Truck,
  TruckIcon,
  StickyNote,
  DollarSign,
  Plus,
  ShoppingBag
} from 'lucide-react';
import type {
  Customer,
  Supplier,
  Product,
  Sale,
  Loading,
  PaddyTruck,
  GroupedSearchResults,
  EntityType,
  LedgerEntry,
  BookedStock
} from '../../types';
import {
  navigateToSearchResult,
  getEntityTypeColor
} from '../../utils/searchNavigation';
import { formatCurrency } from '../../utils/customers';
import { NotesModal } from '../suppliers/NotesModal';
import { PaymentModal } from '../ledger/PaymentModal';
import { AddPaddyTruckModal } from '../paddytrucks/AddPaddyTruckModal';
import { AddSaleModal } from '../sales/AddSaleModal';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useCustomersDirect } from '../../hooks/useCustomersDirect';
import { usePaddyTrucks } from '../../hooks/usePaddyTrucks';
import { useSales } from '../../hooks/useSales';
import { useInventory } from '../../hooks/useInventory';
import { useToast } from '../../hooks/useToast';

interface SearchResultsProps {
  results: GroupedSearchResults;
  totalResults: number;
  onResultClick: () => void;
  selectedIndex: number;
  bookedStock: BookedStock[];
}

export const SearchResults = ({
  results,
  totalResults,
  onResultClick,
  selectedIndex,
  bookedStock
}: SearchResultsProps) => {
  const navigate = useNavigate();
  const { updateSupplier } = useSuppliers();
  const { addLedgerEntry } = useCustomersDirect();
  const { addPaddyTruck } = usePaddyTrucks();
  const { addSale } = useSales();
  const { products } = useInventory();
  const { customers } = useCustomersDirect();
  const { showSuccess, showError } = useToast();
  const [viewingNotesSupplier, setViewingNotesSupplier] = useState<Supplier | null>(null);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [quickTruckSupplier, setQuickTruckSupplier] = useState<Supplier | null>(null);
  const [quickSaleCustomer, setQuickSaleCustomer] = useState<Customer | null>(null);

  const handleResultClick = (type: EntityType, data: any) => {
    navigateToSearchResult(navigate, type, data);
    onResultClick();
  };

  const handleViewNotes = (supplier: Supplier, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    setViewingNotesSupplier(supplier);
  };

  const handleQuickPayment = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    setPaymentCustomer(customer);
  };

  const handleQuickTruck = (supplier: Supplier, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    setQuickTruckSupplier(supplier);
  };

  const handleQuickSale = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    setQuickSaleCustomer(customer);
  };

  const handleAddPayment = async (
    amount: number,
    paymentMethod: LedgerEntry['paymentMethod'],
    referenceNumber: string,
    notes: string,
    date: Date
  ) => {
    if (!paymentCustomer) return { success: false };

    const description = `Payment - ${paymentMethod === 'bank_transfer' ? 'Bank Transfer' : paymentMethod === 'cash' ? 'Cash' : 'Cheque'}`;

    const result = await addLedgerEntry(
      paymentCustomer.id,
      'payment',
      description,
      0, // debit
      amount, // credit
      undefined, // referenceId
      referenceNumber || undefined, // referenceNumber
      date,
      notes || undefined
    );

    if (result.success) {
      showSuccess(`Payment of ${formatCurrency(amount)} recorded for ${paymentCustomer.name}`);
      // Don't close the modal - let the user close it manually or make another payment
      // This keeps the search results visible and prevents the search bar from closing
      return { success: true };
    } else {
      showError(result.error || 'Failed to record payment');
      return { success: false };
    }
  };

  const handleAddPaddyTruck = async (
    date: Date,
    supplierId: string,
    supplierName: string,
    truckPlate: string,
    pricePerKg: number,
    agent: string,
    moistureLevel: number,
    waybillNumber?: string,
    netWeight?: number,
    deduction?: number,
    bags?: number
  ) => {
    const result = await addPaddyTruck(
      date,
      supplierId,
      supplierName,
      truckPlate,
      pricePerKg,
      agent,
      moistureLevel,
      waybillNumber,
      netWeight,
      deduction,
      bags
    );

    if (result.success) {
      showSuccess(`Paddy truck ${truckPlate} added successfully for ${supplierName}`);
      setQuickTruckSupplier(null);
      return { success: true };
    } else {
      showError(result.errors?.[0] || 'Failed to add paddy truck');
      return { success: false, errors: result.errors };
    }
  };

  const handleAddSale = async (
    customerId: string,
    date: Date,
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unit: string;
      price: number;
      total: number;
    }>,
    paymentStatus: 'pending' | 'partial' | 'paid'
  ) => {
    const result = await addSale(customerId, items, date, paymentStatus);

    if (result.success) {
      const customer = customers.find(c => c.id === customerId);
      showSuccess(`Sale added successfully for ${customer?.name || 'customer'}`);
      setQuickSaleCustomer(null);
      return { success: true };
    } else {
      showError(result.error || 'Failed to add sale');
      return { success: false, errors: result.error ? [result.error] : ['Failed to add sale'] };
    }
  };

  if (totalResults === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p className="text-lg mb-1">No results found</p>
        <p className="text-sm text-gray-500">Try searching with different keywords</p>
      </div>
    );
  }

  let currentIndex = 0;

  const renderCustomerResult = (result: any) => {
    const customer = result.data as Customer;
    const isSelected = currentIndex === selectedIndex;
    currentIndex++;

    return (
      <div
        key={customer.id}
        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'bg-white/10 border border-white/20'
            : 'hover:bg-white/5 border border-transparent'
        }`}
        onClick={() => handleResultClick('customer', customer)}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <User size={18} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded border ${getEntityTypeColor('customer')}`}>
                Customer
              </span>
              <button
                onClick={(e) => handleQuickSale(customer, e)}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 transition-colors"
                title="Quick Sale"
              >
                <ShoppingBag size={12} />
                <span>Sale</span>
              </button>
              <button
                onClick={(e) => handleQuickPayment(customer, e)}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors"
                title="Quick Payment"
              >
                <DollarSign size={12} />
                <span>Pay</span>
              </button>
            </div>
            <p className="text-white font-medium truncate">{customer.name}</p>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
              <span>{customer.phone}</span>
              <span>•</span>
              <span className={customer.balance < 0 ? 'text-red-400' : 'text-green-400'}>
                Balance: {formatCurrency(customer.balance)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSupplierResult = (result: any) => {
    const supplier = result.data as Supplier;
    const isSelected = currentIndex === selectedIndex;
    currentIndex++;

    return (
      <div
        key={supplier.id}
        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'bg-white/10 border border-white/20'
            : 'hover:bg-white/5 border border-transparent'
        }`}
        onClick={() => handleResultClick('supplier', supplier)}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <Users size={18} className="text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded border ${getEntityTypeColor('supplier')}`}>
                Supplier
              </span>
              <button
                onClick={(e) => handleQuickTruck(supplier, e)}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30 hover:bg-pink-500/30 transition-colors"
                title="Quick Paddy Truck"
              >
                <Plus size={12} />
                <span>Truck</span>
              </button>
              <button
                onClick={(e) => handleViewNotes(supplier, e)}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                title={supplier.notes ? "View Notes" : "Add Notes"}
              >
                <StickyNote size={12} />
                <span>Notes</span>
              </button>
            </div>
            <p className="text-white font-medium truncate">{supplier.name}</p>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
              <span>{supplier.phone}</span>
              {supplier.agent && (
                <>
                  <span>•</span>
                  <span>Agent: {supplier.agent}</span>
                </>
              )}
            </div>
            {supplier.notes && (
              <div className="mt-2 text-xs text-gray-500 italic truncate">
                "{supplier.notes.substring(0, 60)}{supplier.notes.length > 60 ? '...' : ''}"
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderProductResult = (result: any) => {
    const product = result.data as Product;
    const isSelected = currentIndex === selectedIndex;
    currentIndex++;

    // Find customers with pending/partial-loaded stock for this product
    const pendingStock = bookedStock.filter(
      b => b.productId === product.id &&
      (b.status === 'pending' || b.status === 'partial-loaded')
    );

    // Group by customer and sum quantities
    const customerPendingMap = new Map<string, { customerName: string; quantity: number; quantityLoaded: number; unit: string }>();
    pendingStock.forEach(stock => {
      const existing = customerPendingMap.get(stock.customerId);
      if (existing) {
        existing.quantity += stock.quantity;
        existing.quantityLoaded += stock.quantityLoaded;
      } else {
        customerPendingMap.set(stock.customerId, {
          customerName: stock.customerName,
          quantity: stock.quantity,
          quantityLoaded: stock.quantityLoaded,
          unit: stock.unit
        });
      }
    });

    const customersWithPending = Array.from(customerPendingMap.values());

    return (
      <div
        key={product.id}
        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'bg-white/10 border border-white/20'
            : 'hover:bg-white/5 border border-transparent'
        }`}
        onClick={() => handleResultClick('product', product)}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <Package size={18} className="text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded border ${getEntityTypeColor('product')}`}>
                Product
              </span>
            </div>
            <p className="text-white font-medium truncate">{product.name}</p>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
              <span>Category: {product.category}</span>
              <span>•</span>
              <span className={product.availableQuantity <= product.reorderLevel ? 'text-yellow-400' : 'text-gray-400'}>
                Available: {product.availableQuantity} {product.unit}
              </span>
            </div>

            {/* Display customers with pending stock */}
            {customersWithPending.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500">Pending Stock:</p>
                  <p className="text-xs font-semibold text-orange-400">
                    Total: {customersWithPending.reduce((sum, c) => sum + (c.quantity - c.quantityLoaded), 0)} {customersWithPending[0]?.unit}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customersWithPending.map((customer, idx) => {
                    const remainingQty = customer.quantity - customer.quantityLoaded;
                    return (
                      <div
                        key={idx}
                        className="text-xs px-2 py-1 rounded bg-orange-500/10 text-orange-300 border border-orange-500/20"
                        title={`${customer.customerName}: ${remainingQty} ${customer.unit} pending${customer.quantityLoaded > 0 ? ` (${customer.quantityLoaded} already loaded)` : ''}`}
                      >
                        <span className="font-medium">{customer.customerName}</span>
                        <span className="text-orange-400 ml-1">• {remainingQty} {customer.unit}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSaleResult = (result: any) => {
    const sale = result.data as Sale;
    const isSelected = currentIndex === selectedIndex;
    currentIndex++;

    const paymentStatusColors = {
      pending: 'text-red-400',
      partial: 'text-yellow-400',
      paid: 'text-green-400'
    };

    return (
      <div
        key={sale.id}
        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'bg-white/10 border border-white/20'
            : 'hover:bg-white/5 border border-transparent'
        }`}
        onClick={() => handleResultClick('sale', sale)}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <ShoppingCart size={18} className="text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded border ${getEntityTypeColor('sale')}`}>
                Sale
              </span>
            </div>
            <p className="text-white font-medium truncate">Order #{sale.orderId}</p>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
              <span>{sale.customerName}</span>
              <span>•</span>
              <span>{new Date(sale.date).toLocaleDateString()}</span>
              <span>•</span>
              <span>{formatCurrency(sale.totalAmount)}</span>
              <span>•</span>
              <span className={paymentStatusColors[sale.paymentStatus]}>
                {sale.paymentStatus.replace('-', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLoadingResult = (result: any) => {
    const loading = result.data as Loading;
    const isSelected = currentIndex === selectedIndex;
    currentIndex++;

    return (
      <div
        key={loading.id}
        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'bg-white/10 border border-white/20'
            : 'hover:bg-white/5 border border-transparent'
        }`}
        onClick={() => handleResultClick('loading', loading)}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <Truck size={18} className="text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded border ${getEntityTypeColor('loading')}`}>
                Loading
              </span>
            </div>
            <p className="text-white font-medium truncate">Loading #{loading.loadingId}</p>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
              <span>{loading.customerName}</span>
              <span>•</span>
              <span>Truck: {loading.truckPlateNumber}</span>
              <span>•</span>
              <span>{new Date(loading.date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPaddyTruckResult = (result: any) => {
    const paddyTruck = result.data as PaddyTruck;
    const isSelected = currentIndex === selectedIndex;
    currentIndex++;

    return (
      <div
        key={paddyTruck.id}
        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'bg-white/10 border border-white/20'
            : 'hover:bg-white/5 border border-transparent'
        }`}
        onClick={() => handleResultClick('paddyTruck', paddyTruck)}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <TruckIcon size={18} className="text-pink-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded border ${getEntityTypeColor('paddyTruck')}`}>
                Paddy Truck
              </span>
            </div>
            <p className="text-white font-medium truncate">Truck: {paddyTruck.truckPlate}</p>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
              <span>{paddyTruck.supplierName}</span>
              <span>•</span>
              <span>{new Date(paddyTruck.date).toLocaleDateString()}</span>
              <span>•</span>
              <span>{paddyTruck.weightAfterDeduction} kg</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-h-[calc(100vh-8rem)] sm:max-h-[70vh] overflow-y-auto custom-scrollbar py-3">
      {/* Customers */}
      {results.customers.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
            Customers ({results.customers.length})
          </h3>
          <div className="space-y-1 px-3">
            {results.customers.map((result) => renderCustomerResult(result))}
          </div>
        </div>
      )}

      {/* Suppliers */}
      {results.suppliers.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
            Suppliers ({results.suppliers.length})
          </h3>
          <div className="space-y-1 px-3">
            {results.suppliers.map((result) => renderSupplierResult(result))}
          </div>
        </div>
      )}

      {/* Products */}
      {results.products.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
            Products ({results.products.length})
          </h3>
          <div className="space-y-1 px-3">
            {results.products.map((result) => renderProductResult(result))}
          </div>
        </div>
      )}

      {/* Sales */}
      {results.sales.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
            Sales ({results.sales.length})
          </h3>
          <div className="space-y-1 px-3">
            {results.sales.map((result) => renderSaleResult(result))}
          </div>
        </div>
      )}

      {/* Loadings */}
      {results.loadings.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
            Loadings ({results.loadings.length})
          </h3>
          <div className="space-y-1 px-3">
            {results.loadings.map((result) => renderLoadingResult(result))}
          </div>
        </div>
      )}

      {/* Paddy Trucks */}
      {results.paddyTrucks.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
            Paddy Trucks ({results.paddyTrucks.length})
          </h3>
          <div className="space-y-1 px-3">
            {results.paddyTrucks.map((result) => renderPaddyTruckResult(result))}
          </div>
        </div>
      )}

      {/* Notes Modal */}
      <NotesModal
        isOpen={!!viewingNotesSupplier}
        supplier={viewingNotesSupplier}
        onClose={() => setViewingNotesSupplier(null)}
        onUpdate={updateSupplier}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={!!paymentCustomer}
        customerName={paymentCustomer?.name || ''}
        onClose={() => setPaymentCustomer(null)}
        onAdd={handleAddPayment}
      />

      {/* Quick Paddy Truck Modal */}
      <AddPaddyTruckModal
        isOpen={!!quickTruckSupplier}
        onClose={() => setQuickTruckSupplier(null)}
        onAdd={handleAddPaddyTruck}
        preSelectedSupplierId={quickTruckSupplier?.id}
      />

      {/* Quick Sale Modal */}
      <AddSaleModal
        isOpen={!!quickSaleCustomer}
        onClose={() => setQuickSaleCustomer(null)}
        onAdd={handleAddSale}
        products={products}
        customers={customers}
        preSelectedCustomerId={quickSaleCustomer?.id}
      />
    </div>
  );
};
