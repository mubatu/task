import type { SessionUser } from "../lib/auth";
import type { Env } from "../lib/env";
import { HttpError, json, readJson } from "../lib/http";
import { ITEM_COLUMNS, serializeItem, type ItemRow } from "../lib/items";
import { requireItemId, requireItemStatus, validateItemInput } from "../lib/validation";

const ITEM_PATH_PREFIX = "/api/items/";

export async function patchItem(request: Request, env: Env, user: SessionUser): Promise<Response> {
  const { pathname } = new URL(request.url);
  const id = requireItemId(decodeURIComponent(pathname.slice(ITEM_PATH_PREFIX.length)));
  const body = await readJson<Record<string, unknown>>(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "An item update is required.");
  }
  const userId = user.id;
  const nowMs = Date.now();
  let result: D1Result;

  if ("status" in body) {
    if (Object.keys(body).some((key) => key !== "status")) {
      throw new HttpError(400, "Update status separately from item details.");
    }
    const status = requireItemStatus(body.status);
    const completedAt = status === "completed" ? nowMs : null;
    result = await env.DB.prepare(
      `UPDATE items SET status = ?, completed_at_ms = ?, updated_at_ms = ?
       WHERE id = ? AND user_id = ?`,
    )
      .bind(status, completedAt, nowMs, id, userId)
      .run();
  } else {
    const existing = await env.DB.prepare(
      `SELECT ${ITEM_COLUMNS} FROM items WHERE id = ? AND user_id = ?`,
    ).bind(id, userId).first<ItemRow>();
    if (!existing) throw new HttpError(404, "Item was not found.");

    const input = validateItemInput({ ...body, type: existing.type }, nowMs, existing.remind_at_ms);
    result = await env.DB.prepare(
      `UPDATE items SET title = ?, details = ?, task_date = ?, remind_at_ms = ?, updated_at_ms = ?
       WHERE id = ? AND user_id = ?`,
    )
      .bind(input.title, input.details, input.taskDate, input.remindAt, nowMs, id, userId)
      .run();
  }

  if (!result.meta.changes) throw new HttpError(404, "Item was not found.");

  const row = await env.DB.prepare(
    `SELECT ${ITEM_COLUMNS} FROM items WHERE id = ? AND user_id = ?`,
  )
    .bind(id, userId)
    .first<ItemRow>();
  if (!row) throw new Error("Item was not available after update.");
  return json(serializeItem(row));
}
