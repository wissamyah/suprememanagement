import { Button } from './Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  const startItem = ((currentPage - 1) * itemsPerPage) + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const renderPageNumbers = () => {
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
          onClick={() => onPageChange(1)}
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
          onClick={() => onPageChange(i)}
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
          onClick={() => onPageChange(totalPages)}
          className="px-3 py-1 rounded-lg text-sm hover:bg-glass"
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
      <div className="text-sm text-muted">
        Showing {startItem} to {endItem} of {totalItems} entries
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft size={16} />
          Previous
        </Button>

        <div className="flex items-center gap-1">
          {renderPageNumbers()}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
};