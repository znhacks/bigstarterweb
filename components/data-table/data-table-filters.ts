import { FilterFn } from "@tanstack/react-table";

// Attach via `filterFn: multiSelectFilterFn` on any column filtered by a
// list of selected values (status, role, plan, etc). Not required —
// write your own filterFn per column whenever this doesn't fit.
export const multiSelectFilterFn: FilterFn<any> = (row, columnId, filterValue: string[]) => {
  if (!filterValue || filterValue.length === 0) return true;
  const rowValue = String(row.getValue(columnId)).toLowerCase();
  return filterValue.map((v) => v.toLowerCase()).includes(rowValue);
};
