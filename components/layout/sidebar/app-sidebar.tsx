"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { ChevronsUpDown, Building2, Check, Plus, Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useIsTablet } from "@/hooks/use-mobile";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";
import { NavMain } from "@/components/layout/sidebar/nav-main";
import { NavUser } from "@/components/layout/sidebar/nav-user";
import { ScrollArea } from "@/components/ui/scroll-area";
import Logo from "@/components/layout/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

// Impor klien Supabase yang sudah dibuat sebelumnya
import { supabase } from "@/lib/supabase";

interface Organization {
  id: string;
  name: string;
  logo?: string | null;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const isTablet = useIsTablet();

  // State User Supabase
  const [user, setUser] = useState<any>(null);

  // State Organisasi
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);

  // State loading & modal
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");

  // Membaca user aktif & memuat daftar organisasi dari Supabase
  const loadUserAndOrganizations = async () => {
    setIsLoading(true);
    try {
      // 1. Dapatkan user yang sedang login
      const {
        data: { user: currentUser },
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        setIsLoading(false);
        return;
      }
      setUser(currentUser);

      // 2. Dapatkan relasi keanggotaan beserta detail organisasi (Kueri bersih tanpa komentar)
      const { data, error } = await supabase
        .from("memberships")
        .select(
          `
          tenant_id,
          tenants (
            id,
            name,
            logo
          )
        `
        )
        .eq("user_id", currentUser.id);

      if (error) throw error;

      // Transformasi data relasi gabungan ke struktur Array Organization
      const orgs: Organization[] = (data || [])
        .map((item: any) => item.tenants)
        .filter((tenant): tenant is Organization => tenant !== null)
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          logo: t.logo || null
        }));

      setOrganizations(orgs);

      // 3. Tentukan organisasi aktif (baca dari localStorage jika ada, atau default ke indeks pertama)
      if (orgs.length > 0) {
        const savedOrgId = localStorage.getItem("active_org_id");
        const matchedOrg = orgs.find((o) => o.id === savedOrgId);
        setActiveOrg(matchedOrg || orgs[0]);
      } else {
        setActiveOrg(null);
      }
    } catch (error: any) {
      console.error("Gagal memuat data organisasi:", error?.message || error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserAndOrganizations();
  }, []);

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname]);

  useEffect(() => {
    setOpen(!isTablet);
  }, [isTablet]);

  // Handler pergantian organisasi aktif (Ditambahkan reload halaman otomatis)
  const handleSelectOrg = (org: Organization) => {
    setActiveOrg(org);
    localStorage.setItem("active_org_id", org.id);

    // Memicu event storage untuk komponen lain yang mendengarkan
    window.dispatchEvent(new Event("storage"));

    // Melakukan reload halaman secara bersih agar semua komponen memuat ulang data organisasi baru
    window.location.reload();
  };

  // Handler menyimpan organisasi baru ke Supabase
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !user) return;

    setIsSubmitting(true);
    try {
      // 1. Insert organisasi baru ke tabel tenants
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .insert({ name: newOrgName.trim() })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // 2. Hubungkan user ini ke tenant baru di tabel memberships sebagai "Owner" (Kapital)
      const { error: membershipError } = await supabase.from("memberships").insert({
        user_id: user.id,
        tenant_id: tenantData.id,
        role: "Owner"
      });

      if (membershipError) throw membershipError;

      const newOrg: Organization = {
        id: tenantData.id,
        name: tenantData.name,
        logo: null
      };

      // 3. Update state lokal & jadikan sebagai organisasi aktif
      setOrganizations((prev) => [...prev, newOrg]);
      handleSelectOrg(newOrg);

      setNewOrgName("");
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Gagal membuat organisasi baru:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="hover:text-foreground h-10 group-data-[collapsible=icon]:px-0!">
                    {activeOrg?.logo ? (
                      <img
                        src={activeOrg.logo}
                        alt={activeOrg.name}
                        className="size-6 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <Logo />
                    )}
                    <span className="text-foreground truncate font-semibold">
                      {isLoading ? (
                        <span className="text-muted-foreground text-xs">Loading org...</span>
                      ) : activeOrg ? (
                        activeOrg.name
                      ) : (
                        "No organization"
                      )}
                    </span>
                    <ChevronsUpDown className="ml-auto group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="mt-4 w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align="end"
                  sideOffset={4}>
                  <DropdownMenuLabel>Organizations</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {isLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                    </div>
                  ) : organizations.length === 0 ? (
                    <div className="text-muted-foreground px-2 py-3 text-center text-xs">
                      No organizations found
                    </div>
                  ) : (
                    organizations.map((org) => (
                      <DropdownMenuItem
                        key={org.id}
                        className="flex cursor-pointer items-center gap-3"
                        onSelect={() => handleSelectOrg(org)}>
                        <div className="bg-background flex size-8 items-center justify-center overflow-hidden rounded-md border">
                          {org.logo ? (
                            <img src={org.logo} alt={org.name} className="size-full object-cover" />
                          ) : (
                            <Building2 className="text-muted-foreground size-4" />
                          )}
                        </div>
                        <div className="flex flex-1 flex-col">
                          <span className="text-sm font-medium">{org.name}</span>
                          <span
                            className={`text-xs ${
                              activeOrg?.id === org.id
                                ? "font-semibold text-green-700"
                                : "text-muted-foreground"
                            }`}>
                            {activeOrg?.id === org.id ? "Active" : "Inactive"}
                          </span>
                        </div>
                        {activeOrg?.id === org.id && (
                          <Check className="ml-auto size-4 text-green-700" />
                        )}
                      </DropdownMenuItem>
                    ))
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="focus:bg-accent flex cursor-pointer items-center gap-2"
                    disabled={isLoading}
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsDialogOpen(true);
                      setDropdownOpen(false);
                    }}>
                    <Plus className="size-4" />
                    <span>New Organization</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <ScrollArea className="h-full">
            <NavMain />
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </Sidebar>

      {/* Dialog Modal Tambah Organisasi */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Organization</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOrg} className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="org-name" className="text-sm leading-none font-medium">
                Organization Name
              </label>
              <input
                id="org-name"
                type="text"
                required
                disabled={isSubmitting}
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="e.g. My Awesome Corp"
                className="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
