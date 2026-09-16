import { describe, expect, it } from "vitest";
import type { Item } from "../shared/contracts";
import { groupActiveItems, isItemOverdue } from "../src/features/items/itemGroups";

function makeItem(overrides: Partial<Item>): Item {
  return {
    id: crypto.randomUUID(),
    userId: "123e4567-e89b-42d3-a456-426614174000",
    type: "task",
    title: "Task",
    details: "",
    taskDate: null,
    remindAt: null,
    status: "active",
    createdAt: 1,
    updatedAt: 1,
    completedAt: null,
    ...overrides,
  };
}

describe("active item groups", () => {
  it("separates overdue, today, upcoming, and unscheduled items", () => {
    const nowMs = Date.parse("2026-09-16T12:00:00Z");
    const items = [
      makeItem({ taskDate: "2026-09-15" }),
      makeItem({ taskDate: "2026-09-16" }),
      makeItem({ taskDate: "2026-09-18" }),
      makeItem({ taskDate: null }),
    ];
    const groups = groupActiveItems(items, nowMs, "2026-09-16");
    expect(groups.overdue).toHaveLength(1);
    expect(groups.today).toHaveLength(1);
    expect(groups.upcoming).toHaveLength(1);
    expect(groups.unscheduled).toHaveLength(1);
  });

  it("marks reminders due at the current instant as overdue", () => {
    const reminder = makeItem({ type: "reminder", remindAt: 2_000 });
    expect(isItemOverdue(reminder, 2_000, "2026-09-16")).toBe(true);
  });
});
