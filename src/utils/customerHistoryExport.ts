import jsPDF from 'jspdf';
import type { Customer } from '../types';
import { formatCurrency } from './customers';

export interface TimelineTransaction {
  id: string;
  date: Date;
  type: 'sale' | 'loading' | 'payment' | 'other';
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference?: string;
  items?: Array<{
    productName: string;
    quantity: number;
    unit: string;
    price: number;
  }>;
  paymentMethod?: string;
}

export interface HistorySummary {
  totalSales: number;
  totalLoadings: number;
  totalPayments: number;
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
  transactionCount: number;
}

export const exportCustomerHistoryToPDF = (
  customer: Customer,
  transactions: TimelineTransaction[],
  dateRange: { from: Date; to: Date },
  summary: HistorySummary
): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Company Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Supreme Management', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Customer Transaction History', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

  // Customer Details in Columns (Compact Layout)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  // Column 1: Customer Info
  let col1X = margin;
  let col2X = margin + 70;
  let infoY = yPosition;
  
  doc.text('CUSTOMER INFORMATION', col1X, infoY);
  infoY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${customer.name}`, col1X, infoY);
  infoY += 4;
  doc.text(`Phone: ${customer.phone}`, col1X, infoY);
  infoY += 4;
  doc.text(`State: ${customer.state}`, col1X, infoY);
  
  // Column 2: Report Info
  infoY = yPosition;
  doc.setFont('helvetica', 'bold');
  doc.text('REPORT PERIOD', col2X, infoY);
  infoY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`From: ${dateRange.from.toLocaleDateString('en-GB')}`, col2X, infoY);
  infoY += 4;
  doc.text(`To: ${dateRange.to.toLocaleDateString('en-GB')}`, col2X, infoY);
  infoY += 4;
  doc.text(`Transactions: ${summary.transactionCount}`, col2X, infoY);
  
  // Column 3: Balance Info
  let col3X = margin + 140;
  infoY = yPosition;
  doc.setFont('helvetica', 'bold');
  doc.text('BALANCE SUMMARY', col3X, infoY);
  infoY += 5;
  doc.setFont('helvetica', 'normal');
  const currentBalanceStr = customer.balance < 0 
    ? `-${formatCurrency(Math.abs(customer.balance))}`
    : `+${formatCurrency(Math.abs(customer.balance))}`;
  doc.text(`Current: ${currentBalanceStr}`, col3X, infoY);
  doc.setTextColor(customer.balance < 0 ? 255 : 0, customer.balance < 0 ? 0 : 100, 0);
  infoY += 4;
  doc.setTextColor(0, 0, 0);
  const netBalanceStr = summary.netBalance < 0
    ? `-${formatCurrency(Math.abs(summary.netBalance))}`
    : `+${formatCurrency(Math.abs(summary.netBalance))}`;
  doc.text(`Net Period: ${netBalanceStr}`, col3X, infoY);
  doc.setTextColor(summary.netBalance < 0 ? 255 : 0, summary.netBalance < 0 ? 0 : 100, 0);
  
  doc.setTextColor(0, 0, 0);
  yPosition += 18;
  
  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Separate transactions into Ledger Entries and Loadings
  const ledgerTransactions = transactions.filter(t => t.type !== 'loading');
  const loadingTransactions = transactions.filter(t => t.type === 'loading');

  // Helper function to render a transaction table
  const renderTransactionTable = (title: string, transactionList: TimelineTransaction[]) => {
    if (transactionList.length === 0) return;

    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, margin, yPosition);
    yPosition += 7;

    // Table Headers
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const colWidths = {
      date: 25,
      type: 22,
      description: 55,
      debit: 25,
      credit: 25,
      balance: 25
    };

    let xPos = margin;
    doc.text('Date', xPos, yPosition);
    xPos += colWidths.date;
    doc.text('Type', xPos, yPosition);
    xPos += colWidths.type;
    doc.text('Description', xPos, yPosition);
    xPos += colWidths.description;
    doc.text('Debit', xPos, yPosition);
    xPos += colWidths.debit;
    doc.text('Credit', xPos, yPosition);
    xPos += colWidths.credit;
    doc.text('Balance', xPos, yPosition);
    yPosition += 3;

    // Header line
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    transactionList.forEach((transaction, index) => {
      const rowHeight = 12;
      checkPageBreak(rowHeight);

      xPos = margin;

      // Date
      doc.text(new Date(transaction.date).toLocaleDateString('en-GB'), xPos, yPosition);
      xPos += colWidths.date;

      // Type
      const typeText = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
      doc.text(typeText, xPos, yPosition);
      xPos += colWidths.type;

      // Description (truncated if too long)
      const descLines = doc.splitTextToSize(transaction.description, colWidths.description - 2);
      doc.text(descLines[0], xPos, yPosition);
      xPos += colWidths.description;

      // Debit
      if (transaction.debit > 0) {
        doc.setTextColor(255, 0, 0);
        doc.text(formatCurrency(transaction.debit), xPos, yPosition);
        doc.setTextColor(0, 0, 0);
      } else {
        doc.text('-', xPos, yPosition);
      }
      xPos += colWidths.debit;

      // Credit
      if (transaction.credit > 0) {
        doc.setTextColor(0, 150, 0);
        doc.text(formatCurrency(transaction.credit), xPos, yPosition);
        doc.setTextColor(0, 0, 0);
      } else {
        doc.text('-', xPos, yPosition);
      }
      xPos += colWidths.credit;

      // Balance
      const balanceStr = transaction.balance < 0
        ? `-${formatCurrency(Math.abs(transaction.balance))}`
        : `+${formatCurrency(Math.abs(transaction.balance))}`;
      doc.setTextColor(transaction.balance < 0 ? 255 : 0, transaction.balance < 0 ? 0 : 100, 0);
      doc.text(balanceStr, xPos, yPosition);
      doc.setTextColor(0, 0, 0);

      yPosition += 6;

      // Add items if present (for sales)
      if (transaction.items && transaction.items.length > 0) {
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        transaction.items.forEach(item => {
          checkPageBreak(4);
          doc.text(
            `  • ${item.productName}: ${item.quantity} ${item.unit} @ ${formatCurrency(item.price)}`,
            margin + 5,
            yPosition
          );
          yPosition += 4;
        });
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
      }

      yPosition += 2;

      // Separator line every 5 transactions
      if ((index + 1) % 5 === 0 && index < transactionList.length - 1) {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 3;
      }
    });

    yPosition += 8;
  };

  // Render Ledger Entries (Sales and Payments)
  renderTransactionTable('LEDGER ENTRIES (Sales & Payments)', ledgerTransactions);

  // Render Loadings
  renderTransactionTable('LOADINGS', loadingTransactions);

  // Footer on last page
  yPosition = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );

  // Add page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
  }

  // Save the PDF
  const fileName = `customer-history-${customer.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

