export const tenantConfig = {
  // 1. Fitur-fitur yang ingin diaktifkan/dinonaktifkan secara global
  features: {
    enableAddress: true, // Aktifkan jika aplikasi membutuhkan alamat fisik tenant
    enableTaxId: true, // Aktifkan jika membutuhkan nomor NPWP/VAT untuk billing
    enableBusinessContact: true, // Aktifkan jika membutuhkan email & nomor telepon khusus bisnis
    enableRegionalSettings: true // Aktifkan jika ingin tenant bisa mengatur timezone & mata uang sendiri
  },

  // 2. Pengaturan nilai default dan daftar pilihan yang didukung
  defaults: {
    locale: "en",
    timezone: "UTC",
    currency: "IDR"
  },

  supported: {
    // Daftar bahasa yang didukung oleh aplikasi Anda
    locales: [
      { code: "en", label: "English" },
      { code: "id", label: "Bahasa Indonesia" }
    ],
    // Daftar mata uang yang didukung untuk transaksi/laporan
    currencies: [
      { code: "USD", symbol: "$" },
      { code: "IDR", symbol: "Rp" },
      { code: "SGD", symbol: "S$" }
    ]
  },

  // 3. Penamaan istilah (Noun) untuk fleksibilitas tipe tenant di UI
  labels: {
    singular: "Organization", // Bisa diganti "Team", "Workspace", "Company", dll.
    plural: "Organizations"
  }
};

export type TenantConfig = typeof tenantConfig;
