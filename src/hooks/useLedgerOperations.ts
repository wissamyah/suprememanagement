import { useMemo } from 'react';
import type { LedgerEntry, Customer } from '../types';

interface UseLedgerOperationsProps {
  customerId?: string;
  ledgerEntries: LedgerEntry[];
  customers: Customer[];
  searchTerm: string;
  transactionFilter: string;
  dateFrom: string;
  dateTo: string;
  currentPage: number;
  itemsPerPage: number;
}

export const useLedgerOperations = ({
  customerId,
  ledgerEntries,
  customers,
  searchTerm,
  transactionFilter,
  dateFrom,
  dateTo,
  currentPage,
  itemsPerPage
}: UseLedgerOperationsProps) => {
  const currentCustomer = customerId
    ? customers.find(c => c.id === customerId)
    : null;

  const ledgerData = useMemo(() => {
    if (customerId) {
      return ledgerEntries
        .filter(l => l.customerId === customerId)
        .sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateB !== dateA) return dateB - dateA;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    } else {
      return ledgerEntries
        .sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateB !== dateA) return dateB - dateA;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }
  }, [customerId, ledgerEntries]);

  const filteredEntries = useMemo(() => {
    let filtered = [...ledgerData];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.customerName.toLowerCase().includes(search) ||
        entry.description.toLowerCase().includes(search) ||
        entry.referenceNumber?.toLowerCase().includes(search) ||
        entry.notes?.toLowerCase().includes(search)
      );
    }

    if (transactionFilter !== 'all') {
      filtered = filtered.filter(entry => entry.transactionType === transactionFilter);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter(entry => new Date(entry.date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(entry => new Date(entry.date) <= to);
    }

    return filtered;
  }, [ledgerData, searchTerm, transactionFilter, dateFrom, dateTo]);

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEntries.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEntries, currentPage, itemsPerPage]);

  const totals = useMemo(() => {
    const pageTotalDebit = paginatedEntries.reduce((sum, entry) => sum + entry.debit, 0);
    const pageTotalCredit = paginatedEntries.reduce((sum, entry) => sum + entry.credit, 0);
    const totalDebit = filteredEntries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredit = filteredEntries.reduce((sum, entry) => sum + entry.credit, 0);

    let balance = 0;
    if (customerId) {
      const allCustomerEntries = ledgerEntries
        .filter(e => e.customerId === customerId)
        .sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA !== dateB) return dateA - dateB;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

      if (allCustomerEntries.length > 0) {
        balance = allCustomerEntries[allCustomerEntries.length - 1].runningBalance;
      } else if (currentCustomer) {
        balance = currentCustomer.balance;
      }
    } else {
      balance = totalCredit - totalDebit;
    }

    return { totalDebit, totalCredit, balance, pageTotalDebit, pageTotalCredit };
  }, [filteredEntries, paginatedEntries, customerId, ledgerEntries, currentCustomer]);

  return {
    currentCustomer,
    ledgerData,
    filteredEntries,
    paginatedEntries,
    totals,
    totalPages
  };
};