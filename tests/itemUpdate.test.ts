/// <reference types="@cloudflare/workers-types" />

import { describe, expect, it, vi } from "vitest";
import { onRequestPatch } from "../functions/api/items/[id]";
import type { ItemRow } from "../functions/_shared/items";

const row: ItemRow = {
  id: "123e4567-e89b-42d3-a456-426614174001",
  user_id: "123e4567-e89b-42d3-a456-426614174000",
  type: "reminder",
  title: "Buluşma",
  details: "Kahve",
  task_date: null,
  remind_at_ms: Date.now() + 86_400_000,
  status: "completed",
  created_at_ms: 1000,
  updated_at_ms: 2000,
  completed_at_ms: 3000,
};

function callPatch(body: unknown, existing: ItemRow | null = row) {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const db = {
    prepare: vi.fn((sql: string) => {
      const statement = { sql, values: [] as unknown[] };
      statements.push(statement);
      return {
        bind(...values: unknown[]) {
          statement.values = values;
          return {
            first: async () => existing,
            run: async () => ({ meta: { changes: existing ? 1 : 0 } }),
          };
        },
      };
    }),
  };
  const context = {
    params: { id: row.id },
    request: new Request(`http://localhost/api/items/${row.id}`, { method: "PATCH", body: JSON.stringify(body) }),
    env: { DB: db },
  } as unknown as Parameters<typeof onRequestPatch>[0];
  return { response: onRequestPatch(context), statements };
}

describe("item update endpoint", () => {
  it("updates reminder content with ownership filtering and preserves completion metadata", async () => {
    const remindAt = Date.now() + 172_800_000;
    const { response, statements } = callPatch({ userId: row.user_id, title: "  Yeni buluşma ", details: "", remindAt });
    const result = await response;
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ id: row.id, status: "completed", createdAt: 1000, completedAt: 3000 });
    const update = statements.find(({ sql }) => sql.startsWith("UPDATE"))!;
    expect(update.values).toEqual(["Yeni buluşma", "", null, remindAt, expect.any(Number), row.id, row.user_id]);
    expect(update.sql).toContain("WHERE id = ? AND user_id = ?");
    expect(update.sql).not.toMatch(/SET status|completed_at_ms =|created_at_ms =/);
    expect(statements.filter(({ sql }) => sql.startsWith("SELECT")).every(({ values }) => values[1] === row.user_id)).toBe(true);
  });

  it("updates and clears task dates without changing the item type", async () => {
    for (const taskDate of ["2026-10-03", null]) {
      const { response, statements } = callPatch({ userId: row.user_id, title: row.title, taskDate }, { ...row, type: "task", task_date: "2026-10-01", remind_at_ms: null });
      expect((await response).status).toBe(200);
      const update = statements.find(({ sql }) => sql.startsWith("UPDATE"))!;
      expect(update.values.slice(0, 4)).toEqual([row.title, "", taskDate, null]);
      expect(update.sql).not.toContain("type =");
    }
  });

  it("returns 404 without writing when the ownership-filtered lookup finds no item", async () => {
    const { response, statements } = callPatch({ userId: row.user_id, title: "Missing", remindAt: row.remind_at_ms }, null);
    expect((await response).status).toBe(404);
    expect(statements.some(({ sql }) => sql.startsWith("UPDATE"))).toBe(false);
  });

  it("allows retaining an overdue time but rejects rescheduling into the past", async () => {
    const past = Date.now() - 60_000;
    const existing = { ...row, remind_at_ms: past };
    expect((await callPatch({ userId: row.user_id, title: "Yeni başlık", remindAt: past }, existing).response).status).toBe(200);
    const { response, statements } = callPatch({ userId: row.user_id, title: "Yeni başlık", remindAt: past - 1000 }, existing);
    expect((await response).status).toBe(400);
    expect(statements.some(({ sql }) => sql.startsWith("UPDATE"))).toBe(false);
  });

  it.each([null, [], {}, { userId: row.user_id, title: " " }, { userId: row.user_id, title: "Bad time", remindAt: "tomorrow" }, { userId: row.user_id, status: "completed", title: "Mixed update" }])("rejects invalid input %j without writing", async (body) => {
    const { response, statements } = callPatch(body);
    expect((await response).status).toBe(400);
    expect(statements.some(({ sql }) => sql.startsWith("UPDATE"))).toBe(false);
  });

  it.each(["active", "completed"])("preserves the existing status-only %s action", async (status) => {
    const { response, statements } = callPatch({ userId: row.user_id, status });
    expect((await response).status).toBe(200);
    const update = statements.find(({ sql }) => sql.startsWith("UPDATE"))!;
    expect(update.values).toEqual([status, status === "completed" ? expect.any(Number) : null, expect.any(Number), row.id, row.user_id]);
  });
});
