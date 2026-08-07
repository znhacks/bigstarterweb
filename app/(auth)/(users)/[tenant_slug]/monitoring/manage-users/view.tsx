"use client";

import * as React from "react";
import Link from "next/link";
import { UserPlus, Users, ShieldCheck, GraduationCap, AlertCircle, Link as LinkIcon, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { DataGrid, DataGridTable } from "@/components/data-table";
import { type ManageUserItem, type ConnectedSchoolOption } from "./actions";
import { useManageUsersLogic } from "./logic";

import { SchoolMultiFilter, type SchoolFilterOption } from "@/components/monitoring/school-multi-filter";

interface ViewProps {
  tenantSlug: string;
  schoolCode: string | null;
  tenantName: string | null;
  connectedSchools: ConnectedSchoolOption[];
  users: ManageUserItem[];
  stats: {
    totalUsers: number;
    totalTeachers: number;
    totalAdmins: number;
  };
}

export function ManageUsersView({
  tenantSlug,
  schoolCode,
  tenantName,
  connectedSchools,
  users,
  stats
}: ViewProps) {
  const [selectedSchoolIds, setSelectedSchoolIds] = React.useState<string[]>([]);

  const filteredUsers = React.useMemo(() => {
    if (selectedSchoolIds.length === 0) return users;
    return users.filter((u) =>
      selectedSchoolIds.some(
        (id) =>
          u.school_id === id ||
          u.school_code.toLowerCase().includes(id.toLowerCase()) ||
          u.school_name.toLowerCase().includes(id.toLowerCase())
      )
    );
  }, [users, selectedSchoolIds]);

  const {
    table,
    isAddOpen,
    setIsAddOpen,
    editingUser,
    setEditingUser,
    deletingUser,
    setDeletingUser,
    isSubmitting,
    errorMsg,
    handleCreateUser,
    handleUpdateUser,
    handleDeleteUser
  } = useManageUsersLogic(tenantSlug, filteredUsers, connectedSchools);

  // Form local states untuk Create Modal
  const [addFullName, setAddFullName] = React.useState("");
  const [addEmail, setAddEmail] = React.useState("");
  const [addPhone, setAddPhone] = React.useState("");
  const [addRole, setAddRole] = React.useState("guru");
  const [addPosition, setAddPosition] = React.useState("");
  const [addSchoolId, setAddSchoolId] = React.useState(connectedSchools[0]?.id || "");

  // Form local states untuk Edit Modal
  const [editFullName, setEditFullName] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editRole, setEditRole] = React.useState("guru");
  const [editPosition, setEditPosition] = React.useState("");
  const [editSchoolId, setEditSchoolId] = React.useState("");

  React.useEffect(() => {
    if (editingUser) {
      setEditFullName(editingUser.full_name || "");
      setEditEmail(editingUser.email || "");
      setEditPhone(editingUser.phone || "");
      setEditRole(editingUser.role || "guru");
      setEditPosition(editingUser.position || "");
      setEditSchoolId(editingUser.school_id || connectedSchools[0]?.id || "");
    }
  }, [editingUser, connectedSchools]);

  if (!schoolCode) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Kode Sekolah Belum Dihubungkan</h2>
        <p className="text-muted-foreground text-sm max-w-md mt-2 mb-6">
          Hubungkan Kode Sekolah dari basis data Jurnal Mengajar pada Pengaturan Organisasi untuk mengaktifkan fitur manajemen role dan pengguna.
        </p>
        <Button asChild>
          <Link href={`/${tenantSlug}/organization/general`}>
            <LinkIcon className="me-2 h-4 w-4" /> Hubungkan Kode Sekolah Sekarang
          </Link>
        </Button>
      </div>
    );
  }

  const onSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await handleCreateUser({
      fullName: addFullName,
      email: addEmail,
      phone: addPhone,
      role: addRole,
      position: addPosition,
      schoolId: addSchoolId || connectedSchools[0]?.id || ""
    });
    if (ok) {
      setAddFullName("");
      setAddEmail("");
      setAddPhone("");
      setAddRole("guru");
      setAddPosition("");
    }
  };

  const onSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleUpdateUser({
      fullName: editFullName,
      email: editEmail,
      phone: editPhone,
      role: editRole,
      position: editPosition,
      schoolId: editSchoolId
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Kelola Role & User Jurnal</h1>
            <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
              Kode Sekolah: {schoolCode}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs mt-1">
            Atur peran (role), jabatan, email, dan NIP pengguna pada database Jurnal Mengajar untuk sekolah {tenantName || ""}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SchoolMultiFilter
            schools={connectedSchools}
            selectedIds={selectedSchoolIds}
            onChange={setSelectedSchoolIds}
          />
          <Button onClick={() => setIsAddOpen(true)} className="inline-flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Tambah User Baru
          </Button>
        </div>
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Pengguna Managed</p>
            <p className="text-2xl font-bold">{stats.totalUsers}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Guru Pengajar</p>
            <p className="text-2xl font-bold">{stats.totalTeachers}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Administrator Sekolah</p>
            <p className="text-2xl font-bold">{stats.totalAdmins}</p>
          </div>
        </Card>
      </div>

      <DataGrid table={table} columns={table.getAllColumns() as any}>
        <DataGridTable noResultsText="Belum ada pengguna yang terdaftar untuk Kode Sekolah ini." />
      </DataGrid>

      {/* MODAL TAMBAH USER BARU */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={onSubmitAdd}>
            <DialogHeader>
              <DialogTitle>Tambah Pengguna Baru</DialogTitle>
              <DialogDescription>
                Daftarkan pengguna baru ke database Jurnal Mengajar untuk sekolah ini.
              </DialogDescription>
            </DialogHeader>

            {errorMsg && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-md my-2">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="add-name">Nama Lengkap *</Label>
                <Input
                  id="add-name"
                  required
                  value={addFullName}
                  onChange={(e) => setAddFullName(e.target.value)}
                  placeholder="Contoh: Ahmad Subagja, S.Pd."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="add-email">Email</Label>
                  <Input
                    id="add-email"
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="email@sekolah.sch.id"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="add-phone">NIP / Nomor HP</Label>
                  <Input
                    id="add-phone"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    placeholder="198501..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="add-role">Peran (Role) *</Label>
                  <Select value={addRole} onValueChange={setAddRole}>
                    <SelectTrigger id="add-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guru">Guru Pengajar</SelectItem>
                      <SelectItem value="admin">Admin Sekolah</SelectItem>
                      <SelectItem value="pending_guru">Pending Guru</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="add-position">Mata Pelajaran / Jabatan</Label>
                  <Input
                    id="add-position"
                    value={addPosition}
                    onChange={(e) => setAddPosition(e.target.value)}
                    placeholder="Contoh: Matematika"
                  />
                </div>
              </div>

              {connectedSchools.length > 1 && (
                <div className="space-y-1">
                  <Label htmlFor="add-school">Pilih Sekolah *</Label>
                  <Select value={addSchoolId} onValueChange={setAddSchoolId}>
                    <SelectTrigger id="add-school">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {connectedSchools.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />} Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL EDIT USER */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={onSubmitEdit}>
            <DialogHeader>
              <DialogTitle>Edit User & Role</DialogTitle>
              <DialogDescription>Perbarui data dan peran pengguna ini di Jurnal Mengajar.</DialogDescription>
            </DialogHeader>

            {errorMsg && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-md my-2">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="edit-name">Nama Lengkap *</Label>
                <Input
                  id="edit-name"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-phone">NIP / Nomor HP</Label>
                  <Input
                    id="edit-phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-role">Peran (Role) *</Label>
                  <Select value={editRole} onValueChange={setEditRole}>
                    <SelectTrigger id="edit-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guru">Guru Pengajar</SelectItem>
                      <SelectItem value="admin">Admin Sekolah</SelectItem>
                      <SelectItem value="pending_guru">Pending Guru</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-position">Mata Pelajaran / Jabatan</Label>
                  <Input
                    id="edit-position"
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                  />
                </div>
              </div>

              {connectedSchools.length > 1 && (
                <div className="space-y-1">
                  <Label htmlFor="edit-school">Pilih Sekolah</Label>
                  <Select value={editSchoolId} onValueChange={setEditSchoolId}>
                    <SelectTrigger id="edit-school">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {connectedSchools.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />} Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG KONFIRMASI HAPUS */}
      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Pengguna</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus pengguna <strong className="text-foreground">{deletingUser?.full_name}</strong> dari database Jurnal Mengajar? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeletingUser(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />} Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
