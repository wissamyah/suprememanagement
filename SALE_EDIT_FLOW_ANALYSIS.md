# Sale Edit Flow Analysis & Logic Documentation

## Overview
This document outlines the complete flow logic for editing sales, especially when items have been partially or fully loaded.

## Current System Architecture

### 1. Data Flow When Editing a Sale

```
Sale Edit Request
    ↓
EditSaleModal (UI)
    ↓
handleUpdateSale (Sales.tsx)
    ↓
updateSale (useSalesDirect.ts) ← [MAIN LOGIC HERE]
    ↓
Updates Multiple Entities:
    - Sales table
    - BookedStock table
    - Products table (quantityBooked)
    - Movements table
    - LedgerEntries table
    - Customers table (balance)
```

## Key Data Structures

### BookedStock Status Flow
```
pending → partial-loaded → fully-loaded
         ↘              ↗
           (cancelled)
```

### BookedStock Fields
- `quantity`: Original booked quantity from sale
- `quantityLoaded`: Amount already loaded/delivered
- `status`: Current status (pending/partial-loaded/fully-loaded/cancelled)

## Critical Issue: No Validation for Loaded Items

**PROBLEM IDENTIFIED**: The system currently allows editing a sale to reduce quantity below what has already been loaded!

### Current Behavior (INCORRECT)
1. Sale created: 100 bags of rice
2. Loading created: 60 bags delivered
3. Edit sale: Change to 50 bags ← **ALLOWED BUT SHOULDN'T BE!**
4. Result: Negative booked stock (-10 bags)

### What Should Happen
The system should prevent reducing sale quantity below `quantityLoaded`.

## Detailed Edit Sale Flow

### Phase 1: Initial Validation (MISSING!)
```javascript
// This validation is MISSING in updateSale function
if (updates.items) {
  for (const item of updates.items) {
    const existingBooking = bookedStock.find(
      b => b.saleId === id && b.productId === item.productId
    );
    if (existingBooking && item.quantity < existingBooking.quantityLoaded) {
      return {
        success: false,
        error: `Cannot reduce ${item.productName} below loaded quantity of ${existingBooking.quantityLoaded}`
      };
    }
  }
}
```

### Phase 2: Update BookedStock
Current logic in `updateSale`:

1. **Map existing items** to track changes
2. **Update existing bookings**:
   ```javascript
   // For products still in the sale
   if (newItem) {
     return {
       ...entry,
       quantity: newItem.quantity, // ← No check against quantityLoaded!
       productName: newItem.productName,
       unit: newItem.unit,
       updatedAt: now
     };
   }
   ```
3. **Remove bookings** for deleted products
4. **Add new bookings** for new products

### Phase 3: Update Product Quantities
```javascript
// Adjust quantityBooked based on difference
const quantityDiff = newQuantity - oldQuantity;
product.quantityBooked += quantityDiff;
product.availableQuantity = product.quantityOnHand - product.quantityBooked;
```

### Phase 4: Update Movements & Ledger
- Movements track the booking (not physical stock change)
- Ledger entries track financial impact

## Loading Creation Flow

When a loading is created (`addLoading` in useLoadingsDirect.ts):

1. **Reduce physical stock** (`quantityOnHand`)
2. **Update BookedStock**:
   - Increase `quantityLoaded`
   - Update status to `partial-loaded` or `fully-loaded`
3. **Reduce booked quantity** on product
4. **Create movement** record

## Scenarios & Edge Cases

### Scenario 1: Normal Edit (No Loading)
- ✅ Sale: 100 bags → Edit to 150 bags
- ✅ Sale: 100 bags → Edit to 50 bags
- ✅ Change product type completely

### Scenario 2: Edit After Partial Loading
- ❌ Sale: 100 bags, Loaded: 60 → Edit to 50 bags (SHOULD FAIL)
- ✅ Sale: 100 bags, Loaded: 60 → Edit to 80 bags (OK)
- ✅ Sale: 100 bags, Loaded: 60 → Edit to 150 bags (OK)

### Scenario 3: Edit After Full Loading
- ❌ Sale: 100 bags, Loaded: 100 → Edit quantity (SHOULD FAIL)
- ❌ Sale: 100 bags, Loaded: 100 → Remove product (SHOULD FAIL)
- ✅ Sale: 100 bags, Loaded: 100 → Edit price only (OK)
- ✅ Sale: 100 bags, Loaded: 100 → Edit payment status (OK)

### Scenario 4: Multi-Product Sales
- Product A: 100 bags, Loaded: 50
- Product B: 200 bags, Loaded: 0
- ✅ Can edit Product B freely
- ❌ Cannot reduce Product A below 50
- ✅ Can add Product C

### Scenario 5: Product Replacement
- ❌ Original: Rice 100 bags, Loaded: 50 → Change to Beans (SHOULD FAIL)
- The system currently allows this, creating duplicate booked stock!

## Required Fixes

### 1. Add Validation in updateSale
```javascript
// In useSalesDirect.ts, updateSale function
// Before processing any updates:

if (updates.items) {
  // Check each item against loaded quantities
  const validationErrors = [];

  for (const newItem of updates.items) {
    const existingBooking = bookedStock.find(
      b => b.saleId === id && b.productId === newItem.productId
    );

    if (existingBooking) {
      // Cannot reduce below loaded quantity
      if (newItem.quantity < existingBooking.quantityLoaded) {
        validationErrors.push(
          `${newItem.productName}: Cannot reduce quantity to ${newItem.quantity}. ` +
          `Already loaded: ${existingBooking.quantityLoaded} ${newItem.unit}`
        );
      }
    }
  }

  // Check for removed products
  const oldProductIds = existingSale.items.map(i => i.productId);
  const newProductIds = updates.items.map(i => i.productId);
  const removedProductIds = oldProductIds.filter(id => !newProductIds.includes(id));

  for (const productId of removedProductIds) {
    const booking = bookedStock.find(
      b => b.saleId === id && b.productId === productId
    );
    if (booking && booking.quantityLoaded > 0) {
      const product = products.find(p => p.id === productId);
      validationErrors.push(
        `Cannot remove ${product?.name}. Already loaded: ${booking.quantityLoaded} ${booking.unit}`
      );
    }
  }

  if (validationErrors.length > 0) {
    return { success: false, errors: validationErrors };
  }
}
```

### 2. Add UI Validation in EditSaleModal
```javascript
// Show warning when trying to edit loaded items
// Disable quantity reduction for partially loaded items
// Prevent product removal for loaded items
```

### 3. Fix Duplicate BookedStock Issue
The current logic uses the original `bookedStock` array instead of `updatedBookedStockList` when checking for existing products, causing duplicates when products are changed.

## System Constraints

### Business Rules
1. **Cannot reduce** sale quantity below loaded quantity
2. **Cannot remove** products that have been loaded
3. **Cannot change** product type if loading exists
4. **Can increase** quantity even after partial loading
5. **Can edit** non-quantity fields (price, payment status) anytime
6. **Can add** new products to existing sale anytime

### Technical Constraints
1. BookedStock entries must maintain referential integrity
2. Product quantities must never go negative
3. Movements must track all changes for audit
4. Customer balances must reflect accurate totals

## Recommended Implementation Priority

1. **Critical**: Add validation to prevent reducing below loaded quantity
2. **High**: Fix duplicate booked stock bug (already fixed)
3. **Medium**: Add UI warnings for loaded items
4. **Low**: Add audit trail for edit attempts on loaded items

## Testing Scenarios

### Test Case 1: Basic Edit Protection
1. Create sale: 100 units
2. Create loading: 60 units
3. Attempt edit to 50 units
4. **Expected**: Error message, edit rejected

### Test Case 2: Partial Loading Edit
1. Create sale: Product A (100), Product B (200)
2. Load: Product A (50)
3. Edit: Product A (150), Product B (100)
4. **Expected**: Success, quantities updated correctly

### Test Case 3: Product Removal Protection
1. Create sale: Product A, Product B
2. Load: Product A (any amount)
3. Edit: Remove Product A
4. **Expected**: Error, cannot remove loaded product

## Conclusion

The system currently lacks critical validation when editing sales with loaded items. This can lead to:
- Negative inventory
- Data inconsistency
- Financial discrepancies
- Audit issues

The proposed fixes will ensure data integrity while maintaining flexibility for legitimate edits.