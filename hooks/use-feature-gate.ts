// hooks/use-feature-gate.ts

import { plans, FeatureGates } from "../config/billing";

interface UseFeatureGateParams {
  activePlanId: string; // Dikirim dari Server Component / Context Session saat layout dimuat
}

export function useFeatureGate({ activePlanId }: UseFeatureGateParams) {
  // Ambil data plan aktif berdasarkan ID, fallback ke paket 'free'
  const currentPlan =
    plans.find((p) => p.id === activePlanId) || plans.find((p) => p.id === "free")!;

  /**
   * Cek apakah fitur boolean diizinkan
   * Contoh: canUse('allowPdfFormat')
   */
  const canUse = (featureKey: keyof Omit<FeatureGates, "maxUsers" | "maxScreenshots">): boolean => {
    return currentPlan.featureGates[featureKey] === true;
  };

  /**
   * Cek batas limit numerik fitur
   * Contoh: getLimit('maxScreenshots')
   */
  const getLimit = (limitKey: "maxUsers" | "maxTasks"): number => {
    return currentPlan.featureGates[limitKey];
  };

  return {
    planName: currentPlan.name,
    featureGates: currentPlan.featureGates,
    canUse,
    getLimit
  };
}
