import type { UserProfile } from "../../shared/contracts";
import type { Env } from "../lib/env";
import { json, readJson } from "../lib/http";
import { normalizeProfileName } from "../lib/validation";

interface ProfileRequest {
  name?: unknown;
}

interface UserRow {
  id: string;
  display_name: string;
}

export async function postProfile(request: Request, env: Env): Promise<Response> {
  const body = await readJson<ProfileRequest>(request);
  const normalized = normalizeProfileName(body.name);
  const id = crypto.randomUUID();
  const nowMs = Date.now();

  await env.DB.prepare(
    `INSERT OR IGNORE INTO users (id, name_key, display_name, created_at_ms)
     VALUES (?, ?, ?, ?)`,
  )
    .bind(id, normalized.nameKey, normalized.displayName, nowMs)
    .run();

  const user = await env.DB.prepare(
    "SELECT id, display_name FROM users WHERE name_key = ?",
  )
    .bind(normalized.nameKey)
    .first<UserRow>();

  if (!user) throw new Error("Profile was not available after creation.");

  const response: UserProfile = { id: user.id, displayName: user.display_name };
  return json(response);
}
