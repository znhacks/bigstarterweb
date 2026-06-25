"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  User,
  MoreVertical,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Mail,
  Ban,
  ShieldAlert
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

import { supabase } from "@/lib/supabase";

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "Owner" | "Member" | "Admin";
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

interface AlertState {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

export default function OrganizationMembers() {
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("Our Organization");

  // State anggota aktif & pending
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  // State Batas Maksimal Pengguna berdasarkan Paket Berlangganan
  const [maxUsers, setMaxUsers] = useState<number>(2); // Default limit untuk Free Plan = 2

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");

  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<AlertState | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  useEffect(() => {
    const orgId = localStorage.getItem("active_org_id");
    if (orgId) {
      setActiveOrgId(orgId);
      fetchOrgDetails(orgId);
      loadAllData(orgId);
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  const fetchOrgDetails = async (orgId: string) => {
    const { data } = await supabase.from("tenants").select("name").eq("id", orgId).single();
    if (data) setOrgName(data.name);
  };

  // Muat data anggota aktif, pending, dan limit maksimal secara paralel
  const loadAllData = async (orgId: string) => {
    setIsLoading(true);
    await Promise.all([fetchMembers(orgId), fetchPendingInvites(orgId), fetchMaxUsersLimit(orgId)]);
    setIsLoading(false);
  };

  const fetchMembers = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("memberships")
        .select(
          `
          id,
          role,
          user_id,
          profiles (
            id,
            full_name
          )
        `
        )
        .eq("tenant_id", orgId);

      if (error) throw error;

      const formattedMembers: Member[] = (data || []).map((item: any) => {
        const fullName = item.profiles?.full_name || "Unknown User";
        return {
          id: item.id,
          userId: item.user_id,
          name: fullName,
          email: `${fullName.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
          role: item.role as "Owner" | "Member" | "Admin"
        };
      });

      setMembers(formattedMembers);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPendingInvites = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("invitations")
        .select("id, email, role, created_at")
        .eq("tenant_id", orgId);

      if (error) throw error;
      setPendingInvites(data || []);
    } catch (error) {
      console.error("Gagal memuat daftar pending:", error);
    }
  };

  // Ambil batasan maksimal anggota dari paket langganan aktif di Supabase
  const fetchMaxUsersLimit = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(
          `
          status,
          plans (
            max_users
          )
        `
        )
        .eq("tenant_id", orgId)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;

      if (data && data.plans) {
        const planInfo = data.plans as any;
        setMaxUsers(planInfo.max_users || 9999);
      } else {
        // Fallback default limit: Free Plan = 2 anggota
        setMaxUsers(2);
      }
    } catch (error) {
      console.error("Gagal memuat limit maksimal paket:", error);
      setMaxUsers(2); // Fallback aman
    }
  };

  const handleRoleChange = async (membershipId: string, newRole: "Owner" | "Member" | "Admin") => {
    try {
      const { error } = await supabase
        .from("memberships")
        .update({ role: newRole })
        .eq("id", membershipId);

      if (error) throw error;

      setMembers((prev) => prev.map((m) => (m.id === membershipId ? { ...m, role: newRole } : m)));

      const updatedMember = members.find((m) => m.id === membershipId);
      setAlertMessage({
        title: "Role Updated",
        description: `Role ${updatedMember?.name} berhasil diubah menjadi ${newRole}.`,
        variant: "default"
      });
    } catch (error: any) {
      setAlertMessage({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToDelete) return;

    try {
      const { error } = await supabase.from("memberships").delete().eq("id", memberToDelete.id);

      if (error) throw error;

      setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));

      setAlertMessage({
        title: "Member Removed",
        description: `${memberToDelete.name} telah dihapus dari organisasi.`,
        variant: "destructive"
      });
    } catch (error: any) {
      setAlertMessage({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setMemberToDelete(null);
    }
  };

  const handleCancelInvitation = async (inviteId: string, email: string) => {
    try {
      const { error } = await supabase.from("invitations").delete().eq("id", inviteId);
      if (error) throw error;

      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
      setAlertMessage({
        title: "Invitation Cancelled",
        description: `Undangan untuk ${email} berhasil ditarik kembali.`,
        variant: "default"
      });
    } catch (error: any) {
      setAlertMessage({
        title: "Error",
        description: error.message || "Gagal membatalkan undangan.",
        variant: "destructive"
      });
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeOrgId) return;

    // VALIDASI LIMIT: Cegah submit jika jumlah anggota aktif melebihi batas maksimal paket
    if (members.length >= maxUsers) {
      setAlertMessage({
        title: "Limit Reached",
        description: `Batas maksimal anggota untuk paket ini (${maxUsers} anggota) telah tercapai. Silakan lakukan upgrade di menu Billing.`,
        variant: "destructive"
      });
      return;
    }

    setIsInviting(true);
    setAlertMessage(null);
    try {
      const response = await fetch("/api/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          orgName: orgName
        })
      });

      if (!response.ok) throw new Error("Failed to send invitation");

      setAlertMessage({
        title: "Invitation Sent",
        description: `Undangan telah sukses dikirim ke ${inviteEmail}.`,
        variant: "default"
      });

      setInviteEmail("");
      await fetchPendingInvites(activeOrgId);
    } catch (error: any) {
      setAlertMessage({
        title: "Error Sending Email",
        description: "Gagal mengirim email undangan. Silakan periksa kredensial MailerSend Anda.",
        variant: "destructive"
      });
    } finally {
      setIsInviting(false);
    }
  };

  // Cek apakah kuota anggota aktif sudah penuh
  const isLimitReached = members.length >= maxUsers;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!activeOrgId) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Active Organization</AlertTitle>
          <AlertDescription>
            Silakan pilih organisasi terlebih dahulu di sidebar kiri Anda sebelum mengelola anggota.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10">
      {/* SHADCN ALERT NOTIFICATION */}
      {alertMessage && (
        <Alert
          variant={alertMessage.variant === "destructive" ? "destructive" : "default"}
          className="border-border/80 relative flex items-start gap-3 rounded-xl border pr-10">
          {alertMessage.variant === "destructive" ? (
            <AlertCircle className="text-destructive mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          )}
          <div className="space-y-1">
            <AlertTitle className="font-semibold">{alertMessage.title}</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              {alertMessage.description}
            </AlertDescription>
          </div>
          <button
            onClick={() => setAlertMessage(null)}
            className="text-muted-foreground hover:text-foreground absolute top-4 right-4 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}

      {/* CARD 1: MANAGE MEMBERS */}
      <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
        <CardContent className="space-y-6 p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="space-y-1">
              <h2 className="text-foreground text-xl font-semibold tracking-tight">
                Manage members ({orgName})
              </h2>
              <p className="text-muted-foreground text-sm">
                View and manage members, roles, and pending invitations.
              </p>
            </div>
            {/* Indikator Quota Anggota Aktif */}
            <div className="bg-muted text-foreground/80 h-fit shrink-0 rounded-xl border px-4 py-2 text-xs font-medium">
              Limit: <span className="text-foreground font-bold">{members.length}</span> /{" "}
              {maxUsers} Anggota
            </div>
          </div>

          <Tabs defaultValue="active" className="w-full space-y-6">
            <TabsList className="border-border/60 h-auto w-full justify-start space-x-6 rounded-none border-b bg-transparent p-0">
              <TabsTrigger
                value="active"
                className="data-[state=active]:border-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 text-sm font-medium shadow-none transition-all data-[state=active]:bg-transparent">
                Active members
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="data-[state=active]:border-foreground text-muted-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 text-sm font-medium shadow-none transition-all data-[state=active]:bg-transparent">
                Pending invitations ({pendingInvites.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-0 space-y-3 focus-visible:outline-none">
              {members.length === 0 ? (
                <div className="text-muted-foreground py-6 text-center text-sm">
                  No active members found.
                </div>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="border-border/60 bg-card hover:bg-accent/5 flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-muted border-border/60 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                        <User className="text-muted-foreground h-5 w-5" />
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="text-foreground truncate text-sm font-semibold">
                          {member.name}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          {member.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {member.role === "Owner" ? (
                        <div className="border-border/40 bg-muted/30 text-muted-foreground flex h-9 w-[110px] items-center justify-between rounded-lg border px-3 py-1 text-sm select-none">
                          <span>Owner</span>
                        </div>
                      ) : (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(val: "Owner" | "Member" | "Admin") =>
                              handleRoleChange(member.id, val)
                            }>
                            <SelectTrigger className="border-border/80 h-9 w-[110px] text-sm focus:ring-1">
                              <SelectValue placeholder="Select Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Member">Member</SelectItem>
                              <SelectItem value="Admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground h-9 w-9">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() => setMemberToDelete(member)}
                                className="text-destructive focus:text-destructive flex cursor-pointer items-center gap-2">
                                <Trash2 className="h-4 w-4" />
                                Remove member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="pending" className="mt-0 space-y-3 focus-visible:outline-none">
              {pendingInvites.length === 0 ? (
                <div className="text-muted-foreground py-10 text-center text-sm">
                  No pending invitations found.
                </div>
              ) : (
                pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="border-border/60 bg-card flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-muted border-border/60 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                        <Mail className="text-muted-foreground h-5 w-5" />
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="text-foreground truncate text-sm font-semibold">
                          {invite.email}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          Invited to be {invite.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="border-border/40 bg-muted/20 text-muted-foreground flex h-9 items-center justify-between rounded-lg border px-3 py-1 text-xs select-none">
                        Pending
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCancelInvitation(invite.id, invite.email)}
                        className="text-muted-foreground hover:text-destructive h-9 w-9"
                        title="Cancel Invitation">
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* CARD 2: INVITE A MEMBER (TERKUNCI / TERFILTER JIKA SUDAH MELEBIHI LIMIT) */}
      <Card className="border-border/80 overflow-hidden rounded-2xl border shadow-sm">
        <CardContent className="space-y-6 p-8">
          <div className="space-y-1">
            <h2 className="text-foreground text-xl font-semibold tracking-tight">
              Invite a member
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Add someone to your organization by sending them an email invite and assigning their
              role.
            </p>
          </div>

          {/* Banner Peringatan Jika Kuota Maksimal Telah Tercapai */}
          {isLimitReached && (
            <Alert className="rounded-2xl border-amber-500/20 bg-amber-500/10 text-amber-600">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <AlertTitle>Batas Kuota Anggota Tercapai</AlertTitle>
              <AlertDescription>
                Organisasi Anda telah mencapai batas kuota maksimal untuk paket saat ini yaitu **
                {maxUsers} anggota**. Silakan lakukan upgrade paket Anda di menu **Billing** untuk
                menambah lebih banyak anggota.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="flex w-full flex-col items-start gap-4 md:flex-row md:items-end">
              <div className="w-full space-y-2 md:flex-1">
                <label htmlFor="email" className="text-foreground text-sm font-semibold">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={isInviting || isLimitReached} // Lock input jika limit tercapai
                  className="border-border/80 h-10 focus-visible:ring-1"
                />
              </div>

              <div className="w-full space-y-2 md:w-[160px]">
                <label htmlFor="role" className="text-foreground text-sm font-semibold">
                  Role
                </label>
                <Select
                  value={inviteRole}
                  onValueChange={setInviteRole}
                  disabled={isInviting || isLimitReached}>
                  <SelectTrigger id="role" className="border-border/80 h-10 focus:ring-1">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Member">Member</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isInviting || isLimitReached || !inviteEmail.trim()} // Lock tombol kirim jika limit tercapai
                className="bg-foreground text-background hover:bg-foreground/90 inline-flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium">
                {isInviting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isInviting ? "Sending..." : "Invite"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* SHADCN DIALOG KONFIRMASI HAPUS ANGGOTA */}
      <AlertDialog
        open={!!memberToDelete}
        onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus <strong>{memberToDelete?.name}</strong> (
              {memberToDelete?.email}) dari organisasi. Mereka tidak akan memiliki akses lagi ke
              workspace ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemoveMember}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
