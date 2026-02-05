# Rental Review Page Optimization Plan

## Current Issues
- **File size**: 1756 lines - too large to manage
- **State management**: 20+ useState hooks in one component
- **Mixed responsibilities**: Contract listing, inspection, meter reading all in one file
- **Code duplication**: Date parsing logic repeated multiple times
- **Large modals**: Inspection modal is 350+ lines embedded in main file

## Optimization Strategy

### ✅ Completed
1. **Utility Functions** (`utils/dateUtils.ts`)
   - Centralized date parsing and formatting
   - Eliminates duplication
   - Handles timezone issues consistently

2. **Component Extraction** (`components/InspectionItemRow.tsx`)
   - Extracted inspection item row component
   - Reduces main file by ~90 lines

3. **Statistics Component** (`components/StatisticsCards.tsx`)
   - Extracted statistics cards
   - Cleaner separation of concerns

4. **Type Definitions** (`types.ts`)
   - Centralized type definitions
   - Better type safety

### 🔄 Next Steps (Recommended)

#### 1. Extract Filters Component
**File**: `components/Filters.tsx`
- Building, Unit, Status, Search filters
- ~100 lines reduction

#### 2. Extract Contract Table Component
**File**: `components/ContractTable.tsx`
- Table rendering logic
- Row rendering
- ~150 lines reduction

#### 3. Extract Detail Modal Component
**File**: `components/DetailModal.tsx`
- Contract detail display
- ~150 lines reduction

#### 4. Extract Inspection Modal Component
**File**: `components/InspectionModal.tsx`
- All inspection-related UI
- Meter reading section
- ~400 lines reduction

#### 5. Create Custom Hooks
**File**: `hooks/useContracts.ts`
- Contract loading logic
- Filtering logic
- State management

**File**: `hooks/useInspections.ts`
- Inspection loading
- Inspection operations
- State management

**File**: `hooks/useMeterReadings.ts`
- Meter reading logic
- Cycle/assignment management

#### 6. Extract Contract Status Logic
**File**: `utils/contractStatus.ts`
- Status calculation
- Status label generation
- Expiry checking

## Benefits After Full Refactoring

1. **Maintainability**: Each component has single responsibility
2. **Testability**: Smaller components easier to test
3. **Reusability**: Components can be reused elsewhere
4. **Readability**: Main page becomes ~300-400 lines (vs 1756)
5. **Performance**: Better code splitting and lazy loading
6. **Developer Experience**: Easier to find and fix bugs

## File Structure After Optimization

```
rental-review/
├── page.tsx                    (~300-400 lines - main orchestrator)
├── types.ts                    (type definitions)
├── utils/
│   ├── dateUtils.ts           (date utilities)
│   └── contractStatus.ts      (status logic)
├── components/
│   ├── StatisticsCards.tsx    (statistics display)
│   ├── Filters.tsx            (filter controls)
│   ├── ContractTable.tsx      (table display)
│   ├── DetailModal.tsx        (contract details)
│   ├── InspectionModal.tsx    (inspection UI)
│   └── InspectionItemRow.tsx  (item row)
└── hooks/
    ├── useContracts.ts        (contract data)
    ├── useInspections.ts      (inspection data)
    └── useMeterReadings.ts    (meter reading data)
```

## Migration Strategy

1. ✅ Create utility functions (done)
2. ✅ Extract small components (done)
3. ⏳ Extract larger components (next)
4. ⏳ Create custom hooks
5. ⏳ Refactor main page to use new structure
6. ⏳ Remove old code
7. ⏳ Test thoroughly

## Notes

- All changes maintain backward compatibility
- No breaking changes to API or functionality
- Can be done incrementally
- Each step can be tested independently














