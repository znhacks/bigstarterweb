// Single entry point for the data-table system.
// Use the compound <DataGrid> for new pages, or import the granular pieces directly.

// Compound component
export {
  DataGrid,
  DataGridToolbar,
  DataGridSearch,
  DataGridViewOptions,
  DataGridTable,
  DataGridPagination,
  DataGridBulkActions,
  useDataGridContext
} from "./data-grid";
export type { DataGridProps, DataGridDensity } from "./data-grid";

// Granular building blocks
export { DataTable } from "./data-table";
export { DataTableSearch } from "./data-table-search";
export { DataTablePagination } from "./data-table-pagination";
export { DataTableViewOptions } from "./data-table-view-options";
export {
  DataTableBulkActions,
  type BulkActionTone,
  type DataTableBulkAction
} from "./data-table-bulk-actions";

// Hooks & column helpers
export { useDataTable } from "./use-data-table";
export { createSelectColumn } from "./data-table-select-column";
export { textCol, numCol, dateCol, actionCol } from "./columns";
export { multiSelectFilterFn } from "./data-table-filters";

// Standalone cells & headers
export { DataTableColumnHeader } from "./data-table-column-header";
export { DataTableFacetedFilter, type DataTableFacetedFilterOption } from "./data-table-faceted-filter";
export { NumericCell } from "./numeric-cell";
export { EditableCell, ReadonlyCell, type SelectOption } from "./editable-cell";
