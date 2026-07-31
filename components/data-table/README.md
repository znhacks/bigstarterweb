# Data Table / Data Grid

Sistem tabel terpusat dalam **satu file**: [`data-grid.tsx`](./data-grid.tsx).
Pintu import publik **hanya satu** — selalu import dari:

```ts
import { DataGrid, useDataTable, textCol, ... } from "@/components/data-table";
```

> Setelah mengetik `from "@/components/data-table"` dan menulis `{ `, tekan **Ctrl+Space** di VS Code — semua opsi muncul sebagai named export (tanpa titik).

---

## Dua cara pemakaian

### 1. Compound `<DataGrid>` (rekomendasi untuk halaman baru)

`<DataGrid>` adalah root yang menyediakan instance `table` lewat React context, sehingga bagian-bagian anak (`DataGridSearch`, `DataGridTable`, dll.) tak perlu menerima prop `table` berulang.

```tsx
import { DataGrid, DataGridToolbar, DataGridSearch, DataGridBulkActions,
         DataGridViewOptions, DataGridTable, DataGridPagination,
         useDataTable, textCol, actionCol } from "@/components/data-table";

const table = useDataTable({ columns, data: rows });

<DataGrid table={table} columns={columns} noResultsText="Tidak ada data">
  <DataGrid.Toolbar>
    <DataGrid.Search columnId="name" placeholder="Cari nama…" />

    <DataGrid.BulkActions
      table={table}                       // opsional; berikan agar `actions` ter-tipa kuat
      label="Aksi massal"
      actions={[
        { label: "Nonaktifkan", icon: Ban, tone: "warning",
          disabled: (rows) => rows.every((r) => !r.is_active),
          onSelect: (rows) => openDeactivateDialog() },
        { label: "Hapus", icon: Trash2, tone: "destructive", separator: true,
          onSelect: (rows) => openDeleteDialog() }
      ]}
    />

    <DataGrid.ViewOptions className="md:ms-auto" label="Kolom" />
  </DataGrid.Toolbar>

  <DataGrid.Table />
  <DataGridPagination pageSizeOptions={[10, 20, 50, 100]} />
</DataGrid>
```

**Catatan:** Sub-komponen dipanggil sebagai **named import** (`<DataGridToolbar>`, `<DataGridSearch>`, dst.), bukan `<DataGrid.Toolbar>`.

### 2. Granular (rakit sendiri)

Untuk kasus yang butuh kontrol penuh, impor bagian individual:

```tsx
import { useDataTable, DataTable, DataTableSearch,
         DataTablePagination, DataTableViewOptions } from "@/components/data-table";

<div className="flex flex-wrap items-center gap-2">
  <DataTableSearch table={table} columnId="name" placeholder="Cari…" />
  <DataTableViewOptions table={table} className="md:ms-auto" />
</div>
<DataTable table={table} columns={columns} />
<DataTablePagination table={table} />
```

---

## API — Compound `<DataGrid>`

| Komponen | Props | Konteks |
|---|---|---|
| `DataGrid` (root) | `table`, `columns?`, `density?`, `noResultsText?`, `children` | menyediakan context |
| `DataGridToolbar` | `className?`, `children` | — (layout flex) |
| `DataGridSearch` | `columnId?` (per-kolom) **atau** `global?` (lintas kolom), `placeholder?`, `className?` | `table` |
| `DataGridViewOptions` | `label?`, `className?`, `storageKey?` | `table` |
| `DataGridTable` | `density?`, `noResultsText?` (fallback ke root) | `table` + `columns` |
| `DataGridPagination` | `pageSizeOptions?`, label props | `table` |
| `DataGridBulkActions` | `table?`, `actions`, `label?`, `className?` | `table` (atau override) |

`DataGrid` hanya membungkus children dengan context provider — **tanpa DOM/spacing tambahan** — jadi layout halaman tak berubah.

---

## Hook `useDataTable`

```ts
const table = useDataTable({
  columns,
  data,
  initialSorting?,
  initialColumnVisibility?,     // contoh: { status: false }
  initialPageSize?,             // default 10
  manualPagination?,            // true untuk server-side pagination
  manualSorting?,
  manualFiltering?,
  pageCount?,                   // wajib jika manualPagination
  meta?                         // TableMeta custom
});
```

---

## Factory kolom

Semua factory mengembalikan `ColumnDef<T>`. Umumnya dipakai bersama `createSelectColumn()` / `selectCol()` di awal array kolom.

```tsx
const columns = [
  createSelectColumn<PlanRow>(),      // kolom select sederhana
  // atau: selectCol<PlanRow>({ header: "Pilih" }),   // versi yang dapat dikonfigurasi

  textCol<PlanRow>({
    key: "name",                      // accessorKey
    header: "Nama",
    width?: 200,
    enableSorting?: true,             // default true
    enableHiding?: true,              // default true
    enableGlobalFilter?: true,        // default ikut global search; set false untuk mengecualikan
    filterFn?: FilterFn<any>,         // lihat catatan filterFn di bawah
    cell?: (row) => <b>{row.name}</b>
  }),

  numCol<PlanRow>({ key: "price", header: "Harga", format?: (v) => ... , locale? , cell? }),
  dateCol<PlanRow>({ key: "created_at", header: "Dibuat", format?, locale?, cell? }),
  actionCol<PlanRow>({ header?: "Aksi", cell: (row) => <Menu ... /> })
];
```

- `numCol` otomatis rata kanan + memakai `NumericCell` bila tanpa `cell` custom.
- `actionCol` selalu rata kanan, tidak bisa di-sort/sembunyikan.
- `meta.align` / `meta.width` / `meta.label` diatur otomatis oleh factory.

---

## ⚠️ Search & `filterFn` (penting)

Ada **dua mode** search:

### A. Global search (1 kotak, lintas banyak kolom) — rekomendasi

```tsx
<DataGridSearch global placeholder="Cari di semua kolom…" />
```

Satu input menyaring **semua kolom yang aktif** sekaligus (memakai TanStack global filter). Default: semua kolom ikut. Untuk **membatasi kolom mana saja yang ikut dicari** (mis. hanya `name` & `location`), set `enableGlobalFilter: false` pada kolom lain di definisi kolom:

```tsx
textCol<PlanRow>({ key: "name",     header: "Name",     enableGlobalFilter: true }),  // ikut
textCol<PlanRow>({ key: "location", header: "Location", enableGlobalFilter: true }),  // ikut
textCol<PlanRow>({ key: "id",       header: "ID",       enableGlobalFilter: false }), // dikecualikan
numCol <PlanRow>({ key: "price",    header: "Price",    enableGlobalFilter: false }), // dikecualikan
```

Kolom `select` & `actions` otomatis tidak ikut global search.

**Nilai objek/multi-bahasa:** bila suatu kolom berisi objek (mis. nama multi-bahasa `Record<string,string>`), filter global default men-stringify-nya jadi `"[object Object]"`. Berikan `globalFilterFn` ke `useDataTable` untuk menangani kasus khusus:

```tsx
const table = useDataTable({
  columns,
  data: rows,
  globalFilterFn: (row, columnId, filterValue: string) => {
    const term = String(filterValue ?? "").toLowerCase().trim();
    if (!term) return true;
    if (columnId === "name") {
      return getLocalizedValue(row.original.name, locale).toLowerCase().includes(term);
    }
    const val = row.getValue(columnId);
    return val != null && String(val).toLowerCase().includes(term);
  }
});
```

### B. Per-kolom (1 kotak = 1 kolom)

```tsx
<DataGridSearch columnId="name" placeholder="Cari nama…" />
```

Kolom yang dicari perlu `filterFn` yang sesuai bila nilainya bukan string biasa (contoh sama seperti `globalFilterFn` di atas, namun dipasang via prop `filterFn` di factory kolom).

> Pencarian memfilter saat **Enter** ditekan atau tombol search diklik (bukan live per ketikan).

Untuk filter multi-select (facet), pakai `multiSelectFilterFn`:

```tsx
textCol<User>({ key: "role", header: "Role", filterFn: multiSelectFilterFn })
```

---

## Bulk actions (`DataGridBulkActions`)

```tsx
type BulkAction<TData> = {
  label: ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "warning" | "destructive";
  separator?: boolean;                                  // render pemisah sebelum item
  disabled?: boolean | ((rows: TData[]) => boolean);   // bisa dinamis terhadap baris terpilih
  onSelect: (rows: TData[]) => void;                    // menerima baris terpilih
};
```

Tombol otomatis nonaktif saat tak ada baris terpilih, dan menampilkan badge jumlah baris terpilih.

---

## Faceted filter (`DataTableFacetedFilter`)

```tsx
<DataTableFacetedFilter
  column={table.getColumn("status")}
  title="Status"
  options={[ { value: "active", label: "Active" }, { value: "expired", label: "Expired" } ]}
  emptyText="Tidak ditemukan."
/>
```

---

## Sel bantu

- `NumericCell` — angka rata kanan, tabular, placeholder `-` saat kosong.
- `EditableCell` — sel editable (text/date/select) dengan commit pada Enter/blur.
- `ReadonlyCell` — sel klik-untuk-lihat.

---

## Ekspor lengkap

**Komponen:** `DataGrid`, `DataGridToolbar`, `DataGridSearch`, `DataGridViewOptions`, `DataGridTable`, `DataGridPagination`, `DataGridBulkActions`, `DataTable`, `DataTableSearch`, `DataTablePagination`, `DataTableViewOptions`, `DataTableBulkActions`, `DataTableColumnHeader`, `DataTableFacetedFilter`.

**Hook:** `useDataTable`, `useDataGridContext`.

**Kolom & filter:** `createSelectColumn`, `selectCol`, `textCol`, `numCol`, `dateCol`, `actionCol`, `multiSelectFilterFn`.

**Sel:** `NumericCell`, `EditableCell`, `ReadonlyCell`.

**Tipe:** `DataGridProps`, `DataGridDensity`, `BulkActionTone`, `DataTableBulkAction`, `DataTableFacetedFilterOption`, `SelectOption`.

---

## Struktur file

```
components/data-table/
├── data-grid.tsx   # SATU-satunya sumber implementasi
└── index.ts        # SATU-satunya pintu import publik (barrel)
```

Jangan buat file granular baru — semua tambahan fitur tabel ditulis di `data-grid.tsx` dan di-reexport lewat `index.ts`.
