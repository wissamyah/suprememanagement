import { useState, useMemo } from "react";
import type { Loading } from "../../types";
import { ConfirmModal } from "../ui/ConfirmModal";
import { Tooltip, ProductTooltip } from "../ui/Tooltip";
import {
  Edit2,
  Trash2,
  Truck,
  Calendar,
  User,
  Package,
  FileText,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { formatDate } from "../../utils/date";

interface LoadingTableProps {
  loadings: Loading[];
  searchTerm: string;
  dateFilter: string;
  onEditLoading: (loading: Loading) => void;
  onDeleteLoading: (loadingId: string) => void;
}

type SortField = "date" | "customer" | "totalValue";
type SortDirection = "asc" | "desc";

export const LoadingTable = ({
  loadings,
  searchTerm,
  dateFilter,
  onEditLoading,
  onDeleteLoading,
}: LoadingTableProps) => {
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    loading: Loading | null;
  }>({
    show: false,
    loading: null,
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedLoadings = useMemo(() => {
    let filtered = [...loadings];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (loading) =>
          loading.loadingId.toLowerCase().includes(term) ||
          loading.customerName.toLowerCase().includes(term) ||
          loading.truckPlateNumber.toLowerCase().includes(term) ||
          (loading.wayBillNumber &&
            loading.wayBillNumber.toLowerCase().includes(term))
      );
    }

    // Apply date filter
    if (dateFilter && dateFilter !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter((loading) => {
        const loadingDate = new Date(loading.date);
        loadingDate.setHours(0, 0, 0, 0);

        switch (dateFilter) {
          case "today":
            return loadingDate.getTime() === today.getTime();
          case "week":
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return loadingDate >= weekAgo;
          case "month":
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return loadingDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Apply sorting - always show newest first by default
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "date":
          // Sort by date first
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          comparison = dateA - dateB;

          // If same date, sort by creation time
          if (comparison === 0) {
            const createdA = new Date(a.createdAt).getTime();
            const createdB = new Date(b.createdAt).getTime();
            comparison = createdA - createdB;
          }
          break;
        case "customer":
          comparison = a.customerName.localeCompare(b.customerName);
          break;
        case "totalValue":
          comparison = a.totalValue - b.totalValue;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [loadings, searchTerm, dateFilter, sortField, sortDirection]);

  const handleDeleteConfirm = (loading: Loading) => {
    setDeleteConfirm({ show: true, loading });
  };

  const handleDelete = () => {
    if (deleteConfirm.loading) {
      onDeleteLoading(deleteConfirm.loading.id);
      setDeleteConfirm({ show: false, loading: null });
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  };

  return (
    <>
      {/* Mobile Card View */}
      <div className="block md:hidden">
        {filteredAndSortedLoadings.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="mx-auto mb-4 text-muted" size={48} />
            <p className="text-muted">No loadings found</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredAndSortedLoadings.map((loading) => (
              <div key={loading.id} className="glass rounded-lg p-2.5">
                {/* Header: Customer Name, Total Value & Actions */}
                <div className="flex justify-between items-start mb-2 pb-2 border-b border-gray-800/30">
                  <div className="flex-1 pr-2">
                    <h3 className="font-bold text-base leading-tight mb-0.5">
                      {loading.customerName}
                    </h3>
                    <div className="text-sm font-bold text-green-400">
                      {new Intl.NumberFormat("en-NG", {
                        style: "currency",
                        currency: "NGN",
                        maximumFractionDigits: 0,
                      }).format(loading.totalValue)}
                    </div>
                  </div>
                  
                  {/* Actions - Icon Only */}
                  <div className="flex gap-1 items-start">
                    <button
                      onClick={() => onEditLoading(loading)}
                      className="p-1.5 rounded hover:bg-white/10 transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteConfirm(loading)}
                      className="p-1.5 rounded hover:bg-white/10 transition-colors text-red-400 hover:text-red-300"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* 2-Column Grid Layout */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  {/* Left Column */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted">
                      <Calendar size={10} className="flex-shrink-0" />
                      <span className="truncate">{formatDate(loading.date)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted">
                      <Truck size={10} className="flex-shrink-0" />
                      <span className="truncate">{loading.truckPlateNumber}</span>
                    </div>
                    {loading.wayBillNumber && (
                      <div className="flex items-center gap-1 text-muted">
                        <FileText size={10} className="flex-shrink-0" />
                        <span className="truncate">{loading.wayBillNumber}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Products */}
                  <Tooltip
                    content={
                      <ProductTooltip
                        items={loading.items.map((item) => ({
                          productName: item.productName,
                          quantity: item.quantity,
                          price: item.unitPrice,
                          total: item.quantity * item.unitPrice,
                        }))}
                      />
                    }
                    placement="top"
                  >
                    <div className="space-y-0.5 cursor-help">
                      <div className="flex items-center gap-1 text-muted mb-0.5">
                        <Package size={10} className="flex-shrink-0" />
                        <span className="font-medium text-[10px]">{loading.items.length} {loading.items.length === 1 ? "Item" : "Items"}</span>
                      </div>
                      {loading.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[10px] leading-tight">
                          <span className="text-gray-400 truncate pr-1">{item.productName}</span>
                          <span className="text-gray-500 whitespace-nowrap flex-shrink-0">
                            {item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800/50">
              <th className="text-left py-3 px-4">Loading ID</th>
              <th
                className="text-left py-3 px-4 cursor-pointer hover:text-gray-300"
                onClick={() => handleSort("date")}
              >
                <div className="flex items-center gap-1">
                  Date
                  <SortIcon field="date" />
                </div>
              </th>
              <th
                className="text-left py-3 px-4 cursor-pointer hover:text-gray-300"
                onClick={() => handleSort("customer")}
              >
                <div className="flex items-center gap-1">
                  Customer
                  <SortIcon field="customer" />
                </div>
              </th>
              <th className="text-left py-3 px-4">Truck</th>
              <th className="text-left py-3 px-4">Way Bill</th>
              <th className="text-left py-3 px-4">Products</th>
              <th
                className="text-right py-3 px-4 cursor-pointer hover:text-gray-300"
                onClick={() => handleSort("totalValue")}
              >
                <div className="flex items-center justify-end gap-1">
                  Total Value
                  <SortIcon field="totalValue" />
                </div>
              </th>
              <th className="text-center py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedLoadings.map((loading) => (
              <tr
                key={loading.id}
                className="border-b border-gray-800/30 hover:bg-glass"
              >
                <td className="py-3 px-4">
                  <span className="font-medium">{loading.loadingId}</span>
                </td>
                <td className="py-3 px-4">{formatDate(loading.date)}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-muted" />
                    {loading.customerName}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Truck size={16} className="text-muted" />
                    {loading.truckPlateNumber}
                  </div>
                </td>
                <td className="py-3 px-4">{loading.wayBillNumber || "-"}</td>
                <td className="py-3 px-4">
                  <Tooltip
                    content={
                      <ProductTooltip
                        items={loading.items.map((item) => ({
                          productName: item.productName,
                          quantity: item.quantity,
                          price: item.unitPrice,
                          total: item.quantity * item.unitPrice,
                        }))}
                      />
                    }
                    placement="top"
                  >
                    <span className="cursor-help underline decoration-dotted">
                      {loading.items.length}{" "}
                      {loading.items.length === 1 ? "item" : "items"}
                    </span>
                  </Tooltip>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-semibold text-green-400">
                    {new Intl.NumberFormat("en-NG", {
                      style: "currency",
                      currency: "NGN",
                    }).format(loading.totalValue)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEditLoading(loading)}
                      className="p-1.5 rounded hover:bg-glass transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteConfirm(loading)}
                      className="p-1.5 rounded hover:bg-glass transition-colors text-red-400"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAndSortedLoadings.length === 0 && (
          <div className="text-center py-12">
            <Truck className="mx-auto mb-4 text-muted" size={48} />
            <p className="text-muted">No loadings found</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, loading: null })}
        onConfirm={handleDelete}
        title="Delete Loading"
        message={
          <div>
            <p>
              Are you sure you want to delete loading{" "}
              <strong>{deleteConfirm.loading?.loadingId}</strong>?
            </p>
            <p className="mt-2 text-sm text-muted">
              This will restore the booked stock quantities and inventory
              levels.
            </p>
          </div>
        }
        confirmText="Delete"
        type="danger"
      />
    </>
  );
};
