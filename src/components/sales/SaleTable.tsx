import { useState, useMemo, useEffect } from 'react';
import { Edit2, Trash2, Eye, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { Tooltip, ProductTooltip } from '../ui/Tooltip';
import { ConfirmModal } from '../ui/ConfirmModal';
import type { Sale } from '../../types';
import { formatCurrency, getDateRangeSales } from '../../utils/sales';
import { formatDate } from '../../utils/dateFormatting';

interface SaleTableProps {
  sales: Sale[];
  searchTerm: string;
  dateFilter: 'all' | 'today' | 'week' | 'month';
  loading: boolean;
  onEditSale: (sale: Sale) => void;
  onDeleteSale: (saleId: string) => void;
  onViewDetails?: (sale: Sale) => void;
  onGenerateInvoice?: (sale: Sale) => void;
}

export const SaleTable = ({
  sales,
  searchTerm,
  dateFilter,
  loading,
  onEditSale,
  onDeleteSale,
  onViewDetails,
  onGenerateInvoice
}: SaleTableProps) => {

  // Force component re-render when sales array changes by creating a stable key
  const salesKey = useMemo(() => {
    return sales.map(s => `${s.id}-${s.updatedAt}`).join('|');
  }, [sales]);

  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [forceRender, setForceRender] = useState(0);
  const itemsPerPage = 10;

  // Force re-render when salesKey changes
  useEffect(() => {
    console.log('🔄 SaleTable: Sales key changed, forcing re-render:', salesKey.slice(0, 100));
    setForceRender(prev => prev + 1);
  }, [salesKey]);

  // Filter and sort sales - newest first (no memoization to force updates)
  const filteredSales = (() => {
    console.log('🔍 SaleTable: Filtering sales:', {
      totalSales: sales.length,
      dateFilter,
      searchTerm,
      salesKey: salesKey.slice(0, 100),
      sampleSales: sales.slice(0, 2).map(s => ({
        id: s.id,
        orderId: s.orderId,
        totalAmount: s.totalAmount,
        paymentStatus: s.paymentStatus,
        updatedAt: s.updatedAt
      }))
    });

    const filtered = getDateRangeSales(sales, dateFilter).filter(sale => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        sale.orderId.toLowerCase().includes(search) ||
        sale.customerName.toLowerCase().includes(search) ||
        sale.items.some(item => item.productName.toLowerCase().includes(search))
      );
    });

    // Sort by date - newest first, then by creation time if same date
    const sorted = filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateB !== dateA) return dateB - dateA;
      // If same date, sort by creation time (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    console.log('🔍 SaleTable: Filtered result:', {
      filteredCount: sorted.length,
      sampleFiltered: sorted.slice(0, 2).map(s => ({
        id: s.id,
        orderId: s.orderId,
        totalAmount: s.totalAmount,
        paymentStatus: s.paymentStatus,
        updatedAt: s.updatedAt
      }))
    });

    return sorted;
  })();

  // Calculate pagination (no memoization to force updates)
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = (() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = filteredSales.slice(startIndex, startIndex + itemsPerPage);

    console.log('📄 SaleTable: Pagination calculated:', {
      currentPage,
      totalPages,
      startIndex,
      itemsPerPage,
      paginatedCount: paginated.length,
      forceRender,
      samplePaginated: paginated.slice(0, 2).map(s => ({
        id: s.id,
        orderId: s.orderId,
        totalAmount: s.totalAmount,
        paymentStatus: s.paymentStatus,
        updatedAt: s.updatedAt
      }))
    });

    return paginated;
  })();

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter]);

  const handleDeleteClick = (sale: Sale) => {
    setDeletingSaleId(sale.id);
  };

  const handleConfirmDelete = () => {
    if (deletingSaleId) {
      onDeleteSale(deletingSaleId);
      setDeletingSaleId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeletingSaleId(null);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/20 text-green-400';
      case 'partial':
        return 'bg-blue-500/20 text-blue-400';
      case 'pending':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="flex items-center space-x-4 p-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (filteredSales.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">No sales found</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="sm:hidden w-full max-w-full overflow-x-hidden">
        <div className="space-y-3 w-full max-w-full">
          {paginatedSales.map((sale) => {
            const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
            
            return (
              <div
                key={`${sale.id}-${sale.updatedAt}-${forceRender}`}
                className="glass rounded-lg p-4 hover:bg-glass/50 transition-colors w-full max-w-full overflow-x-hidden"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3 gap-2 w-full overflow-x-hidden">
                  <div className="flex-1 min-w-0 overflow-x-hidden">
                    <p className="font-semibold text-sm truncate">{sale.orderId}</p>
                    <p className="text-xs text-muted mt-1 truncate">{sale.customerName}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-lg break-words">{formatCurrency(sale.totalAmount)}</p>
                    <p className="text-xs text-muted mt-1 whitespace-nowrap">
                      {formatDate(sale.date)}
                    </p>
                  </div>
                </div>

                {/* Items and Payment Status */}
                <div className="flex items-center justify-between mb-3 gap-2 w-full overflow-x-hidden">
                  <Tooltip
                    content={
                      <ProductTooltip
                        items={sale.items.map(item => ({
                          productName: item.productName,
                          quantity: item.quantity,
                          price: item.price,
                          total: item.total
                        }))}
                      />
                    }
                    placement="top"
                  >
                    <span className="cursor-help underline decoration-dotted text-sm truncate min-w-0">
                      {totalItems} {totalItems === 1 ? 'item' : 'items'}
                    </span>
                  </Tooltip>
                  
                  <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap flex-shrink-0 ${getPaymentStatusColor(sale.paymentStatus)}`}>
                    {sale.paymentStatus}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-1 justify-end border-t border-white/5 pt-3 w-full overflow-x-hidden">
                  {onViewDetails && (
                    <button
                      className="p-1.5 rounded-lg text-gray-300 hover:bg-white/10 transition-all duration-200"
                      onClick={() => onViewDetails(sale)}
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                  )}
                  <button
                    className="p-1.5 rounded-lg text-gray-300 hover:bg-white/10 transition-all duration-200"
                    onClick={() => onEditSale(sale)}
                    title="Edit Sale"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="p-1.5 rounded-lg text-gray-300 hover:bg-white/10 hover:text-red-400 transition-all duration-200"
                    onClick={() => handleDeleteClick(sale)}
                    title="Delete Sale"
                  >
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                  {onGenerateInvoice && (
                    <button
                      className="p-1.5 rounded-lg text-gray-300 hover:bg-white/10 transition-all duration-200"
                      onClick={() => onGenerateInvoice(sale)}
                      title="Generate Invoice"
                    >
                      <FileText size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto w-full max-w-full">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left py-3 px-4">Order ID</th>
              <th className="text-left py-3 px-4">Customer</th>
              <th className="text-left py-3 px-4">Date</th>
              <th className="text-left py-3 px-4">Items</th>
              <th className="text-left py-3 px-4">Amount</th>
              <th className="text-left py-3 px-4">Payment Status</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedSales.map((sale) => {
              const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
              
              return (
                <tr
                  key={`${sale.id}-${sale.updatedAt}-${forceRender}`}
                  className="border-b border-white/5 hover:bg-glass/50 transition-colors"
                  onMouseEnter={() => {
                    // Debug: Log when hovering over a specific sale row
                    const testSaleId = (window as any).lastUpdatedSaleId;
                    if (testSaleId && sale.id === testSaleId) {
                      console.log('🖱️ Hovering over tracked sale row:', {
                        id: sale.id,
                        orderId: sale.orderId,
                        totalAmount: sale.totalAmount,
                        paymentStatus: sale.paymentStatus,
                        updatedAt: sale.updatedAt
                      });
                    }
                  }}
                >
                  <td className="py-3 px-4 font-medium">{sale.orderId}</td>
                  <td className="py-3 px-4">{sale.customerName}</td>
                  <td className="py-3 px-4">
                    {formatDate(sale.date)}
                  </td>
                  <td className="py-3 px-4">
                    <Tooltip
                      content={
                        <ProductTooltip
                          items={sale.items.map(item => ({
                            productName: item.productName,
                            quantity: item.quantity,
                            price: item.price,
                            total: item.total
                          }))}
                        />
                      }
                      placement="top"
                    >
                      <span className="cursor-help underline decoration-dotted">
                        {totalItems} {totalItems === 1 ? 'item' : 'items'}
                      </span>
                    </Tooltip>
                  </td>
                  <td className="py-3 px-4 font-semibold">
                    {formatCurrency(sale.totalAmount)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getPaymentStatusColor(sale.paymentStatus)}`}>
                      {sale.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-0.5 sm:gap-1">
                      {onViewDetails && (
                        <button
                          className="p-1.5 sm:p-2 rounded-lg text-gray-300 hover:bg-white/10 transition-all duration-200"
                          onClick={() => onViewDetails(sale)}
                          title="View Details"
                        >
                          <Eye size={14} className="sm:w-4 sm:h-4" />
                        </button>
                      )}
                      <button
                        className="p-1.5 sm:p-2 rounded-lg text-gray-300 hover:bg-white/10 transition-all duration-200"
                        onClick={() => onEditSale(sale)}
                        title="Edit Sale"
                      >
                        <Edit2 size={14} className="sm:w-4 sm:h-4" />
                      </button>
                      <button
                        className="p-1.5 sm:p-2 rounded-lg text-gray-300 hover:bg-white/10 hover:text-red-400 transition-all duration-200"
                        onClick={() => handleDeleteClick(sale)}
                        title="Delete Sale"
                      >
                        <Trash2 size={14} className="sm:w-4 sm:h-4 text-red-400" />
                      </button>
                      {onGenerateInvoice && (
                        <button
                          className="p-1.5 sm:p-2 rounded-lg text-gray-300 hover:bg-white/10 transition-all duration-200"
                          onClick={() => onGenerateInvoice(sale)}
                          title="Generate Invoice"
                        >
                          <FileText size={14} className="sm:w-4 sm:h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 w-full max-w-full overflow-x-hidden">
          <div className="text-sm text-muted whitespace-normal break-words">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredSales.length)} of{' '}
            {filteredSales.length} entries
          </div>
          
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start w-full sm:w-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
              Previous
            </Button>
            
            <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-start">
              {/* Show page numbers */}
              {(() => {
                const pages = [];
                const showPages = 5;
                let start = Math.max(1, currentPage - Math.floor(showPages / 2));
                let end = Math.min(totalPages, start + showPages - 1);
                
                if (end - start < showPages - 1) {
                  start = Math.max(1, end - showPages + 1);
                }
                
                if (start > 1) {
                  pages.push(
                    <button
                      key={1}
                      onClick={() => setCurrentPage(1)}
                      className="px-3 py-1 rounded-lg text-sm hover:bg-glass"
                    >
                      1
                    </button>
                  );
                  if (start > 2) {
                    pages.push(
                      <span key="start-ellipsis" className="px-2 text-muted">...</span>
                    );
                  }
                }
                
                for (let i = start; i <= end; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        i === currentPage 
                          ? 'bg-white/20 text-white font-medium' 
                          : 'hover:bg-glass'
                      }`}
                    >
                      {i}
                    </button>
                  );
                }
                
                if (end < totalPages) {
                  if (end < totalPages - 1) {
                    pages.push(
                      <span key="end-ellipsis" className="px-2 text-muted">...</span>
                    );
                  }
                  pages.push(
                    <button
                      key={totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-3 py-1 rounded-lg text-sm hover:bg-glass"
                    >
                      {totalPages}
                    </button>
                  );
                }
                
                return pages;
              })()}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingSaleId}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Sale"
        message="Are you sure you want to delete this sale? This will reverse all inventory bookings and customer balance changes."
        confirmText="Delete"
        type="danger"
      />
    </>
  );
};