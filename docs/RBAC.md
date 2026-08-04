# RBAC & Authorization Guide — bigstarter

Panduan lengkap cara kerja dan penggunaan sistem authorization (RBAC) di bigstarter.

---

## 1. Overview

bigstarter memakai model **RBAC (Role-Based Access Control)** multi-tenant:

```
User → Membership → Tenant + Role → Role Permissions → Permissions
```

- Satu user bisa jadi anggota **banyak tenant** (org), tiap membership punya **1 role**.
- Role menentukan **hierarchy level** + daftar **permissions**.
- **Superadmin** adalah sistem terpisah (bukan role membership) — akses penuh ke semua.

---

## 2. Permission Catalog

Sumber: [`modules/rbac/shared/permissions.ts`](../modules/rbac/shared/permissions.ts) — **15 permissions**, 6 domain:

| Domain | Permission | Deskripsi |
|---|---|---|
| **Organization** | `organization.read` | Lihat detail org |
| | `organization.update` | Edit nama/logo/detail org |
| | `organization.delete` | Soft-delete org |
| **Members** | `members.read` | Lihat daftar anggota |
| | `members.invite` | Undang anggota baru |
| | `members.manage` | Ubah role anggota |
| | `members.remove` | Hapus anggota |
| **Billing** | `billing.read` | Lihat info langganan/transaksi |
| | `billing.manage` | Cancel/resume/downgrade langganan |
| **Tasks** | `tasks.read` | Lihat tasks |
| | `tasks.create` | Buat task |
| | `tasks.update` | Edit task |
| | `tasks.delete` | Hapus task |
| **API Keys** | `api_keys.manage` | Buat/revoke API key |
| **General** | `dashboard.view` | Akses dashboard |
| | `settings.view` | Akses pengaturan |

```ts
import { PERMISSIONS } from "@/modules/rbac/shared";
// PERMISSIONS.tasksCreate === "tasks.create"
```

---

## 3. Role Hierarchy

Sumber: [`modules/rbac/shared/config.ts`](../modules/rbac/shared/config.ts) — 3 role default:

| Role | Hierarchy Level | Permissions |
|---|---|---|
| **Owner** | 100 | SEMUA (`ALL_PERMISSIONS`) |
| **Admin** | 50 | Read + operational writes (kecuali `organization.delete`) |
| **Member** | 10 | Read + `tasks.create` |

Aturan hierarchy: user hanya bisa assign role **di bawah** level-nya sendiri (`canAssignRole`).

---

## 4. Cara RBAC Bekerja (Alur)

### 4a. Server Component / Server Action / Route Handler

```
requirePermission(required, tenantSlug)
  → requireAuth()           // redirect /login bila belum login
  → getActiveTenant(slug)   // resolve membership user↔tenant by slug
  → ctx.permissions         // daftar permission dari role membership
  → hasPermission(perms, required)  → redirect bila tak punya
```

**Contoh — gate halaman tasks** ([`tasks/page.tsx`](../app/(auth)/(users)/[tenant_slug]/tasks/page.tsx)):
```tsx
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/modules/rbac/shared";

export default async function Page({ params }) {
  const { tenant_slug } = await params;
  const ctx = await requirePermission(PERMISSIONS.tasksRead, tenant_slug);
  // ctx.tenant.id, ctx.permissions, ctx.hierarchyLevel tersedia
  return <TasksView tenantId={ctx.tenant.id} ... />;
}
```

**Contoh — gate server action** ([`tasks/actions.ts`](../app/(auth)/(users)/[tenant_slug]/tasks/actions.ts)):
```ts
"use server";
const user = await requireAuth();
const ctx = await getActiveTenant(tenantSlug);
if (!ctx) return { error: "Akses ditolak" };
if (!ctx.permissions.includes(PERMISSIONS.tasksCreate)) return { error: "Akses ditolak" };
// ... lakukan operasi
```

### 4b. Client Component

```ts
import { hasPermission, PERMISSIONS } from "@/modules/rbac/shared";

// userPermissions: PermissionName[] — didapat dari fetch membership client-side
const canEdit = hasPermission(userPermissions, PERMISSIONS.organizationUpdate);
```

**Hook `useActiveTenant()`** ([`hooks/use-active-tenant.ts`](../hooks/use-active-tenant.ts)):
```ts
const { activeTenant, isTenantAdmin, loaded } = useActiveTenant();
if (!loaded) return <Loading/>;
if (!activeTenant) return <NoOrg/>;
```

### 4c. oRPC Public API (`/api/v1`, `/api/rpc`)

Sumber: [`lib/api/procedures.ts`](../lib/api/procedures.ts) — procedure builders:

```ts
// Read (apikey atau session):
protectedProcedure.route({ method: "GET", path: "/tasks" })...

// Mutasi (session only — API key read-only):
sessionProcedure.route({ method: "POST", path: "/tasks" })
  .handler(async ({ context }) => {
    await requirePermission(context, PERMISSIONS.tasksCreate);
    // ...
  });

// Superadmin only:
adminProcedure.route({ method: "GET", path: "/admin/stats" })...
```

---

## 5. Superadmin

Superadmin **bukan bagian dari RBAC membership**. Dideteksi via 2 jalur:

1. **Fast path**: `user.app_metadata.role === "superadmin"` (server-only, tak bisa ditulis client).
2. **Authoritative**: `profiles.is_superadmin === true` (dipakai RLS `is_superadmin()`).

```ts
import { requireSuperadmin } from "@/lib/auth";
await requireSuperadmin(); // redirect bila bukan superadmin
```

**Membuat superadmin via CLI**:
```bash
npm run create:user
# → prompt email, password, nama
# → "Jadikan superadmin? (y/N): y"
```

**Superadmin bypass**:
- Semua permission check (`hasPermission` → true untuk `ALL_PERMISSIONS`).
- `requireOrganization` di middleware → superadmin di-skip.
- RLS `is_superadmin()` → akses penuh semua tabel.
- oRPC `adminProcedure` → hanya superadmin.

---

## 6. Menambah Permission Baru

1. **Tambah ke catalog** ([`modules/rbac/shared/permissions.ts`](../modules/rbac/shared/permissions.ts)):
```ts
export const PERMISSIONS = {
  // ... existing
  invoicesRead: "invoices.read",
  invoicesManage: "invoices.manage",
} as const;
```

2. **Sync ke DB** (jalankan script):
```bash
npm run db:sync-rbac
```
Ini upsert role/permission ke DB secara idempoten.

3. **Assign ke role** ([`modules/rbac/shared/config.ts`](../modules/rbac/shared/config.ts) `DEFAULT_GRANTS`):
```ts
Owner: ALL_PERMISSIONS,
Admin: [...existing, PERMISSIONS.invoicesRead],
Member: [PERMISSIONS.invoicesRead],
```

4. **Gate halaman/action**:
```ts
await requirePermission(PERMISSIONS.invoicesRead, tenantSlug);
```

---

## 7. Menambah Role Baru

1. **Definisikan** di [`modules/rbac/shared/config.ts`](../modules/rbac/shared/config.ts):
```ts
ROLE_DEFINITIONS: [
  { name: "manager", hierarchy_level: 30, description: "Manager" },
  ...existing
]
```

2. **Assign permissions** di `DEFAULT_GRANTS`:
```ts
manager: [PERMISSIONS.tasksRead, PERMISSIONS.tasksCreate, PERMISSIONS.membersRead, ...],
```

3. **Sync**: `npm run db:sync-rbac`

---

## 8. Multi-Tenant Context

- **Active tenant** di-resolve dari **URL slug** (`/[tenant_slug]/...`), sama seperti supastarter.
- `getActiveTenant(slug)` — server-side, resolve membership by slug.
- `useActiveTenant()` — client-side hook.
- Isolasi data: tabel tenant (`tasks`) di schema `tenant_shared` atau `tenant_<sub>`; RLS per-tenant.

---

## 9. Config Flags (Developer Toggles)

### Auth — [`config/auth.ts`](../config/auth.ts)
```ts
AUTH_FEATURES = {
  enablePassword, enablePasswordlessOtp, enableMagicLink,
  enableGoogle, enableGithub, enablePasskey,
  enablePasswordReset, enableSignup
}
```

### Tenant — [`config/tenant.ts`](../config/tenant.ts)
```ts
tenantConfig.organizations = {
  enabled, requireOrganization,
  hideOrganization, enableUsersToCreateOrganizations
}
```

### Payment — [`config/payment.ts`](../config/payment.ts)
```ts
billingConfig = {
  billingAttachedTo: "tenant" | "user",
  requireActiveSubscription: boolean,
  activeProvider: string  // single provider (env override)
}
```

---

## 10. RLS (Row-Level Security) — Defense in Depth

RLS di DB Supabase sebagai **backstop** bila app-layer check terlewat. Helper functions:
- `is_tenant_member(tenant_id)` — anggota tenant?
- `is_tenant_admin(tenant_id)` — admin/owner?
- `is_tenant_owner(tenant_id)` — owner?
- `is_superadmin()` — superadmin sistem?

Policy migration: [`supabase/migrations/20260727000000_rls-core-tables.sql`](../supabase/migrations/20260727000000_rls-core-tables.sql).

---

## 11. Quick Reference

| Yang ingin dilakukan | Kode |
|---|---|
| Gate halaman server | `await requirePermission(PERM, slug)` |
| Gate server action | `ctx.permissions.includes(PERM)` |
| Gate client UI | `hasPermission(userPermissions, PERM)` |
| Cek superadmin | `await requireSuperadmin()` |
| Cek admin tenant | `useActiveTenant().isTenantAdmin` |
| API procedure read | `protectedProcedure.route(...)` |
| API procedure mutasi | `sessionProcedure.route(...) + requirePermission(ctx, PERM)` |
| API procedure superadmin | `adminProcedure.route(...)` |
| Tambah permission | `PERMISSIONS` + `modules/rbac/shared/config.ts` + `db:sync-rbac` |
| Buat superadmin | `npm run create:user` |

---

## 12. File Penting

| File | Fungsi |
|---|---|
| `modules/rbac/shared/permissions.ts` | Catalog 15 permission (SSOT) |
| `modules/rbac/shared/rules.ts` | `hasPermission`, `hasAnyPermission`, `canAssignRole` (pure function) |
| `modules/rbac/shared/types.ts` | `ResolvedAuthority`, `ActiveTenantContext` |
| `modules/rbac/shared/org-access.ts` | Aturan akses route organisation berbasis hierarchy |
| `modules/rbac/shared/config.ts` | Role definitions + default grants (`ROLE_DEFINITIONS`, `DEFAULT_GRANTS`) |
| `modules/rbac/server/services/sync.ts` | `syncRbacToDb` — sync role/permission ke DB |
| `lib/auth.ts` | `requireAuth`, `requirePermission`, `requireSuperadmin`, `getActiveTenant` |
| `services/tenant.ts` | `getActiveTenant(slug)` — resolve active tenant + authority |
| `lib/billing/tenant-auth.ts` | `isTenantMember`, `isTenantAdmin`, `canManageBilling` |
| `lib/api/context.ts` | oRPC `requirePermission` (API layer) |
| `lib/api/procedures.ts` | `protectedProcedure`, `sessionProcedure`, `adminProcedure` |
| `middleware.ts` | Auth redirect + banned + onboarding + requireOrganization gate |
| `hooks/use-active-tenant.ts` | Client hook: active tenant + isTenantAdmin |
| `hooks/use-session.ts` | Client hook: user session (ala supastarter `useSession`) |
