"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/api/supabase-server";
import { tenantRepository } from "@/supabase/repositories/tenants";
import { jurnalMengajarSupabase } from "@/lib/jurnalmengajar-supabase";
import { resolveTenantAuthorityFull } from "@/lib/billing/tenant-auth";
import { PERMISSIONS, hasPermission } from "@/modules/rbac/shared";

export interface ManageUserItem {
  id: string;
  school_id: string;
  school_name: string;
  school_code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  position: string | null;
  created_at: string;
}

export interface ConnectedSchoolOption {
  id: string;
  name: string;
  code: string;
}

export async function getManageUsersData(tenantSlug: string): Promise<{
  schoolCode: string | null;
  tenantName: string | null;
  connectedSchools: ConnectedSchoolOption[];
  users: ManageUserItem[];
  stats: {
    totalUsers: number;
    totalTeachers: number;
    totalAdmins: number;
  };
}> {
  try {
    const supabase = await createClient();
    const dbClient = supabaseAdmin || supabase;

    const { data: tenant } = await (await tenantRepository(dbClient))
      .query()
      .select("id, name, school_code")
      .eq("slug", tenantSlug)
      .maybeSingle();

    if (!tenant) {
      return {
        schoolCode: null,
        tenantName: null,
        connectedSchools: [],
        users: [],
        stats: { totalUsers: 0, totalTeachers: 0, totalAdmins: 0 }
      };
    }

    const [ { data: tSchools }, { data: { user } } ] = await Promise.all([
      dbClient.from("tenant_schools").select("school_id, school_code").eq("tenant_id", tenant.id),
      supabase.auth.getUser()
    ]);

    const schoolCodeSet = new Set<string>();
    if (tenant.school_code) {
      tenant.school_code.split(",").forEach((c: string) => {
        if (c.trim()) schoolCodeSet.add(c.trim());
      });
    }

    (tSchools || []).forEach((ts: any) => {
      if (ts.school_id) schoolCodeSet.add(ts.school_id.toString());
      if (ts.school_code) schoolCodeSet.add(ts.school_code.toString());
    });

    if (user) {
      const { data: uSchools } = await dbClient
        .from("user_schools")
        .select("school_id, school_code")
        .eq("user_id", user.id);

      (uSchools || []).forEach((us: any) => {
        if (us.school_id) schoolCodeSet.add(us.school_id.toString());
        if (us.school_code) schoolCodeSet.add(us.school_code.toString());
      });
    }

    const schoolCodes = Array.from(schoolCodeSet);

    const { data: schools } = await jurnalMengajarSupabase
      .from("schools")
      .select("id, name, code");

    let matchedSchools = (schools || []).filter((s: any) =>
      schoolCodes.some((code: string) => {
        const cLower = code.toLowerCase();
        return (
          (s.code && s.code.toLowerCase() === cLower) ||
          (s.id && s.id.toString().toLowerCase() === cLower) ||
          (s.npsn && s.npsn.toString().toLowerCase() === cLower) ||
          (s.name && s.name.toLowerCase().includes(cLower)) ||
          cLower.includes((s.name || "").toLowerCase())
        );
      })
    );

    if (matchedSchools.length === 0 && (schools || []).length > 0) {
      matchedSchools = schools || [];
    }

    const schoolIds = matchedSchools.map((s: any) => s.id);
    const tenantNameDisplay = matchedSchools.map((s: any) => s.name).join(", ") || tenant.name;
    const connectedSchools: ConnectedSchoolOption[] = matchedSchools.map((s: any) => ({
      id: s.id,
      name: s.name || s.code,
      code: s.code
    }));

    const schoolMap = new Map<string, { name: string; code: string }>();
    matchedSchools.forEach((s) => schoolMap.set(s.id, { name: s.name, code: s.code }));

    const users: ManageUserItem[] = [];

    if (schoolIds.length > 0) {
      const { data: jUsers } = await jurnalMengajarSupabase
        .from("users")
        .select("id, full_name, email, phone, role, position, created_at, school_id")
        .in("school_id", schoolIds)
        .order("created_at", { ascending: false });

      (jUsers || []).forEach((u: any) => {
        const sInfo = schoolMap.get(u.school_id) || { name: tenantNameDisplay, code: schoolCodes[0] };
        users.push({
          id: u.id,
          school_id: u.school_id,
          school_name: sInfo.name,
          school_code: sInfo.code,
          full_name: u.full_name || "Pengguna Jurnal",
          email: u.email || null,
          phone: u.phone || null,
          role: u.role || "guru",
          position: u.position || null,
          created_at: u.created_at || new Date().toISOString()
        });
      });
    }

    const totalUsers = users.length;
    const totalTeachers = users.filter((u) => u.role === "guru" || u.role === "pending_guru").length;
    const totalAdmins = users.filter((u) => u.role === "admin").length;

    return {
      schoolCode: schoolCodes.join(", "),
      tenantName: tenantNameDisplay,
      connectedSchools,
      users,
      stats: { totalUsers, totalTeachers, totalAdmins }
    };
  } catch (error) {
    console.error("Failed to fetch manage users data:", error);
    return {
      schoolCode: null,
      tenantName: null,
      connectedSchools: [],
      users: [],
      stats: { totalUsers: 0, totalTeachers: 0, totalAdmins: 0 }
    };
  }
}

export async function createJurnalUserAction(
  tenantSlug: string,
  data: {
    fullName: string;
    email?: string;
    phone?: string;
    role: string;
    position?: string;
    schoolId: string;
  }
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return { error: "Tidak terautentikasi." };

    const { data: tenant } = await (await tenantRepository(supabase))
      .query()
      .select("id")
      .eq("slug", tenantSlug)
      .maybeSingle();

    if (!tenant) return { error: "Organisasi tidak ditemukan." };

    const authority = await resolveTenantAuthorityFull(supabase, user.id, tenant.id);
    if (!hasPermission(authority.permissions, PERMISSIONS.organizationUpdate)) {
      return { error: "Akses ditolak: Anda tidak memiliki izin untuk mengelola pengguna." };
    }

    const { error: dbErr } = await jurnalMengajarSupabase.from("users").insert({
      full_name: data.fullName.trim(),
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      role: data.role.trim(),
      position: data.position?.trim() || null,
      school_id: data.schoolId
    });

    if (dbErr) return { error: dbErr.message };
    return { success: true };
  } catch (e: any) {
    return { error: e?.message || "Gagal menambahkan pengguna baru." };
  }
}

export async function updateJurnalUserAction(
  tenantSlug: string,
  userId: string,
  data: {
    fullName: string;
    email?: string;
    phone?: string;
    role: string;
    position?: string;
    schoolId?: string;
  }
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return { error: "Tidak terautentikasi." };

    const { data: tenant } = await (await tenantRepository(supabase))
      .query()
      .select("id")
      .eq("slug", tenantSlug)
      .maybeSingle();

    if (!tenant) return { error: "Organisasi tidak ditemukan." };

    const authority = await resolveTenantAuthorityFull(supabase, user.id, tenant.id);
    if (!hasPermission(authority.permissions, PERMISSIONS.organizationUpdate)) {
      return { error: "Akses ditolak: Anda tidak memiliki izin untuk memperbarui pengguna." };
    }

    const updatePayload: any = {
      full_name: data.fullName.trim(),
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      role: data.role.trim(),
      position: data.position?.trim() || null
    };

    if (data.schoolId) {
      updatePayload.school_id = data.schoolId;
    }

    const { error: dbErr } = await jurnalMengajarSupabase
      .from("users")
      .update(updatePayload)
      .eq("id", userId);

    if (dbErr) return { error: dbErr.message };
    return { success: true };
  } catch (e: any) {
    return { error: e?.message || "Gagal memperbarui data pengguna." };
  }
}

export async function deleteJurnalUserAction(
  tenantSlug: string,
  userId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return { error: "Tidak terautentikasi." };

    const { data: tenant } = await (await tenantRepository(supabase))
      .query()
      .select("id")
      .eq("slug", tenantSlug)
      .maybeSingle();

    if (!tenant) return { error: "Organisasi tidak ditemukan." };

    const authority = await resolveTenantAuthorityFull(supabase, user.id, tenant.id);
    if (!hasPermission(authority.permissions, PERMISSIONS.organizationUpdate)) {
      return { error: "Akses ditolak: Anda tidak memiliki izin untuk menghapus pengguna." };
    }

    const { error: dbErr } = await jurnalMengajarSupabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (dbErr) return { error: dbErr.message };
    return { success: true };
  } catch (e: any) {
    return { error: e?.message || "Gagal menghapus pengguna." };
  }
}
