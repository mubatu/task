import type { Item } from "../../shared/contracts";

export interface ItemRow {
  id: string;
  user_id: string;
  type: "task" | "reminder";
  title: string;
  details: string;
  task_date: string | null;
  remind_at_ms: number | null;
  status: "active" | "completed";
  created_at_ms: number;
  updated_at_ms: number;
  completed_at_ms: number | null;
}

export const ITEM_COLUMNS = `id, user_id, type, title, details, task_date,
  remind_at_ms, status, created_at_ms, updated_at_ms, completed_at_ms`;

export function serializeItem(row: ItemRow): Item {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    details: row.details,
    taskDate: row.task_date,
    remindAt: row.remind_at_ms,
    status: row.status,
    createdAt: row.created_at_ms,
    updatedAt: row.updated_at_ms,
    completedAt: row.completed_at_ms,
  };
}
