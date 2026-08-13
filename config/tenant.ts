export const tenantConfig = {
  organizations: {
    enabled: true,
    requireOrganization: true,
    hideOrganization: false,
    enableUsersToCreateOrganizations: true,
    /** Batas maksimum anggota untuk paket Free (0 = tidak ada batas) */
    freeMemberLimit: 3
  },

  features: {
    enableAddress: true,
    enableTaxId: true,
    enableBusinessContact: true,
    enableRegionalSettings: false
  },

  defaults: {
    locale: "en",
    timezone: "UTC",
    currency: "IDR"
  },
  supported: {
    locales: [
      { code: "en", label: "English" },
      { code: "id", label: "Bahasa Indonesia" }
    ],

    currencies: [
      { code: "USD", symbol: "$" },
      { code: "IDR", symbol: "Rp" },
      { code: "SGD", symbol: "S$" }
    ]
  },

  labels: {
    singular: "Organization",
    plural: "Organizations"
  }
};
export type TenantConfig = typeof tenantConfig;
