export const tenantConfig = {
  organizations: {
    enabled: true,
    requireOrganization: true,
    hideOrganization: false,
    enableUsersToCreateOrganizations: true
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
      { code: "id", label: "Bahasa Indonesia" },
      { code: "ar", label: "العربية" }
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
