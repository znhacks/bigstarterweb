export const VIRTUAL_PLANS_CONFIG = {
  free: {
    enabled: true,
    plan: {
      id: "free",
      name: { en: "Free", id: "Gratis", ar: "مجاني" },
      description: {
        en: "Get started for free",
        id: "Mulai secara gratis",
        ar: "ابدأ مجانًا"
      },
      displayFeatures: {
        en: ["Up to 3 members", "20 tasks/month", "Basic support"],
        id: ["Hingga 3 anggota", "20 tugas/bulan", "Dukungan dasar"],
        ar: ["حتى 3 أعضاء", "20 مهمة/شهر", "دعم أساسي"]
      }
    }
  },
  enterprise: {
    enabled: true,
    plan: {
      id: "enterprise",
      name: { en: "Enterprise", id: "Enterprise", ar: "Enterprise" },
      description: {
        en: "Custom solutions for large teams",
        id: "Solusi khusus untuk tim besar",
        ar: "حلول مخصصة للفرق الكبيرة"
      },
      displayFeatures: {
        en: [
          "Unlimited members",
          "Priority support",
          "Dedicated account manager",
          "Custom integrations"
        ],
        id: [
          "Anggota tak terbatas",
          "Dukungan prioritas",
          "Manajer akun khusus",
          "Integrasi kustom"
        ],
        ar: ["أعضاء غير محدود", "دعم ذو أولوية", "مدير حساب مخصص", "تكاملات مخصصة"]
      }
    }
  }
};

type VirtualPlanDef = (typeof VIRTUAL_PLANS_CONFIG)[keyof typeof VIRTUAL_PLANS_CONFIG]["plan"];

export function buildVirtualPlan(def: VirtualPlanDef, isEnterprise: boolean) {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    displayFeatures: def.displayFeatures,
    features: def.displayFeatures,
    featureGates: null,
    isEnterprise,
    isRecommended: false,
    trialDays: 0,
    prices: {
      monthly: { amount: 0, currency: "IDR", convertedAmount: 0, productId: null, providers: {} },
      yearly: { amount: 0, currency: "IDR", convertedAmount: 0, productId: null, providers: {} }
    }
  };
}

export function getActiveVirtualPlans() {
  const plans: ReturnType<typeof buildVirtualPlan>[] = [];
  if (VIRTUAL_PLANS_CONFIG.free.enabled) {
    plans.push(buildVirtualPlan(VIRTUAL_PLANS_CONFIG.free.plan, false));
  }
  if (VIRTUAL_PLANS_CONFIG.enterprise.enabled) {
    plans.push(buildVirtualPlan(VIRTUAL_PLANS_CONFIG.enterprise.plan, true));
  }
  return plans;
}
