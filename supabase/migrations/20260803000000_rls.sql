-- Migration file: Enable Row-Level Security and Create Policies

-- =========================================================================
-- PUBLIC SCHEMA: ENABLE RLS & CREATE POLICIES
-- =========================================================================

-- -------------------------------------------------------------------------
-- Table: public.announcement_targets
-- -------------------------------------------------------------------------
ALTER TABLE public.announcement_targets ENABLE ROW LEVEL SECURITY;
-- (No policies defined on announcement_targets based on original schema)


-- -------------------------------------------------------------------------
-- Table: public.announcements
-- -------------------------------------------------------------------------
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_read_authenticated" 
ON public.announcements 
FOR SELECT 
TO authenticated 
USING (true);


-- -------------------------------------------------------------------------
-- Table: public.cities
-- -------------------------------------------------------------------------
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cities_select" 
ON public.cities 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "public read cities" 
ON public.cities 
FOR SELECT 
TO authenticated, anon 
USING (true);


-- -------------------------------------------------------------------------
-- Table: public.countries
-- -------------------------------------------------------------------------
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "countries_select" 
ON public.countries 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "countries_superadmin" 
ON public.countries 
FOR ALL 
TO authenticated 
USING (is_superadmin()) 
WITH CHECK (is_superadmin());

CREATE POLICY "countries_update" 
ON public.countries 
FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.is_superadmin = true
    )
) 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.is_superadmin = true
    )
);

CREATE POLICY "public read countries" 
ON public.countries 
FOR SELECT 
TO authenticated, anon 
USING (true);


-- -------------------------------------------------------------------------
-- Table: public.coupon_redemptions
-- -------------------------------------------------------------------------
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupon_redemptions_tenant_read" 
ON public.coupon_redemptions 
FOR SELECT 
TO authenticated 
USING (is_superadmin() OR is_tenant_member(tenant_id));


-- -------------------------------------------------------------------------
-- Table: public.coupons
-- -------------------------------------------------------------------------
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons_superadmin_all" 
ON public.coupons 
FOR ALL 
TO authenticated 
USING (is_superadmin()) 
WITH CHECK (is_superadmin());


-- -------------------------------------------------------------------------
-- Table: public.desa
-- -------------------------------------------------------------------------
ALTER TABLE public.desa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "desa_select" 
ON public.desa 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "public read desa" 
ON public.desa 
FOR SELECT 
TO authenticated, anon 
USING (true);


-- -------------------------------------------------------------------------
-- Table: public.enterprise_inquiries
-- -------------------------------------------------------------------------
ALTER TABLE public.enterprise_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enterprise_inquiries_tenant_read" 
ON public.enterprise_inquiries 
FOR SELECT 
TO authenticated 
USING (is_superadmin() OR is_tenant_member(tenant_id) OR user_id = auth.uid());


-- -------------------------------------------------------------------------
-- Table: public.invitations
-- -------------------------------------------------------------------------
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin dan penerima undangan dapat melihat undangan" 
ON public.invitations 
FOR SELECT 
TO authenticated 
USING (is_tenant_member(tenant_id) OR (email)::text = (auth.jwt() ->> 'email'::text));

CREATE POLICY "Admin dapat membuat undangan" 
ON public.invitations 
FOR INSERT 
TO authenticated 
WITH CHECK (is_tenant_admin(tenant_id) AND invited_by = auth.uid());

CREATE POLICY "Admin dapat menghapus atau mengubah undangan" 
ON public.invitations 
FOR ALL 
TO authenticated 
USING (is_tenant_admin(tenant_id));

CREATE POLICY "invitations_select_tenant_member" 
ON public.invitations 
FOR SELECT 
TO authenticated 
USING (is_tenant_member(tenant_id));

CREATE POLICY "invitations_write_admin" 
ON public.invitations 
FOR ALL 
TO authenticated 
USING (is_tenant_admin(tenant_id)) 
WITH CHECK (is_tenant_admin(tenant_id));


-- -------------------------------------------------------------------------
-- Table: public.kecamatan
-- -------------------------------------------------------------------------
ALTER TABLE public.kecamatan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kecamatan_select" 
ON public.kecamatan 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "public read kecamatan" 
ON public.kecamatan 
FOR SELECT 
TO authenticated, anon 
USING (true);


-- -------------------------------------------------------------------------
-- Table: public.memberships
-- -------------------------------------------------------------------------
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin dapat menambah anggota baru" 
ON public.memberships 
FOR INSERT 
TO authenticated 
WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Admin dapat menghapus anggota atau user keluar mandiri" 
ON public.memberships 
FOR DELETE 
TO authenticated 
USING (is_tenant_admin(tenant_id) OR user_id = auth.uid());

CREATE POLICY "Admin dapat mengubah peran anggota" 
ON public.memberships 
FOR UPDATE 
TO authenticated 
USING (is_tenant_admin(tenant_id));

CREATE POLICY "Anggota dapat melihat daftar anggota tenant" 
ON public.memberships 
FOR SELECT 
TO authenticated 
USING (is_tenant_member(tenant_id));

CREATE POLICY "Melihat daftar keanggotaan" 
ON public.memberships 
FOR SELECT 
TO authenticated 
USING (is_superadmin() OR is_tenant_member(tenant_id));

CREATE POLICY "Mengelola keanggotaan" 
ON public.memberships 
FOR ALL 
TO authenticated 
USING (is_superadmin() OR is_tenant_admin(tenant_id)) 
WITH CHECK (is_superadmin() OR is_tenant_admin(tenant_id));

CREATE POLICY "Update anggota berdasarkan hierarki" 
ON public.memberships 
FOR UPDATE 
TO authenticated 
USING (
    is_superadmin() OR (
        has_permission(tenant_id, 'members:manage'::text) AND 
        has_higher_hierarchy(tenant_id, user_id)
    )
) 
WITH CHECK (
    is_superadmin() OR (
        has_permission(tenant_id, 'members:manage'::text) AND 
        has_higher_hierarchy(tenant_id, user_id)
    )
);

CREATE POLICY "memberships_delete_admin" 
ON public.memberships 
FOR DELETE 
TO authenticated 
USING (is_tenant_admin(tenant_id));

CREATE POLICY "memberships_insert_admin" 
ON public.memberships 
FOR INSERT 
TO authenticated 
WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "memberships_select_tenant_member" 
ON public.memberships 
FOR SELECT 
TO authenticated 
USING (is_tenant_member(tenant_id));

CREATE POLICY "memberships_update_admin" 
ON public.memberships 
FOR UPDATE 
TO authenticated 
USING (is_tenant_admin(tenant_id)) 
WITH CHECK (is_tenant_admin(tenant_id));


-- -------------------------------------------------------------------------
-- Table: public.notification_categories
-- -------------------------------------------------------------------------
ALTER TABLE public.notification_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_categories_read_authenticated" 
ON public.notification_categories 
FOR SELECT 
TO authenticated 
USING (true);


-- -------------------------------------------------------------------------
-- Table: public.notification_delivery_logs
-- -------------------------------------------------------------------------
ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_logs_select_own" 
ON public.notification_delivery_logs 
FOR SELECT 
TO public 
USING (user_id = auth.uid());


-- -------------------------------------------------------------------------
-- Table: public.notification_preferences
-- -------------------------------------------------------------------------
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_delete_own" 
ON public.notification_preferences 
FOR DELETE 
TO public 
USING (user_id = auth.uid());

CREATE POLICY "notification_preferences_insert_own" 
ON public.notification_preferences 
FOR INSERT 
TO public 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_preferences_select_own" 
ON public.notification_preferences 
FOR SELECT 
TO public 
USING (user_id = auth.uid());

CREATE POLICY "notification_preferences_update_own" 
ON public.notification_preferences 
FOR UPDATE 
TO public 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());


-- -------------------------------------------------------------------------
-- Table: public.notification_templates
-- -------------------------------------------------------------------------
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_templates_read_authenticated" 
ON public.notification_templates 
FOR SELECT 
TO authenticated 
USING (true);


-- -------------------------------------------------------------------------
-- Table: public.notifications
-- -------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_delete_own" 
ON public.notifications 
FOR DELETE 
TO public 
USING (user_id = auth.uid());

CREATE POLICY "notifications_select_own" 
ON public.notifications 
FOR SELECT 
TO public 
USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" 
ON public.notifications 
FOR UPDATE 
TO public 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());


-- -------------------------------------------------------------------------
-- Table: public.otp_codes
-- -------------------------------------------------------------------------
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
-- (No policies defined on otp_codes based on original schema)


-- -------------------------------------------------------------------------
-- Table: public.payment_orders
-- -------------------------------------------------------------------------
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_orders_tenant_read" 
ON public.payment_orders 
FOR SELECT 
TO authenticated 
USING (is_superadmin() OR is_tenant_member(tenant_id) OR user_id = auth.uid());


-- -------------------------------------------------------------------------
-- Table: public.permissions
-- -------------------------------------------------------------------------
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated dapat membaca permissions" 
ON public.permissions 
FOR SELECT 
TO authenticated 
USING (true);


-- -------------------------------------------------------------------------
-- Table: public.plan_prices
-- -------------------------------------------------------------------------
ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Siapa saja dapat melihat harga paket" 
ON public.plan_prices 
FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Superadmin dapat mengelola semua harga paket" 
ON public.plan_prices 
FOR ALL 
TO authenticated 
USING (is_superadmin());

CREATE POLICY "plan_prices_read_public" 
ON public.plan_prices 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "plan_prices_write_superadmin" 
ON public.plan_prices 
FOR ALL 
TO authenticated 
USING (is_superadmin()) 
WITH CHECK (is_superadmin());


-- -------------------------------------------------------------------------
-- Table: public.plans
-- -------------------------------------------------------------------------
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Siapa saja dapat melihat paket aktif" 
ON public.plans 
FOR SELECT 
TO public 
USING (is_active = true);

CREATE POLICY "Superadmin dapat mengelola semua paket" 
ON public.plans 
FOR ALL 
TO authenticated 
USING (is_superadmin());

CREATE POLICY "plans_read_public" 
ON public.plans 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "plans_write_superadmin" 
ON public.plans 
FOR ALL 
TO authenticated 
USING (is_superadmin()) 
WITH CHECK (is_superadmin());


-- -------------------------------------------------------------------------
-- Table: public.profiles
-- -------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin dapat melihat seluruh profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (is_superadmin());

CREATE POLICY "User dapat melihat profil sendiri dan rekan tim" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (
    id = auth.uid() OR (
        deleted_at IS NULL AND EXISTS (
            SELECT 1 FROM public.memberships m1
            JOIN public.memberships m2 ON m1.tenant_id = m2.tenant_id
            WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id
        )
    )
);

CREATE POLICY "User dapat membuat profil saat registrasi" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (id = auth.uid());

CREATE POLICY "User hanya dapat mengubah profil sendiri" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (id = auth.uid()) 
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_self_or_superadmin" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (id = auth.uid() OR is_superadmin()) 
WITH CHECK (id = auth.uid() OR is_superadmin());


-- -------------------------------------------------------------------------
-- Table: public.push_subscriptions
-- -------------------------------------------------------------------------
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_delete_own" 
ON public.push_subscriptions 
FOR DELETE 
TO public 
USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_insert_own" 
ON public.push_subscriptions 
FOR INSERT 
TO public 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions_select_own" 
ON public.push_subscriptions 
FOR SELECT 
TO public 
USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_update_own" 
ON public.push_subscriptions 
FOR UPDATE 
TO public 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());


-- -------------------------------------------------------------------------
-- Table: public.role_permissions
-- -------------------------------------------------------------------------
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated dapat membaca role_permissions" 
ON public.role_permissions 
FOR SELECT 
TO authenticated 
USING (true);


-- -------------------------------------------------------------------------
-- Table: public.roles
-- -------------------------------------------------------------------------
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated dapat membaca roles" 
ON public.roles 
FOR SELECT 
TO authenticated 
USING (true);


-- -------------------------------------------------------------------------
-- Table: public.states
-- -------------------------------------------------------------------------
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read states" 
ON public.states 
FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "states_select" 
ON public.states 
FOR SELECT 
TO authenticated 
USING (true);


-- -------------------------------------------------------------------------
-- Table: public.subscriptions
-- -------------------------------------------------------------------------
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anggota dapat melihat status langganan" 
ON public.subscriptions 
FOR SELECT 
TO authenticated 
USING (is_tenant_member(tenant_id));

CREATE POLICY "Melihat langganan untuk Superadmin atau Anggota Tenant" 
ON public.subscriptions 
FOR SELECT 
TO authenticated 
USING (is_superadmin() OR is_tenant_member(tenant_id));

CREATE POLICY "subscriptions_select_tenant_member" 
ON public.subscriptions 
FOR SELECT 
TO authenticated 
USING (is_tenant_member(tenant_id));

CREATE POLICY "subscriptions_update_admin" 
ON public.subscriptions 
FOR UPDATE 
TO authenticated 
USING (is_tenant_admin(tenant_id) OR is_superadmin()) 
WITH CHECK (is_tenant_admin(tenant_id) OR is_superadmin());

CREATE POLICY "subscriptions_write_admin" 
ON public.subscriptions 
FOR INSERT 
TO authenticated 
WITH CHECK (is_tenant_admin(tenant_id) OR is_superadmin());


-- -------------------------------------------------------------------------
-- Table: public.tenants
-- -------------------------------------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin dapat mengubah detail tenant" 
ON public.tenants 
FOR UPDATE 
TO authenticated 
USING (is_tenant_admin(id)) 
WITH CHECK (is_tenant_admin(id));

CREATE POLICY "Anggota dapat melihat detail tenant" 
ON public.tenants 
FOR SELECT 
TO authenticated 
USING (deleted_at IS NULL AND is_tenant_member(id));

CREATE POLICY "Hanya superadmin yang dapat mengelola tenant" 
ON public.tenants 
FOR ALL 
TO authenticated 
USING (is_superadmin()) 
WITH CHECK (is_superadmin());

CREATE POLICY "Superadmin atau anggota tenant dapat melihat" 
ON public.tenants 
FOR SELECT 
TO authenticated 
USING (deleted_at IS NULL AND (is_superadmin() OR is_tenant_member(id)));

CREATE POLICY "User terautentikasi dapat membuat tenant baru" 
ON public.tenants 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "tenants_delete_owner_or_superadmin" 
ON public.tenants 
FOR DELETE 
TO authenticated 
USING (is_superadmin() OR is_tenant_owner(id));

CREATE POLICY "tenants_update_admin_or_owner" 
ON public.tenants 
FOR UPDATE 
TO authenticated 
USING (is_tenant_admin(id) OR is_superadmin()) 
WITH CHECK (is_tenant_admin(id) OR is_superadmin());


-- -------------------------------------------------------------------------
-- Table: public.transactions
-- -------------------------------------------------------------------------
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anggota dapat melihat riwayat transaksi" 
ON public.transactions 
FOR SELECT 
TO authenticated 
USING (is_tenant_member(tenant_id));

CREATE POLICY "Melihat transaksi untuk Superadmin atau Anggota Tenant" 
ON public.transactions 
FOR SELECT 
TO authenticated 
USING (is_superadmin() OR is_tenant_member(tenant_id));

CREATE POLICY "transactions_select_tenant_member" 
ON public.transactions 
FOR SELECT 
TO authenticated 
USING (is_tenant_member(tenant_id));


-- =========================================================================
-- TENANT_SHARED SCHEMA: ENABLE RLS & CREATE POLICIES
-- =========================================================================

-- -------------------------------------------------------------------------
-- Table: tenant_shared.api_keys
-- -------------------------------------------------------------------------
ALTER TABLE tenant_shared.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hanya admin yang dapat mengelola API keys" 
ON tenant_shared.api_keys 
FOR ALL 
TO authenticated 
USING (is_tenant_admin(tenant_id)) 
WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "api_keys_select_tenant_member" 
ON tenant_shared.api_keys 
FOR SELECT 
TO authenticated 
USING (is_tenant_member(tenant_id));

CREATE POLICY "api_keys_write_admin" 
ON tenant_shared.api_keys 
FOR ALL 
TO authenticated 
USING (is_tenant_admin(tenant_id) OR is_superadmin()) 
WITH CHECK (is_tenant_admin(tenant_id) OR is_superadmin());


-- -------------------------------------------------------------------------
-- Table: tenant_shared.tasks
-- -------------------------------------------------------------------------
ALTER TABLE tenant_shared.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akses penuh untuk anggota tenant pada tasks" 
ON tenant_shared.tasks 
FOR ALL 
TO authenticated 
USING (is_tenant_member(tenant_id)) 
WITH CHECK (is_tenant_member(tenant_id));

CREATE POLICY "Akses tasks untuk Superadmin atau Anggota Tenant" 
ON tenant_shared.tasks 
FOR ALL 
TO authenticated 
USING (is_superadmin() OR is_tenant_member(tenant_id)) 
WITH CHECK (is_superadmin() OR is_tenant_member(tenant_id));

CREATE POLICY "Membaca task berdasarkan izin" 
ON tenant_shared.tasks 
FOR SELECT 
TO authenticated 
USING (is_superadmin() OR has_permission(tenant_id, 'tasks:read'::text));

CREATE POLICY "Membuat task berdasarkan izin" 
ON tenant_shared.tasks 
FOR INSERT 
TO authenticated 
WITH CHECK (is_superadmin() OR has_permission(tenant_id, 'tasks:create'::text));

CREATE POLICY "tasks_delete_admin" 
ON tenant_shared.tasks 
FOR DELETE 
TO authenticated 
USING (is_tenant_admin(tenant_id));

CREATE POLICY "tasks_insert_tenant_member" 
ON tenant_shared.tasks 
FOR INSERT 
TO authenticated 
WITH CHECK (is_tenant_member(tenant_id));

CREATE POLICY "tasks_select_tenant_member" 
ON tenant_shared.tasks 
FOR SELECT 
TO authenticated 
USING (is_tenant_member(tenant_id));

CREATE POLICY "tasks_update_admin_or_owner" 
ON tenant_shared.tasks 
FOR UPDATE 
TO authenticated 
USING (is_tenant_admin(tenant_id) OR assignee_id = auth.uid() OR created_by = auth.uid()) 
WITH CHECK (is_tenant_member(tenant_id));