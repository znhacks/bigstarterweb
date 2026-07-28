export const PERMISSIONS = {
  organizationRead: "organization.read",
  organizationUpdate: "organization.update",
  organizationDelete: "organization.delete",
  organizationView: "organization.view",

  membersRead: "members.read",
  membersInvite: "members.invite",
  membersManage: "members.manage",
  membersRemove: "members.remove",

  billingRead: "billing.read",
  billingManage: "billing.manage",

  apiKeysManage: "api_keys.manage",

  tasksRead: "tasks.read",
  tasksCreate: "tasks.create",
  tasksUpdate: "tasks.update",
  tasksDelete: "tasks.delete",

  dashboardView: "dashboard.view",
  settingsView: "settings.view"
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionName[] = Object.values(PERMISSIONS);

/** Deskripsi tiap permission (di-sync ke DB oleh syncRbacToDb). */
export const PERMISSION_DESCRIPTIONS: Record<PermissionName, string> = {
  "organization.read": "View organization details",
  "organization.update": "Update organization settings",
  "organization.delete": "Delete the organization",
  "members.read": "View organization members",
  "members.invite": "Invite new members",
  "members.manage": "Change member roles",
  "members.remove": "Remove members from the organization",
  "billing.read": "View billing and transaction history",
  "billing.manage": "Manage subscription, cancel, resume, downgrade",
  "api_keys.manage": "Create, rotate, and revoke API keys",
  "tasks.read": "View tasks",
  "tasks.create": "Create new tasks",
  "tasks.update": "Edit existing tasks",
  "tasks.delete": "Delete tasks",
  "dashboard.view": "Access the organization dashboard",
  "settings.view": "Access organization and account settings",
  "organization.view": "Can View Organization"
};

export const PERMISSION_GROUPS: {
  domain: string;
  label: string;
  names: PermissionName[];
}[] = [
  {
    domain: "organization",
    label: "Organization",
    names: [
      PERMISSIONS.organizationRead,
      PERMISSIONS.organizationUpdate,
      PERMISSIONS.organizationDelete
    ]
  },
  {
    domain: "members",
    label: "Members",
    names: [
      PERMISSIONS.membersRead,
      PERMISSIONS.membersInvite,
      PERMISSIONS.membersManage,
      PERMISSIONS.membersRemove
    ]
  },
  {
    domain: "billing",
    label: "Billing",
    names: [PERMISSIONS.billingRead, PERMISSIONS.billingManage]
  },
  {
    domain: "api",
    label: "API Keys",
    names: [PERMISSIONS.apiKeysManage]
  },
  {
    domain: "tasks",
    label: "Tasks",
    names: [
      PERMISSIONS.tasksRead,
      PERMISSIONS.tasksCreate,
      PERMISSIONS.tasksUpdate,
      PERMISSIONS.tasksDelete
    ]
  },
  {
    domain: "general",
    label: "General",
    names: [PERMISSIONS.dashboardView, PERMISSIONS.settingsView]
  }
];
