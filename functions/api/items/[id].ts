import type { Env } from "../../_shared/env";
import { handleError, HttpError, json, readJson } from "../../_shared/http";
import { ITEM_COLUMNS, serializeItem, type ItemRow } from "../../_shared/items";
import { requireItemId, requireItemStatus, requireUserId, validateItemInput } from "../../_shared/validation";

export const onRequestPatch: PagesFunction<Env, "id"> = async (context) => {
  try {
    const id = requireItemId(context.params.id);
    const body = await readJson<Record<string, unknown>>(context.request);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new HttpError(400, "An item update is required.");
    }
    const userId = requireUserId(body.userId);
    const nowMs = Date.now();
    let result: D1Result;

    if ("status" in body) {
      if (Object.keys(body).some((key) => key !== "userId" && key !== "status")) {
        throw new HttpError(400, "Update status separately from item details.");
      }
      const status = requireItemStatus(body.status);
      const completedAt = status === "completed" ? nowMs : null;
      result = await context.env.DB.prepare(
        `UPDATE items SET status = ?, completed_at_ms = ?, updated_at_ms = ?
         WHERE id = ? AND user_id = ?`,
      )
        .bind(status, completedAt, nowMs, id, userId)
        .run();
    } else {
      const existing = await context.env.DB.prepare(
        `SELECT ${ITEM_COLUMNS} FROM items WHERE id = ? AND user_id = ?`,
      ).bind(id, userId).first<ItemRow>();
      if (!existing) throw new HttpError(404, "Item was not found.");

      const input = validateItemInput({ ...body, type: existing.type }, nowMs, existing.remind_at_ms);
      result = await context.env.DB.prepare(
        `UPDATE items SET title = ?, details = ?, task_date = ?, remind_at_ms = ?, updated_at_ms = ?
         WHERE id = ? AND user_id = ?`,
      )
        .bind(input.title, input.details, input.taskDate, input.remindAt, nowMs, id, userId)
        .run();
    }

    if (!result.meta.changes) throw new HttpError(404, "Item was not found.");

    const row = await context.env.DB.prepare(
      `SELECT ${ITEM_COLUMNS} FROM items WHERE id = ? AND user_id = ?`,
    )
      .bind(id, userId)
      .first<ItemRow>();
    if (!row) throw new Error("Item was not available after update.");
    return json(serializeItem(row));
  } catch (error) {
    return handleError(error);
  }
};
