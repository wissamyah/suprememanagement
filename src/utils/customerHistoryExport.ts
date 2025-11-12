import jsPDF from 'jspdf';
import type { Customer } from '../types';

// PDF-specific currency formatter - using 'N' to avoid jsPDF rendering issues
const formatCurrencyForPDF = (amount: number): string => {
  const formatted = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return 'N' + formatted;
};

export interface TimelineTransaction {
  id: string;
  date: Date;
  createdAt: Date;
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
  doc.text('Supreme Rice Mills', pageWidth / 2, yPosition, { align: 'center' });
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
  let col1ValueX = margin + 25;
  let col2X = margin + 70;
  let col2ValueX = col2X + 30;
  let infoY = yPosition;
  
  doc.text('CUSTOMER INFORMATION', col1X, infoY);
  infoY += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Name:', col1X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(customer.name, col1ValueX, infoY);
  infoY += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Phone:', col1X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(customer.phone, col1ValueX, infoY);
  infoY += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('State:', col1X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(customer.state, col1ValueX, infoY);
  
  // Column 2: Report Info
  infoY = yPosition;
  doc.setFont('helvetica', 'bold');
  doc.text('REPORT PERIOD', col2X, infoY);
  infoY += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('From:', col2X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(dateRange.from.toLocaleDateString('en-GB'), col2ValueX, infoY);
  infoY += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('To:', col2X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(dateRange.to.toLocaleDateString('en-GB'), col2ValueX, infoY);
  infoY += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Count:', col2X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(summary.transactionCount.toString(), col2ValueX, infoY);
  
  // Column 3: Balance Info
  let col3X = margin + 140;
  let col3ValueX = col3X + 30;
  infoY = yPosition;
  doc.setFont('helvetica', 'bold');
  doc.text('BALANCE SUMMARY', col3X, infoY);
  infoY += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Current:', col3X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(customer.balance < 0 ? 255 : 0, customer.balance < 0 ? 0 : 100, 0);
  doc.text(formatCurrencyForPDF(Math.abs(customer.balance)), col3ValueX, infoY);
  infoY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Net Period:', col3X, infoY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(summary.netBalance < 0 ? 255 : 0, summary.netBalance >= 0 ? 100 : 0, 0);
  doc.text(formatCurrencyForPDF(Math.abs(summary.netBalance)), col3ValueX, infoY);
  
  doc.setTextColor(0, 0, 0);
  yPosition += 18;
  
  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Separate transactions into Ledger Entries and Loadings
  const ledgerTransactions = transactions.filter(t => t.type !== 'loading');
  const loadingTransactions = transactions.filter(t => t.type === 'loading');

  // Helper function to render ledger entries table
  const renderLedgerTable = (title: string, transactionList: TimelineTransaction[]) => {
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
        doc.text(formatCurrencyForPDF(transaction.debit), xPos, yPosition);
        doc.setTextColor(0, 0, 0);
      } else {
        doc.text('-', xPos, yPosition);
      }
      xPos += colWidths.debit;

      // Credit
      if (transaction.credit > 0) {
        doc.setTextColor(0, 150, 0);
        doc.text(formatCurrencyForPDF(transaction.credit), xPos, yPosition);
        doc.setTextColor(0, 0, 0);
      } else {
        doc.text('-', xPos, yPosition);
      }
      xPos += colWidths.credit;

      // Balance (without sign since already in proper column)
      doc.setTextColor(transaction.balance < 0 ? 255 : 0, transaction.balance < 0 ? 0 : 100, 0);
      doc.text(formatCurrencyForPDF(Math.abs(transaction.balance)), xPos, yPosition);
      doc.setTextColor(0, 0, 0);

      yPosition += 6;

      // Add items if present (for sales)
      if (transaction.items && transaction.items.length > 0) {
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        transaction.items.forEach(item => {
          checkPageBreak(4);
          const itemText = '  . ' + item.productName + ': ' + item.quantity + ' ' + item.unit + ' @ ' + formatCurrencyForPDF(item.price);
          doc.text(itemText, margin + 5, yPosition);
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

    // Add totals row for ledger entries
    if (transactionList.length > 0) {
      checkPageBreak(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      
      const totalDebits = transactionList.reduce((sum, t) => sum + t.debit, 0);
      const totalCredits = transactionList.reduce((sum, t) => sum + t.credit, 0);
      
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;
      
      let xPos = margin + colWidths.date + colWidths.type + colWidths.description;
      doc.text('TOTALS:', margin, yPosition);
      
      doc.setTextColor(255, 0, 0);
      doc.text(formatCurrencyForPDF(totalDebits), xPos, yPosition);
      xPos += colWidths.debit;
      
      doc.setTextColor(0, 150, 0);
      doc.text(formatCurrencyForPDF(totalCredits), xPos, yPosition);
      
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      yPosition += 8;
    }
  };

  // Helper function to render loadings table
  const renderLoadingsTable = (title: string, transactionList: TimelineTransaction[]) => {
    if (transactionList.length === 0) return;

    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, margin, yPosition);
    yPosition += 7;

    // Table Headers for Loadings
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const colWidths = {
      date: 30,
      reference: 35,
      description: 70,
      value: 35
    };

    let xPos = margin;
    doc.text('Date', xPos, yPosition);
    xPos += colWidths.date;
    doc.text('Reference', xPos, yPosition);
    xPos += colWidths.reference;
    doc.text('Items', xPos, yPosition);
    xPos += colWidths.description;
    doc.text('Total Value', xPos, yPosition);
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

      // Reference
      doc.text(transaction.reference || '-', xPos, yPosition);
      xPos += colWidths.reference;

      // Items summary
      const itemCount = transaction.items?.length || 0;
      doc.text(itemCount + ' item(s)', xPos, yPosition);
      xPos += colWidths.description;

      // Total Value
      if (transaction.items && transaction.items.length > 0) {
        const loadedGoodsValue = transaction.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        doc.setTextColor(200, 150, 0);
        doc.text(formatCurrencyForPDF(loadedGoodsValue), xPos, yPosition);
        doc.setTextColor(0, 0, 0);
      } else {
        doc.text('-', xPos, yPosition);
      }

      yPosition += 6;

      // Add item details
      if (transaction.items && transaction.items.length > 0) {
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        transaction.items.forEach(item => {
          checkPageBreak(4);
          const itemText = '  . ' + item.productName + ': ' + item.quantity + ' ' + item.unit + ' @ ' + formatCurrencyForPDF(item.price);
          doc.text(itemText, margin + 5, yPosition);
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

    // Add totals row for loadings
    if (transactionList.length > 0) {
      checkPageBreak(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      
      const totalValue = transactionList.reduce((sum, t) => {
        if (t.items && t.items.length > 0) {
          return sum + t.items.reduce((itemSum, item) => itemSum + (item.quantity * item.price), 0);
        }
        return sum;
      }, 0);
      
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;
      
      let xPos = margin + colWidths.date + colWidths.reference + colWidths.description;
      doc.text('TOTAL LOADED:', margin, yPosition);
      
      doc.setTextColor(200, 150, 0);
      doc.text(formatCurrencyForPDF(totalValue), xPos, yPosition);
      
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      yPosition += 8;
    }
  };

  // Render Ledger Entries (Sales and Payments)
  renderLedgerTable('LEDGER ENTRIES (Sales & Payments)', ledgerTransactions);

  // Render Loadings
  renderLoadingsTable('LOADINGS', loadingTransactions);

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

