// hooks/use-feature-gate.ts
//
// Client-side feature gate helper. Kini DB-driven: menerima objek featureGates
// (hasil decode plans.features[] di server via getTenantPlan) alih-alih lookup config.

import type { FeatureGates } from "@/config/feature-definitions";

interface UseFeatureGateParams {
  featureGates: FeatureGates; // Ter-decode di server, diteruskan ke client
  planName?: string;
}

export function useFeatureGate({ featureGates, planName }: UseFeatureGateParams) {
  /**
   * Cek apakah fitur boolean diizinkan. Contoh: canUse('allowPdfFormat')
   */
  const canUse = (featureKey: keyof Omit<FeatureGates, "maxUsers" | "maxTasks">): boolean => {
    return featureGates[featureKey] === true;
  };

  /**
   * Cek batas limit numerik fitur. Contoh: getLimit('maxTasks')
   */
  const getLimit = (limitKey: "maxUsers" | "maxTasks"): number => {
    return featureGates[limitKey] ?? 0;
  };

  return {
    planName: planName ?? "",
    featureGates,
    canUse,
    getLimit
  };
}
