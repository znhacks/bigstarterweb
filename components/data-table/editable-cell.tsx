"use client";

import * as React from "react";
import { useRef, useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

type Editor = "text" | "select" | "date";

export interface SelectOption {
  value: string;
  label: string;
}

interface EditableCellProps {
  value: string | null | undefined;

  displayValue: React.ReactNode;

  enabled: boolean;
  editor: Editor;
  options?: SelectOption[];

  onCommit: (next: string | null) => void;

  onView: () => void;
  className?: string;
}

const NONE = "__none__";

export function EditableCell({
  value,
  displayValue,
  enabled,
  editor,
  options,
  onCommit,
  onView,
  className
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handleClick = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      onView();
    }, 220);
  };

  const handleDoubleClick = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (enabled) setIsEditing(true);
  };

  if (isEditing && enabled) {
    return (
      <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
        {editor === "text" && (
          <TextEditor
            value={value ?? ""}
            onCommit={(v) => {
              onCommit(v);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        )}
        {editor === "date" && (
          <DateEditor
            value={value ?? ""}
            onCommit={(v) => {
              onCommit(v);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        )}
        {editor === "select" && (
          <SelectEditor
            value={value ?? null}
            options={options}
            onCommit={(v) => {
              onCommit(v);
              setIsEditing(false);
            }}
            onClose={() => setIsEditing(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`cursor-pointer select-none ${className ?? ""}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={enabled ? undefined : undefined}>
      {displayValue}
    </div>
  );
}

function TextEditor({
  value,
  onCommit,
  onCancel
}: {
  value: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <Input
      ref={ref}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onCommit(draft);
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => onCommit(draft)}
      className="h-8 text-xs"
    />
  );
}

function DateEditor({
  value,
  onCommit,
  onCancel
}: {
  value: string;
  onCommit: (v: string | null) => void;
  onCancel: () => void;
}) {
  const initial = toDateInputValue(value);
  const [draft, setDraft] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  const commit = () => {
    if (!draft) {
      onCommit(null);
    } else {
      onCommit(`${draft}T00:00:00.000Z`);
    }
  };

  return (
    <Input
      ref={ref}
      type="date"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={commit}
      className="h-8 w-[150px] text-xs"
    />
  );
}

function SelectEditor({
  value,
  options,
  onCommit,
  onClose
}: {
  value: string | null;
  options?: SelectOption[];
  onCommit: (v: string | null) => void;
  onClose: () => void;
}) {
  return (
    <Select
      defaultOpen
      value={value ?? NONE}
      onValueChange={(v) => onCommit(v === NONE ? null : v)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(options || []).map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function toDateInputValue(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ReadonlyCell({
  displayValue,
  onView,
  className
}: {
  displayValue: React.ReactNode;
  onView: () => void;
  className?: string;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleClick = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      onView();
    }, 220);
  }, [onView]);

  return (
    <div className={`cursor-pointer select-none ${className ?? ""}`} onClick={handleClick}>
      {displayValue}
    </div>
  );
}
