"use client";

import { formatDateTime } from "@/lib/i18n/format";

import type { Task, MemberOption } from "./types";

interface ExportArgs {
  rows: Task[];
  members: MemberOption[];
  locale: string;
  timeZone: string;
  orgName: string;
}

const EXPORT_DICTIONARY: Record<string, Record<string, string>> = {
  en: {
    "export.sheetName": "Tasks Report",
    "export.title": "Task List Report",
    "export.generatedAt": "Generated At",
    "export.filename": "tasks-report",
    "header.title": "Task Title",
    "header.description": "Description",
    "header.status": "Status",
    "header.priority": "Priority",
    "header.assignee": "Assignee",
    "header.dueDate": "Due Date",
    "header.createdBy": "Created By",
    "header.createdAt": "Created At",
    "header.updatedAt": "Updated At",
    "status.todo": "To Do",
    "status.in_progress": "In Progress",
    "status.done": "Done",
    "status.cancelled": "Cancelled",
    "priority.low": "Low",
    "priority.medium": "Medium",
    "priority.high": "High",
    "priority.urgent": "Urgent"
  },
  id: {
    "export.sheetName": "Laporan Tugas",
    "export.title": "Laporan Daftar Tugas",
    "export.generatedAt": "Dibuat Pada",
    "export.filename": "laporan-tugas",
    "header.title": "Judul Tugas",
    "header.description": "Deskripsi",
    "header.status": "Status",
    "header.priority": "Prioritas",
    "header.assignee": "Penerima Tugas",
    "header.dueDate": "Tenggat Waktu",
    "header.createdBy": "Dibuat Oleh",
    "header.createdAt": "Waktu Pembuatan",
    "header.updatedAt": "Pembaruan Terakhir",
    "status.todo": "Harus Dikerjakan",
    "status.in_progress": "Sedang Berjalan",
    "status.done": "Selesai",
    "status.cancelled": "Dibatalkan",
    "priority.low": "Rendah",
    "priority.medium": "Sedang",
    "priority.high": "Tinggi",
    "priority.urgent": "Mendesak"
  },
  ar: {
    "export.sheetName": "تقرير المهام",
    "export.title": "تقرير قائمة المهام",
    "export.generatedAt": "تم الإنشاء في",
    "export.filename": "تقرير-المهام",
    "header.title": "عنوان المهمة",
    "header.description": "الوصف",
    "header.status": "الحالة",
    "header.priority": "الأهمية",
    "header.assignee": "المسند إليه",
    "header.dueDate": "تاريخ الاستحقاق",
    "header.createdBy": "أنشئ بواسطة",
    "header.createdAt": "تاريخ الإنشاء",
    "header.updatedAt": "آخر تحديث",
    "status.todo": "قيد الانتظار",
    "status.in_progress": "قيد التنفيذ",
    "status.done": "مكتمل",
    "status.cancelled": "ملغي",
    "priority.low": "منخفض",
    "priority.medium": "متوسط",
    "priority.high": "عالي",
    "priority.urgent": "عاجل"
  }
};

function translateKey(key: string, locale: string): string {
  const dict = EXPORT_DICTIONARY[locale] ?? EXPORT_DICTIONARY["en"];
  return dict[key] ?? key;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "report";
}

function memberName(members: MemberOption[], id: string | null | undefined): string {
  if (!id) return "";
  return members.find((m) => m.id === id)?.name || id;
}

export async function exportTasksToExcel({
  rows,
  members,
  locale,
  timeZone,
  orgName
}: ExportArgs): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();

  const sheetName = translateKey("export.sheetName", locale);
  const ws = wb.addWorksheet(sheetName, {
    views: [
      {
        rightToLeft: locale === "ar",
        state: "frozen",
        ySplit: 4
      }
    ]
  });

  const headerKeys = [
    "title",
    "description",
    "status",
    "priority",
    "assignee",
    "dueDate",
    "createdBy",
    "createdAt",
    "updatedAt"
  ] as const;

  ws.mergeCells("A1", `${String.fromCharCode(65 + headerKeys.length - 1)}1`);
  const titleCell = ws.getCell("A1");
  titleCell.value = `${translateKey("export.title", locale)} — ${orgName}`;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: locale === "ar" ? "right" : "left", vertical: "middle" };
  ws.getRow(1).height = 24;

  ws.mergeCells("A2", `${String.fromCharCode(65 + headerKeys.length - 1)}2`);
  const genCell = ws.getCell("A2");
  const formattedGenTime = formatDateTime(new Date().toISOString(), locale, {
    dateStyle: "long",
    timeZone
  });
  genCell.value = `${translateKey("export.generatedAt", locale)}: ${formattedGenTime}`;
  genCell.font = { size: 10, italic: true };
  genCell.alignment = { horizontal: locale === "ar" ? "right" : "left" };

  const headerRow = ws.getRow(4);
  headerRow.values = headerKeys.map((k) => translateKey(`header.${k}`, locale));
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF111827" }
  };
  headerRow.alignment = { horizontal: locale === "ar" ? "right" : "left", vertical: "middle" };
  headerRow.height = 20;

  const formatStatus = (s: string) => translateKey(`status.${s}`, locale);
  const formatPriority = (p: string) => translateKey(`priority.${p}`, locale);
  const fmtDate = (v: string | null) =>
    v ? formatDateTime(v, locale, { dateStyle: "medium", timeZone }) : "";

  rows.forEach((task, i) => {
    const row = ws.getRow(5 + i);
    row.values = [
      task.title || "",
      task.description || "",
      formatStatus(task.status),
      formatPriority(task.priority),
      task.assignee?.full_name || memberName(members, task.assignee_id),
      fmtDate(task.due_date),
      task.creator?.full_name || memberName(members, task.created_by),
      fmtDate(task.created_at),
      fmtDate(task.updated_at)
    ];
    row.alignment = {
      horizontal: locale === "ar" ? "right" : "left",
      vertical: "top",
      wrapText: false
    };
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } }
      };
    });
  });

  const widths: Record<string, number> = {
    title: 32,
    description: 40,
    status: 16,
    priority: 14,
    assignee: 22,
    dueDate: 22,
    createdBy: 22,
    createdAt: 22,
    updatedAt: 22
  };
  ws.columns.forEach((col, idx) => {
    col.width = widths[headerKeys[idx]] ?? 20;
  });

  const stamp = dateStamp();
  const rawFilename = translateKey("export.filename", locale);
  const filename = `${sanitizeFilename(rawFilename)}-${sanitizeFilename(orgName)}-${stamp}.xlsx`;

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function dateStamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
