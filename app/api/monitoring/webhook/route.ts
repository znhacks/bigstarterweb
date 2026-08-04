import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/api/supabase-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, school_code, data } = body;

    if (!school_code || !type || !data) {
      return NextResponse.json(
        { error: "Parameter `school_code`, `type`, dan `data` wajib diisi." },
        { status: 400 }
      );
    }

    if (type === "activity_log") {
      const { error } = await supabaseAdmin.from("school_activity_logs").insert({
        school_code,
        user_name: data.user_name,
        user_role: data.user_role || "Guru",
        activity_type: data.activity_type,
        device_info: data.device_info,
        ip_address: data.ip_address,
        status: data.status || "success"
      });
      if (error) throw error;
    } else if (type === "user") {
      const { error } = await supabaseAdmin.from("school_users").insert({
        school_code,
        full_name: data.full_name,
        email: data.email,
        nip: data.nip,
        subject: data.subject,
        role: data.role || "Guru Pengajar",
        status: data.status || "aktif",
        last_active_at: new Date().toISOString()
      });
      if (error) throw error;
    } else if (type === "journal") {
      const { error } = await supabaseAdmin.from("school_journal_logs").insert({
        school_code,
        teacher_name: data.teacher_name,
        class_name: data.class_name,
        subject: data.subject,
        teaching_date: data.teaching_date || new Date().toISOString().split("T")[0],
        start_time: data.start_time,
        end_time: data.end_time,
        topic: data.topic,
        attendance_summary: data.attendance_summary,
        status: data.status || "terverifikasi"
      });
      if (error) throw error;
    } else {
      return NextResponse.json({ error: "Tipe monitoring tidak dikenal." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Data ${type} berhasil tersinkronisasi untuk sekolah ${school_code}`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Gagal memproses webhook." }, { status: 500 });
  }
}
