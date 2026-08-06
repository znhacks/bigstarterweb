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

  dashboardView: "dashboard.view",
  settingsView: "settings.view",

  // Monitoring Domain
  monitoringView: "monitoring.view",
  monitoringJournals: "monitoring.journals",
  monitoringActivityLogs: "monitoring.activity_logs",
  monitoringUsers: "monitoring.users",
  monitoringManageUsers: "monitoring.manage_users",
  monitoringReports: "monitoring.reports",

  // Notifications Domain
  notificationsRead: "notifications.read",
  notificationsManage: "notifications.manage",

  // Reports & Analytics Domain
  reportsView: "reports.view",
  reportsExport: "reports.export"
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
  "dashboard.view": "Access the organization dashboard",
  "settings.view": "Access organization and account settings",
  "organization.view": "Can View Organization",

  // Monitoring
  "monitoring.view": "Access monitoring portal & overview",
  "monitoring.journals": "Access and monitor teacher learning journals",
  "monitoring.activity_logs": "View system and user activity audit logs",
  "monitoring.users": "View school teachers & user status",
  "monitoring.manage_users": "Manage & assign school users in monitoring",
  "monitoring.reports": "Access monitoring analytics & summary reports",

  // Notifications
  "notifications.read": "View system & channel notifications",
  "notifications.manage": "Configure & send broadcast notifications",

  // Reports
  "reports.view": "View analytics and system reports",
  "reports.export": "Export report data to CSV/PDF"
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
    domain: "monitoring",
    label: "Monitoring",
    names: [
      PERMISSIONS.monitoringView,
      PERMISSIONS.monitoringJournals,
      PERMISSIONS.monitoringActivityLogs,
      PERMISSIONS.monitoringUsers,
      PERMISSIONS.monitoringManageUsers,
      PERMISSIONS.monitoringReports
    ]
  },
  {
    domain: "billing",
    label: "Billing",
    names: [PERMISSIONS.billingRead, PERMISSIONS.billingManage]
  },
  {
    domain: "notifications",
    label: "Notifications",
    names: [PERMISSIONS.notificationsRead, PERMISSIONS.notificationsManage]
  },
  {
    domain: "reports",
    label: "Reports & Analytics",
    names: [PERMISSIONS.reportsView, PERMISSIONS.reportsExport]
  },
  {
    domain: "api",
    label: "API Keys",
    names: [PERMISSIONS.apiKeysManage]
  },
  {
    domain: "general",
    label: "General",
    names: [PERMISSIONS.dashboardView, PERMISSIONS.settingsView]
  }
];

/** Nama manusiawi untuk tiap permission (Bahasa Indonesia, Inggris, & Arab). */
export const PERMISSION_LABELS: Record<string, { id: string; en: string; ar: string }> = {
  "organization.read": {
    id: "Lihat Detail Organisasi",
    en: "View Organization Details",
    ar: "عرض تفاصيل المؤسسة"
  },
  "organization.update": {
    id: "Ubah Pengaturan Organisasi",
    en: "Update Organization Settings",
    ar: "تعديل إعدادات المؤسسة"
  },
  "organization.delete": {
    id: "Hapus Organisasi",
    en: "Delete Organization",
    ar: "حذف المؤسسة"
  },
  "organization.view": {
    id: "Lihat Organisasi",
    en: "View Organization",
    ar: "عرض المؤسسة"
  },

  "members.read": {
    id: "Lihat Daftar Anggota",
    en: "View Members List",
    ar: "عرض قائمة الأعضاء"
  },
  "members.invite": {
    id: "Undang Anggota Baru",
    en: "Invite New Members",
    ar: "دعوة أعضاء جدد"
  },
  "members.manage": {
    id: "Kelola & Ubah Peran Anggota",
    en: "Manage Member Roles",
    ar: "إدارة وتغيير أدوار الأعضاء"
  },
  "members.remove": {
    id: "Hapus/Keluarkan Anggota",
    en: "Remove Members",
    ar: "إزالة الأعضاء من المؤسسة"
  },

  "billing.read": {
    id: "Lihat Penagihan & Transaksi",
    en: "View Billing & Transactions",
    ar: "عرض الفواتير والمعاملات"
  },
  "billing.manage": {
    id: "Kelola Paket & Langganan",
    en: "Manage Subscription & Billing",
    ar: "إدارة الاشتراكات والخطط"
  },

  "api_keys.manage": {
    id: "Kelola & Buat API Key",
    en: "Manage & Create API Keys",
    ar: "إدارة وإنشاء مفاتيح API"
  },

  "dashboard.view": {
    id: "Akses Dasbor Organisasi",
    en: "Access Organization Dashboard",
    ar: "الوصول إلى لوحة التحكم"
  },
  "settings.view": {
    id: "Akses Pengaturan Akun & Organisasi",
    en: "Access Settings",
    ar: "الوصول إلى الإعدادات"
  },

  // Monitoring Labels
  "monitoring.view": {
    id: "Akses Portal Monitoring",
    en: "Access Monitoring Portal",
    ar: "الوصول إلى بوابة المراقبة"
  },
  "monitoring.journals": {
    id: "Monitoring Jurnal Mengajar",
    en: "Monitor Learning Journals",
    ar: "مراقبة سجلات التدريس"
  },
  "monitoring.activity_logs": {
    id: "Monitoring Log Aktivitas",
    en: "Monitor Activity Logs",
    ar: "مراقبة سجلات النشاط"
  },
  "monitoring.users": {
    id: "Monitoring User & Status Guru",
    en: "Monitor Teachers & Users",
    ar: "مراقبة المعلمين والمستخدمين"
  },
  "monitoring.manage_users": {
    id: "Kelola User Sekolah di Monitoring",
    en: "Manage School Users in Monitoring",
    ar: "إدارة مستخدمي المدرسة في المراقبة"
  },
  "monitoring.reports": {
    id: "Akses Laporan & Analitik Monitoring",
    en: "Access Monitoring Reports",
    ar: "الوصول إلى تقارير المراقبة"
  },

  // Notifications Labels
  "notifications.read": {
    id: "Lihat Notifikasi Sistem",
    en: "View System Notifications",
    ar: "عرض إشعارات النظام"
  },
  "notifications.manage": {
    id: "Kelola & Kirim Broadcast Notifikasi",
    en: "Manage Broadcast Notifications",
    ar: "إدارة وإرسال الإشعارات"
  },

  // Reports Labels
  "reports.view": {
    id: "Lihat Laporan & Analitik",
    en: "View System Reports",
    ar: "عرض تقارير النظام"
  },
  "reports.export": {
    id: "Ekspor Laporan Data (CSV/PDF)",
    en: "Export Report Data",
    ar: "تصدير بيانات التقارير"
  }
};

export const GROUP_LABELS: Record<string, { id: string; en: string; ar: string }> = {
  organization: { id: "Organisasi", en: "Organization", ar: "المؤسسة" },
  members: { id: "Anggota", en: "Members", ar: "الأعضاء" },
  monitoring: { id: "Monitoring & Layanan", en: "Monitoring & Services", ar: "المراقبة والخدمات" },
  billing: { id: "Penagihan & Langganan", en: "Billing & Subscriptions", ar: "الاشتراكات والفلترة" },
  notifications: { id: "Notifikasi", en: "Notifications", ar: "الإشعارات" },
  reports: { id: "Laporan & Analitik", en: "Reports & Analytics", ar: "التقارير والتحليلات" },
  api: { id: "Kunci API", en: "API Keys", ar: "مفاتيح API" },
  general: { id: "Umum", en: "General", ar: "عام" }
};

export function formatPermissionLabel(name: string, locale = "id"): string {
  const item = PERMISSION_LABELS[name];
  if (item) {
    if (locale === "ar") return item.ar;
    if (locale === "en") return item.en;
    return item.id;
  }
  return name
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function formatGroupLabel(domain: string, defaultLabel: string, locale = "id"): string {
  const item = GROUP_LABELS[domain];
  if (item) {
    if (locale === "ar") return item.ar;
    if (locale === "en") return item.en;
    return item.id;
  }
  return defaultLabel;
}
