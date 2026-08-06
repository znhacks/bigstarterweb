import type { FeatureGates } from "@/config/feature-definitions";

interface UseFeatureGateParams {
  featureGates: FeatureGates;
  planName?: string;
}

export function useFeatureGate({ featureGates, planName }: UseFeatureGateParams) {
  const canUse = (featureKey: keyof Omit<FeatureGates, "maxUsers">): boolean => {
    return featureGates[featureKey] === true;
  };

  const getLimit = (limitKey: "maxUsers"): number => {
    return featureGates[limitKey] ?? 0;
  };

  return {
    planName: planName ?? "",
    featureGates,
    canUse,
    getLimit
  };
}
