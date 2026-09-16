import type { UpdateItemStatusRequest } from "../../../shared/contracts";
import type { Env } from "../../_shared/env";
import { handleError, HttpError, json, readJson } from "../../_shared/http";
import { ITEM_COLUMNS, serializeItem, type ItemRow } from "../../_shared/items";
import { requireItemId, requireItemStatus, requireUserId } from "../../_shared/validation";

export const onRequestPatch: PagesFunction<Env, "id"> = async (context) => {
  try {
    const id = requireItemId(context.params.id);
    const body = await readJson<UpdateItemStatusRequest>(context.request);
    const userId = requireUserId(body.userId);
    const status = requireItemStatus(body.status);
    const nowMs = Date.now();
    const completedAt = status === "completed" ? nowMs : null;

    const result = await context.env.DB.prepare(
      `UPDATE items SET status = ?, completed_at_ms = ?, updated_at_ms = ?
       WHERE id = ? AND user_id = ?`,
    )
      .bind(status, completedAt, nowMs, id, userId)
      .run();

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
