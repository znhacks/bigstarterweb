"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Trash2 } from "lucide-react";

import { DataTable, multiSelectFilterFn } from "./data-table/data-table";
import { DataTableColumnHeader } from "./data-table/data-table-column-header";
import { createSelectColumn } from "./data-table/data-table-select-column";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { generateAvatarFallback } from "@/lib/utils";
import { formatToUserTimezone, formatRelativeTime } from "@/lib/date";

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string;
  plan_name: string;
  status: "active" | "inactive" | "pending";
  lastSignIn?: string | null;
  created_at?: string;
};

interface GetColumnsArgs {
  locale: string;
  timeZone: string;
  onBanRow: (user: User) => void;
  onDeleteRow: (user: User) => void;
}

export function getUserColumns({
  locale,
  timeZone,
  onBanRow,
  onDeleteRow
}: GetColumnsArgs): ColumnDef<User, unknown>[] {
  return [
    createSelectColumn<User>(),
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={row.original.image} alt={row.original.name} />
            <AvatarFallback>{generateAvatarFallback(row.getValue("name") || "U")}</AvatarFallback>
          </Avatar>
          <div className="text-foreground font-semibold capitalize">{row.getValue("name")}</div>
        </div>
      )
    },
    {
      accessorKey: "role",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      cell: ({ row }) => <span className="capitalize">{row.getValue("role")}</span>,
      filterFn: multiSelectFilterFn
    },
    {
      accessorKey: "plan_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Plan" />,
      cell: ({ row }) => (
        <Badge variant="outline" className="font-semibold">
          {row.getValue("plan_name")}
        </Badge>
      ),
      filterFn: multiSelectFilterFn
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.status}
        </Badge>
      ),
      filterFn: multiSelectFilterFn
    },
    {
      accessorKey: "lastSignIn",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last sign in" />,
      cell: ({ row }) => {
        const value = row.getValue("lastSignIn") as string | null;
        if (!value) return <span className="text-muted-foreground text-xs">-</span>;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{formatRelativeTime(value, locale)}</span>
            <span className="text-muted-foreground text-[10px]">
              {formatToUserTimezone(value, timeZone, locale)}
            </span>
          </div>
        );
      }
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onBanRow(row.original)}>Ban</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDeleteRow(row.original)}
              className="text-destructive focus:text-destructive">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];
}

export default function UsersTable({ data, locale = "en", timeZone = "UTC" }: {
  data: User[];
  locale?: string;
  timeZone?: string;
}) {
  const columns = React.useMemo(
    () =>
      getUserColumns({
        locale,
        timeZone,
        onBanRow: (u) => console.log("ban", u.id),
        onDeleteRow: (u) => console.log("delete", u.id)
      }),
    [locale, timeZone]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchColumnId="name"
      labels={{ searchPlaceholder: "Search users..." }}
      filterableColumns={[
        {
          id: "status",
          title: "Status",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "pending", label: "Pending" }
          ]
        },
        {
          id: "plan_name",
          title: "Plan",
          options: [
            { value: "Free", label: "Free" },
            { value: "Starter", label: "Starter" },
            { value: "Pro", label: "Pro" },
            { value: "Enterprise", label: "Enterprise" }
          ]
        }
      ]}
      toolbarExtra={
        <Button variant="outline" className="h-9 text-xs">
          <Trash2 className="me-2 h-4 w-4" />
          <span className="hidden md:inline">Trash</span>
        </Button>
      }
    />
  );
}
