export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskProfile {
  id: string;
  full_name: string | null;
  avatar?: string | null;
}

export interface Task {
  id: string;
  tenant_id: string;
  title: string | null;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assignee_id: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  assignee?: TaskProfile | null;
  creator?: TaskProfile | null;
}

export interface MemberOption {
  id: string;
  name: string;
}

export interface AlertState {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

export interface TaskInput {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee_id?: string | null;
  due_date?: string | null;
}

export interface ActionResult<T = unknown> {
  success?: true;
  data?: T;
  error?: string;
}
