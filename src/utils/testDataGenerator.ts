import { generateId } from './storage';
import type { Product, Customer, Sale, InventoryMovement, ProductCategory, SaleItem, LedgerEntry, BookedStock, Loading, LoadingItem } from '../types';

// Nigerian names for realistic test data
const firstNames = ['Chidi', 'Amaka', 'Emeka', 'Ngozi', 'Kemi', 'Tunde', 'Folake', 'Segun', 'Bisi', 'Kunle', 'Ada', 'Obinna', 'Funke', 'Dele', 'Chioma'];
const lastNames = ['Okafor', 'Adeleke', 'Ogundimu', 'Afolabi', 'Nwankwo', 'Olayinka', 'Egwu', 'Bakare', 'Adesanya', 'Okonkwo', 'Adebayo', 'Eze'];
const businessSuffixes = ['Enterprises', 'Ventures', 'Trading Co.', '& Sons', '& Brothers', 'Stores', 'Global', 'Resources', 'Holdings'];

const nigerianStates = [
  'Lagos', 'Kano', 'Ogun', 'Oyo', 'Rivers', 'Kaduna', 'Edo', 'Delta', 'Imo', 'Enugu',
  'Abia', 'Anambra', 'Akwa Ibom', 'Cross River', 'Bayelsa', 'Benue', 'Plateau', 'Niger'
];

const productNames = [
  'Premium Rice 50kg',
  'Standard Rice 50kg',
  'Premium Rice 25kg',
  'Standard Rice 25kg',
  'Premium Rice 10kg',
  'Standard Rice 10kg',
  'Premium Rice 5kg',
  'Parboiled Rice 50kg',
  'Parboiled Rice 25kg',
  'Brown Rice 25kg',
  'Jasmine Rice 10kg',
  'Basmati Rice 10kg',
  'Local Rice 50kg',
  'Local Rice 25kg',
  'Broken Rice 50kg'
];

const categories = [
  { name: 'Premium Rice', description: 'High quality premium rice products' },
  { name: 'Standard Rice', description: 'Regular quality rice for everyday consumption' },
  { name: 'Parboiled Rice', description: 'Partially boiled rice products' },
  { name: 'Specialty Rice', description: 'Jasmine, Basmati and other specialty varieties' },
  { name: 'Local Rice', description: 'Locally sourced rice varieties' },
  { name: 'Broken Rice', description: 'Broken grain rice for various uses' }
];

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhoneNumber(): string {
  const prefixes = ['0803', '0806', '0813', '0816', '0810', '0814', '0703', '0706', '0903', '0906'];
  const prefix = randomFromArray(prefixes);
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return prefix + suffix;
}

function generateDate(daysBack: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - randomBetween(0, daysBack));
  return date;
}

export function generateTestData() {
  const now = new Date();
  
  // Generate Categories
  const generatedCategories: ProductCategory[] = categories.map((cat, index) => ({
    id: `cat_${index + 1}`,
    name: cat.name,
    description: cat.description,
    createdAt: now,
    updatedAt: now
  }));

  // Generate Products
  const products: Product[] = productNames.map((name, index) => {
    const categoryName = name.includes('Premium') ? 'Premium Rice' :
                        name.includes('Standard') ? 'Standard Rice' :
                        name.includes('Parboiled') ? 'Parboiled Rice' :
                        name.includes('Local') ? 'Local Rice' :
                        name.includes('Broken') ? 'Broken Rice' : 'Specialty Rice';
    
    const stockOnHand = randomBetween(50, 500);
    const booked = randomBetween(0, Math.floor(stockOnHand * 0.3));
    
    return {
      id: `prod_${index + 1}`,
      name,
      category: categoryName,
      quantityOnHand: stockOnHand,
      quantityBooked: booked,
      availableQuantity: stockOnHand - booked,
      unit: 'bags',
      status: stockOnHand - booked > 100 ? 'in-stock' as const : 
              stockOnHand - booked > 20 ? 'low-stock' as const : 'out-of-stock' as const,
      reorderLevel: 50,
      createdAt: now,
      updatedAt: now
    };
  });

  // Generate Customers
  const customers: Customer[] = [];
  for (let i = 0; i < 20; i++) {
    const firstName = randomFromArray(firstNames);
    const lastName = randomFromArray(lastNames);
    const isBusinessName = Math.random() > 0.5;
    const name = isBusinessName ? 
      `${lastName} ${randomFromArray(businessSuffixes)}` :
      `${firstName} ${lastName}`;
    
    // Some customers owe money (negative), some have credit (positive), some are settled (0)
    const balanceType = randomBetween(0, 2);
    const balance = balanceType === 0 ? 0 :
                   balanceType === 1 ? -randomBetween(10000, 500000) : // They owe us
                   randomBetween(5000, 50000); // We owe them (credit/overpayment)
    
    customers.push({
      id: `cust_${i + 1}`,
      name,
      phone: generatePhoneNumber(),
      state: randomFromArray(nigerianStates),
      balance,
      createdAt: generateDate(90),
      updatedAt: now
    });
  }

  // Generate Sales
  const sales: Sale[] = [];
  const movements: InventoryMovement[] = [];
  
  for (let i = 0; i < 30; i++) {
    const customer = randomFromArray(customers);
    const saleDate = generateDate(30);
    const numItems = randomBetween(1, 4);
    const items: SaleItem[] = [];
    
    // Select random products for this sale
    const selectedProducts = [...products]
      .sort(() => Math.random() - 0.5)
      .slice(0, numItems);
    
    let totalAmount = 0;
    
    for (const product of selectedProducts) {
      const quantity = randomBetween(1, 10);
      const unitPrice = product.name.includes('Premium') ? randomBetween(45000, 55000) :
                       product.name.includes('Standard') ? randomBetween(35000, 45000) :
                       product.name.includes('Parboiled') ? randomBetween(40000, 48000) :
                       product.name.includes('Jasmine') || product.name.includes('Basmati') ? randomBetween(60000, 75000) :
                       product.name.includes('Local') ? randomBetween(30000, 38000) :
                       randomBetween(25000, 35000);
      
      const lineTotal = quantity * unitPrice;
      totalAmount += lineTotal;
      
      items.push({
        productId: product.id,
        productName: product.name,
        quantity,
        unit: product.unit,
        price: unitPrice,
        total: lineTotal
      });
      
      // Create movement for this sale
      movements.push({
        id: generateId(),
        productId: product.id,
        productName: product.name,
        movementType: 'sales',
        quantity: -quantity,
        previousQuantity: product.quantityOnHand,
        newQuantity: product.quantityOnHand,
        reference: `Sale: ORD-2024-${(i + 1).toString().padStart(3, '0')}`,
        referenceId: `sale_${i + 1}`,
        notes: `Sold to ${customer.name}`,
        date: saleDate,
        createdAt: saleDate,
        updatedAt: saleDate
      });
    }
    
    // Generate mostly pending/processing sales to create booked stock
    // Only make 20% of sales completed (already delivered)
    const saleStatus = Math.random() < 0.8 
      ? randomFromArray(['pending', 'processing'] as const)
      : 'completed' as const;
    
    const paymentStatuses: Array<'pending' | 'partial' | 'paid'> = ['pending', 'partial', 'paid'];
    
    sales.push({
      id: `sale_${i + 1}`,
      orderId: `ORD-2024-${(i + 1).toString().padStart(3, '0')}`,
      customerId: customer.id,
      customerName: customer.name,
      date: saleDate,
      items,
      totalAmount,
      status: saleStatus,
      paymentStatus: randomFromArray(paymentStatuses),
      createdAt: saleDate,
      updatedAt: saleDate
    });
  }

  // Generate some production movements
  for (let i = 0; i < 15; i++) {
    const product = randomFromArray(products);
    const productionDate = generateDate(30);
    const quantity = randomBetween(20, 100);
    
    movements.push({
      id: generateId(),
      productId: product.id,
      productName: product.name,
      movementType: 'production',
      quantity: quantity,
      previousQuantity: product.quantityOnHand,
      newQuantity: product.quantityOnHand + quantity,
      reference: `Production Batch ${i + 1}`,
      notes: `Produced ${quantity} ${product.unit}`,
      date: productionDate,
      createdAt: productionDate,
      updatedAt: productionDate
    });
  }

  // Generate Ledger Entries
  const ledgerEntries: LedgerEntry[] = [];
  
  // Generate opening balances for some customers
  customers.forEach((customer, index) => {
    if (index < 5) { // Give first 5 customers opening balances
      const openingDate = new Date(customer.createdAt);
      const openingAmount = randomBetween(50000, 200000);
      const isCredit = Math.random() > 0.5;
      
      ledgerEntries.push({
        id: generateId(),
        customerId: customer.id,
        customerName: customer.name,
        date: openingDate,
        transactionType: 'opening_balance',
        description: 'Opening Balance',
        debit: isCredit ? 0 : openingAmount,
        credit: isCredit ? openingAmount : 0,
        runningBalance: isCredit ? openingAmount : -openingAmount,
        notes: 'Initial account setup',
        createdAt: openingDate,
        updatedAt: openingDate
      });
    }
  });
  
  // Generate Booked Stock for pending/processing sales
  const bookedStock: BookedStock[] = [];
  
  sales.forEach((sale) => {
    // Create booked stock for pending and processing sales
    if (sale.status === 'pending' || sale.status === 'processing') {
      sale.items.forEach((item) => {
        const bookingStatus: BookedStock['status'][] = ['pending', 'confirmed', 'partial-loaded'];
        const status = randomFromArray(bookingStatus);
        const quantityLoaded = status === 'partial-loaded' 
          ? randomBetween(0, Math.floor(item.quantity * 0.5))
          : 0;
        
        bookedStock.push({
          id: `BS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          customerId: sale.customerId,
          customerName: sale.customerName,
          saleId: sale.id,
          orderId: sale.orderId,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          quantityLoaded,
          unit: item.unit,
          bookingDate: sale.date,
          status,
          notes: `Booked from sale ${sale.orderId}`,
          createdAt: sale.createdAt,
          updatedAt: sale.updatedAt
        });
      });
    }
  });
  
  // Generate ledger entries for sales
  sales.forEach((sale) => {
    ledgerEntries.push({
      id: generateId(),
      customerId: sale.customerId,
      customerName: sale.customerName,
      date: sale.date,
      transactionType: 'sale',
      referenceId: sale.id,
      referenceNumber: sale.orderId,
      description: `Sale Invoice #${sale.orderId}`,
      debit: sale.totalAmount, // Customer owes us
      credit: 0,
      runningBalance: 0, // Will be recalculated
      notes: `${sale.items.length} item(s) sold`,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt
    });
    
    // Generate payments for some sales
    if (sale.paymentStatus === 'paid' || (sale.paymentStatus === 'partial' && Math.random() > 0.5)) {
      const paymentDate = new Date(sale.date);
      paymentDate.setDate(paymentDate.getDate() + randomBetween(1, 7)); // Payment 1-7 days after sale
      
      const paymentAmount = sale.paymentStatus === 'paid' 
        ? sale.totalAmount 
        : randomBetween(sale.totalAmount * 0.3, sale.totalAmount * 0.7);
      
      const paymentMethods: LedgerEntry['paymentMethod'][] = ['cash', 'bank_transfer', 'cheque'];
      const paymentMethod = randomFromArray(paymentMethods);
      
      ledgerEntries.push({
        id: generateId(),
        customerId: sale.customerId,
        customerName: sale.customerName,
        date: paymentDate,
        transactionType: 'payment',
        referenceNumber: paymentMethod === 'bank_transfer' 
          ? `TRF${randomBetween(100000, 999999)}`
          : paymentMethod === 'cheque'
            ? `CHQ${randomBetween(1000, 9999)}`
            : `RCP${randomBetween(1000, 9999)}`,
        description: `Payment received via ${paymentMethod}`,
        debit: 0,
        credit: paymentAmount, // Customer paid us
        runningBalance: 0, // Will be recalculated
        paymentMethod,
        notes: `Payment for ${sale.orderId}`,
        createdAt: paymentDate,
        updatedAt: paymentDate
      });
    }
  });
  
  // Generate some advance payments (customers paying before sales)
  for (let i = 0; i < 10; i++) {
    const customer = randomFromArray(customers.slice(0, 10)); // Pick from first 10 customers
    const paymentDate = generateDate(45);
    const paymentAmount = randomBetween(100000, 500000);
    const paymentMethods: LedgerEntry['paymentMethod'][] = ['cash', 'bank_transfer', 'cheque'];
    const paymentMethod = randomFromArray(paymentMethods);
    
    ledgerEntries.push({
      id: generateId(),
      customerId: customer.id,
      customerName: customer.name,
      date: paymentDate,
      transactionType: 'payment',
      referenceNumber: paymentMethod === 'bank_transfer' 
        ? `TRF${randomBetween(100000, 999999)}`
        : paymentMethod === 'cheque'
          ? `CHQ${randomBetween(1000, 9999)}`
          : `RCP${randomBetween(1000, 9999)}`,
      description: `Advance payment via ${paymentMethod}`,
      debit: 0,
      credit: paymentAmount,
      runningBalance: 0, // Will be recalculated
      paymentMethod,
      notes: 'Advance payment for future purchases',
      createdAt: paymentDate,
      updatedAt: paymentDate
    });
  }
  
  // Generate some credit notes (returns/adjustments)
  for (let i = 0; i < 5; i++) {
    const customer = randomFromArray(customers);
    const creditDate = generateDate(20);
    const creditAmount = randomBetween(10000, 50000);
    
    ledgerEntries.push({
      id: generateId(),
      customerId: customer.id,
      customerName: customer.name,
      date: creditDate,
      transactionType: 'credit_note',
      referenceNumber: `CN-2024-${(i + 1).toString().padStart(3, '0')}`,
      description: 'Product return - quality issue',
      debit: 0,
      credit: creditAmount, // Credit to customer
      runningBalance: 0, // Will be recalculated
      notes: 'Customer returned damaged goods',
      createdAt: creditDate,
      updatedAt: creditDate
    });
  }
  
  // Generate some adjustments
  for (let i = 0; i < 3; i++) {
    const customer = randomFromArray(customers);
    const adjustDate = generateDate(15);
    const adjustAmount = randomBetween(5000, 25000);
    const isDebit = Math.random() > 0.5;
    
    ledgerEntries.push({
      id: generateId(),
      customerId: customer.id,
      customerName: customer.name,
      date: adjustDate,
      transactionType: 'adjustment',
      description: isDebit ? 'Late payment fee' : 'Discount for bulk purchase',
      debit: isDebit ? adjustAmount : 0,
      credit: isDebit ? 0 : adjustAmount,
      runningBalance: 0, // Will be recalculated
      notes: isDebit ? 'Applied late payment charges' : 'Loyalty discount applied',
      createdAt: adjustDate,
      updatedAt: adjustDate
    });
  }
  
  // Sort ledger entries by customer and date to recalculate running balances
  const customerLedgerMap = new Map<string, LedgerEntry[]>();
  ledgerEntries.forEach(entry => {
    if (!customerLedgerMap.has(entry.customerId)) {
      customerLedgerMap.set(entry.customerId, []);
    }
    customerLedgerMap.get(entry.customerId)!.push(entry);
  });
  
  // Recalculate running balances for each customer
  const recalculatedEntries: LedgerEntry[] = [];
  customerLedgerMap.forEach((entries, customerId) => {
    // Sort by date
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let runningBalance = 0;
    entries.forEach(entry => {
      // Open book system: credit increases balance (customer has credit), debit decreases (customer owes)
      runningBalance = runningBalance + entry.credit - entry.debit;
      entry.runningBalance = runningBalance;
      recalculatedEntries.push(entry);
    });
    
    // Update customer's current balance
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      customer.balance = runningBalance;
    }
  });
  
  console.log('Test data generator - Ledger entries created:', recalculatedEntries.length);
  console.log('Test data generator - Booked stock created:', bookedStock.length);
  
  // Generate loadings from booked stock
  const loadings: Loading[] = [];
  const truckPlateNumbers = ['LAG-123-AB', 'KAN-456-CD', 'ABJ-789-EF', 'PHC-012-GH', 'IBD-345-JK', 'KAD-678-LM'];
  
  // Create loadings for some of the booked stock (simulate partial loadings)
  const bookedStockToLoad = bookedStock.filter(bs => bs.status === 'confirmed').slice(0, 15);
  
  bookedStockToLoad.forEach((booking, index) => {
    const loadingDate = new Date(booking.bookingDate);
    loadingDate.setDate(loadingDate.getDate() + randomBetween(1, 3)); // Loading 1-3 days after booking
    
    const sale = sales.find(s => s.id === booking.saleId);
    const saleItem = sale?.items.find(item => item.productId === booking.productId);
    const unitPrice = saleItem?.price || randomBetween(5000, 20000);
    
    // Create loading for partial quantity
    const loadingQuantity = Math.min(booking.quantity, randomBetween(booking.quantity * 0.5, booking.quantity));
    
    const loadingItem: LoadingItem = {
      productId: booking.productId,
      productName: booking.productName,
      quantity: loadingQuantity,
      unit: booking.unit,
      unitPrice: unitPrice,
      bookedStockId: booking.id
    };
    
    const loading: Loading = {
      id: generateId(),
      loadingId: `LD-2024-${String(index + 1).padStart(3, '0')}`,
      date: loadingDate.toISOString().split('T')[0],
      customerId: booking.customerId,
      customerName: booking.customerName,
      truckPlateNumber: randomFromArray(truckPlateNumbers),
      wayBillNumber: Math.random() > 0.5 ? `WB-2024-${String(index + 1).padStart(3, '0')}` : undefined,
      items: [loadingItem],
      totalValue: loadingQuantity * unitPrice,
      createdAt: loadingDate.toISOString(),
      updatedAt: loadingDate.toISOString()
    };
    
    loadings.push(loading);
    
    // Update the booked stock to reflect loading
    booking.quantityLoaded = loadingQuantity;
    booking.status = loadingQuantity >= booking.quantity ? 'fully-loaded' : 'partial-loaded';
    
    // Update product quantities
    const product = products.find(p => p.id === booking.productId);
    if (product) {
      product.quantityOnHand -= loadingQuantity;
      product.quantityBooked -= loadingQuantity;
      product.availableQuantity = product.quantityOnHand - product.quantityBooked;
    }
    
    // Add inventory movement for loading
    movements.push({
      id: generateId(),
      productId: booking.productId,
      productName: booking.productName,
      movementType: 'loading',
      quantity: -loadingQuantity,
      previousQuantity: product?.quantityOnHand || 0,
      newQuantity: (product?.quantityOnHand || 0) - loadingQuantity,
      reference: `Loading ${loading.loadingId}`,
      referenceId: loading.id,
      notes: `Loading for customer: ${booking.customerName}`,
      date: loadingDate,
      createdAt: loadingDate,
      updatedAt: loadingDate
    });
  });
  
  console.log('Test data generator - Loadings created:', loadings.length);
  
  return {
    products,
    customers,
    sales,
    movements,
    categories: generatedCategories,
    ledgerEntries: recalculatedEntries,
    bookedStock,
    loadings
  };
}

// Generate a smaller dataset for quick testing
export function generateMinimalTestData() {
  const now = new Date();
  
  const products: Product[] = [
    {
      id: 'prod_test_1',
      name: 'Premium Rice 50kg',
      category: 'Premium Rice',
      quantityOnHand: 100,
      quantityBooked: 10,
      availableQuantity: 90,
      unit: 'bags',
      status: 'in-stock',
      reorderLevel: 20,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'prod_test_2',
      name: 'Standard Rice 25kg',
      category: 'Standard Rice',
      quantityOnHand: 150,
      quantityBooked: 0,
      availableQuantity: 150,
      unit: 'bags',
      status: 'in-stock',
      reorderLevel: 30,
      createdAt: now,
      updatedAt: now
    }
  ];

  const customers: Customer[] = [
    {
      id: 'cust_test_1',
      name: 'Test Customer 1',
      phone: '08031234567',
      state: 'Lagos',
      balance: -50000, // Owes us money
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'cust_test_2',
      name: 'Test Customer 2',
      phone: '08061234567',
      state: 'Ogun',
      balance: 0, // Settled
      createdAt: now,
      updatedAt: now
    }
  ];

  return {
    products,
    customers,
    sales: [],
    movements: [],
    categories: [],
    ledgerEntries: [],
    bookedStock: []
  };
}