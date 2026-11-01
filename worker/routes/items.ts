import type { CreateItemRequest, ItemsResponse } from "../../shared/contracts";
import type { Env } from "../lib/env";
import { HttpError, json, readJson } from "../lib/http";
import { ITEM_COLUMNS, serializeItem, type ItemRow } from "../lib/items";
import { requireItemStatus, requireUserId, validateItemInput } from "../lib/validation";

async function requireExistingUser(db: D1Database, userId: string): Promise<void> {
  const user = await db.prepare("SELECT id FROM users WHERE id = ?").bind(userId).first();
  if (!user) throw new HttpError(404, "User was not found.");
}

export async function getItems(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const userId = requireUserId(url.searchParams.get("userId"));
  const status = requireItemStatus(url.searchParams.get("status"));
  await requireExistingUser(env.DB, userId);

  const orderBy = status === "completed"
    ? "completed_at_ms DESC, created_at_ms DESC"
    : `CASE WHEN type = 'reminder' THEN 0 WHEN task_date IS NOT NULL THEN 1 ELSE 2 END,
       COALESCE(remind_at_ms, 9223372036854775807),
       COALESCE(task_date, '9999-12-31'), created_at_ms DESC`;
  const result = await env.DB.prepare(
    `SELECT ${ITEM_COLUMNS} FROM items
     WHERE user_id = ? AND status = ?
     ORDER BY ${orderBy}`,
  )
    .bind(userId, status)
    .all<ItemRow>();

  const response: ItemsResponse = {
    serverTime: new Date().toISOString(),
    items: result.results.map(serializeItem),
  };
  return json(response);
}

export async function postItem(request: Request, env: Env): Promise<Response> {
  const body = await readJson<CreateItemRequest>(request);
  const input = validateItemInput(body as unknown as Record<string, unknown>);
  await requireExistingUser(env.DB, input.userId);

  const id = crypto.randomUUID();
  const nowMs = Date.now();
  await env.DB.prepare(
    `INSERT INTO items
      (id, user_id, type, title, details, task_date, remind_at_ms, status,
       created_at_ms, updated_at_ms, completed_at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, NULL)`,
  )
    .bind(
      id,
      input.userId,
      input.type,
      input.title,
      input.details,
      input.taskDate,
      input.remindAt,
      nowMs,
      nowMs,
    )
    .run();

  const row = await env.DB.prepare(`SELECT ${ITEM_COLUMNS} FROM items WHERE id = ?`)
    .bind(id)
    .first<ItemRow>();
  if (!row) throw new Error("Item was not available after creation.");
  return json(serializeItem(row), { status: 201 });
}
