"use server";

import { getTenantSubdomain } from "@/lib/tenant";
import { getTaskRepository } from "@/lib/providers";

export async function createNewTask(formData: FormData) {
  try {
    const subdomain = await getTenantSubdomain(); // Mendeteksi 'tenant-a' atau 'tenant-b'
    if (!subdomain) return { error: "Subdomain tidak valid" };

    const taskTitle = formData.get("title") as string;

    // 1. Panggil repositori aktif
    const taskRepo = getTaskRepository();

    // 2. Simpan data (Sistem otomatis mendeteksi SHARED atau ISOLATED)
    const newTask = await taskRepo.create(taskTitle, subdomain);

    return { success: true, data: newTask };
  } catch (err: any) {
    return { error: err.message };
  }
}
