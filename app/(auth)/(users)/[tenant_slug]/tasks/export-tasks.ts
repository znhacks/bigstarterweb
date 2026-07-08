"use client";

import type { Task, MemberOption } from "./logic";
import { formatToUserTimezone } from "@/lib/date";

// Tipe minimal untuk fungsi terjemahan next-intl (menghindari dependensi tipe berat).
type TFn = (key: string, values?: Record<string, unknown>) => string;

interface ExportArgs {
  rows: Task[];
  members: MemberOption[];
  t: TFn;
  locale: string;
  timeZone: string;
  orgName: string;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "org";
}

function memberName(members: MemberOption[], id: string | null | undefined): string {
  if (!id) return "";
  return members.find((m) => m.id === id)?.name || id;
}

/**
 * Mengekspor daftar task ke file Excel (.xlsx) yang multibahasa:
 * nama file, judul di dalam file, dan header tabel mengikuti locale aktif.
 * Baris yang diekspor = rows yang dilewatkan (biasanya hasil filter tabel).
 */
export async function exportTasksToExcel({
  rows,
  members,
  t,
  locale,
  timeZone,
  orgName
}: ExportArgs): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const sheetName = t("export.sheetName");
  const ws = wb.addWorksheet(sheetName, {
    views: [
      {
        rightToLeft: locale === "ar",
        state: "frozen",
        ySplit: 4
      }
    ]
  });

  // Susunan kolom export
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

  // ---- Baris judul (merge A1:I1) ----
  ws.mergeCells("A1", `${String.fromCharCode(65 + headerKeys.length - 1)}1`);
  const titleCell = ws.getCell("A1");
  titleCell.value = `${t("export.title")} — ${orgName}`;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: locale === "ar" ? "right" : "left", vertical: "middle" };
  ws.getRow(1).height = 24;

  // ---- Baris "dibuat pada" ----
  ws.mergeCells("A2", `${String.fromCharCode(65 + headerKeys.length - 1)}2`);
  const genCell = ws.getCell("A2");
  genCell.value = `${t("export.generatedAt")}: ${formatToUserTimezone(
    new Date().toISOString(),
    timeZone,
    locale
  )}`;
  genCell.font = { size: 10, italic: true };
  genCell.alignment = { horizontal: locale === "ar" ? "right" : "left" };

  // ---- Header row (baris 4) ----
  const headerRow = ws.getRow(4);
  headerRow.values = headerKeys.map((k) => t(`data-table.headers.${k}`));
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF111827" }
  };
  headerRow.alignment = { horizontal: locale === "ar" ? "right" : "left", vertical: "middle" };
  headerRow.height = 20;

  // ---- Data rows ----
  const formatStatus = (s: string) => safeT(t, `data-table.statuses.${s}`, s);
  const formatPriority = (p: string) => safeT(t, `data-table.priorities.${p}`, p);
  const fmtDate = (v: string | null) => (v ? formatToUserTimezone(v, timeZone, locale) : "");

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

  // ---- Lebar kolom ----
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

  // ---- Download ----
  const stamp = dateStamp();
  const filename = `${sanitizeFilename(t("export.filename"))}-${sanitizeFilename(orgName)}-${stamp}.xlsx`;

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

// Ambil key terjemahan bila ada; fallback ke nilai mentah.
function safeT(t: TFn, key: string, fallback: string): string {
  try {
    const v = t(key);
    // next-intl melempar bila key tidak ada; kembalikan fallback bila sama persis dgn key.
    return v === key ? fallback : v;
  } catch {
    return fallback;
  }
}

function dateStamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
