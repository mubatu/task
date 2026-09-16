import type { Item } from "../../../shared/contracts";
import { dateKeyFromTimestamp } from "../../lib/dateTime";

export interface ActiveItemGroups {
  overdue: Item[];
  today: Item[];
  upcoming: Item[];
  unscheduled: Item[];
}

export function itemDateKey(item: Item): string | null {
  if (item.type === "task") return item.taskDate;
  return item.remindAt === null ? null : dateKeyFromTimestamp(item.remindAt);
}

export function isItemOverdue(item: Item, nowMs: number, currentDateKey: string): boolean {
  if (item.type === "reminder") return item.remindAt !== null && item.remindAt <= nowMs;
  return item.taskDate !== null && item.taskDate < currentDateKey;
}

export function groupActiveItems(
  items: Item[],
  nowMs: number,
  currentDateKey: string,
): ActiveItemGroups {
  const groups: ActiveItemGroups = { overdue: [], today: [], upcoming: [], unscheduled: [] };
  for (const item of items) {
    const dateKey = itemDateKey(item);
    if (isItemOverdue(item, nowMs, currentDateKey)) groups.overdue.push(item);
    else if (dateKey === currentDateKey) groups.today.push(item);
    else if (dateKey) groups.upcoming.push(item);
    else groups.unscheduled.push(item);
  }
  return groups;
}
