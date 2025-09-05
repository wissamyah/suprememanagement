import { generateId } from './storage';
import type { Product, Customer, Sale, InventoryMovement, ProductCategory, SaleItem } from '../types';

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
    
    const statuses: Array<'pending' | 'processing' | 'completed'> = ['pending', 'processing', 'completed'];
    const paymentStatuses: Array<'pending' | 'partial' | 'paid'> = ['pending', 'partial', 'paid'];
    
    sales.push({
      id: `sale_${i + 1}`,
      orderId: `ORD-2024-${(i + 1).toString().padStart(3, '0')}`,
      customerId: customer.id,
      customerName: customer.name,
      date: saleDate,
      items,
      totalAmount,
      status: randomFromArray(statuses),
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

  return {
    products,
    customers,
    sales,
    movements,
    categories: generatedCategories
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
    categories: []
  };
}