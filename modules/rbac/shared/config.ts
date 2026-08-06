import { ALL_PERMISSIONS, PERMISSIONS, type PermissionName } from "./permissions";

export interface RoleDefinition {
  name: string;

  label: string;

  hierarchy: number;

  description: string;

  color?: string;
}

export interface SyncResult {
  success: boolean;
  error?: string;
}

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    name: "Member",
    label: "Member",
    hierarchy: 10,
    description: "Read-only access + basic interactions (view billing).",
    color: "bg-blue-500/10 text-blue-600"
  },
  {
    name: "Admin",
    label: "Admin",
    hierarchy: 50,
    description: "Operational writes: manage members, billing — cannot delete org.",
    color: "bg-amber-500/10 text-amber-600"
  },
  {
    name: "Owner",
    label: "Owner",
    hierarchy: 100,
    description: "Full control including organization deletion. Untransferable top-level.",
    color: "bg-emerald-500/10 text-emerald-600"
  }
];

export const DEFAULT_GRANTS: Record<string, PermissionName[]> = {
  Member: [
    PERMISSIONS.organizationRead,
    PERMISSIONS.membersRead,
    PERMISSIONS.billingRead,
    PERMISSIONS.dashboardView,
    PERMISSIONS.settingsView
  ],
  Admin: [
    PERMISSIONS.organizationRead,
    PERMISSIONS.organizationUpdate,
    PERMISSIONS.membersRead,
    PERMISSIONS.membersInvite,
    PERMISSIONS.membersManage,
    PERMISSIONS.membersRemove,
    PERMISSIONS.billingRead,
    PERMISSIONS.billingManage,
    PERMISSIONS.apiKeysManage,
    PERMISSIONS.dashboardView,
    PERMISSIONS.settingsView
  ],
  Owner: ALL_PERMISSIONS
};

export function getRoleByName(name: string): RoleDefinition | undefined {
  return ROLE_DEFINITIONS.find((r) => r.name === name);
}

export function getRoleByHierarchy(level: number): RoleDefinition | undefined {
  return [...ROLE_DEFINITIONS]
    .sort((a, b) => b.hierarchy - a.hierarchy)
    .find((r) => level >= r.hierarchy);
}

export function getDefaultGrants(roleName: string): PermissionName[] {
  return DEFAULT_GRANTS[roleName] ?? [];
}
