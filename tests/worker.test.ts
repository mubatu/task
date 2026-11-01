/// <reference types="@cloudflare/workers-types" />

import { describe, expect, it, vi } from "vitest";
import worker from "../worker/index";
import type { Env } from "../worker/lib/env";

const sessionUser = { id: "123e4567-e89b-42d3-a456-426614174000", display_name: "Batu" };
const otherUserId = "999e4567-e89b-42d3-a456-426614174999";
const signedIn = { Cookie: "task_session=token" };

function createEnv({ signedInUser = true } = {}) {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const assets = vi.fn(async () => new Response("<!doctype html>", { headers: { "Content-Type": "text/html" } }));
  const env = {
    GOOGLE_CLIENT_ID: "client-id",
    ASSETS: { fetch: assets },
    DB: {
      prepare: vi.fn((sql: string) => {
        const statement = { sql, values: [] as unknown[] };
        statements.push(statement);
        const bound = {
          bind(...values: unknown[]) {
            statement.values = values;
            return bound;
          },
          first: async () => {
            if (sql.includes("FROM auth_sessions")) return signedInUser ? sessionUser : null;
            if (sql.includes("FROM items")) {
              return {
                id: statement.values[0],
                user_id: sessionUser.id,
                type: "task",
                title: "Plan",
                details: "",
                task_date: null,
                remind_at_ms: null,
                status: "active",
                created_at_ms: 1,
                updated_at_ms: 1,
                completed_at_ms: null,
              };
            }
            return null;
          },
          run: async () => ({ meta: { changes: 1 } }),
          all: async () => ({ results: [] }),
        };
        return bound;
      }),
    },
  } as unknown as Env;
  return { env, assets, statements };
}

function apiRequest(path: string, init: RequestInit = {}): Request {
  return new Request(`https://task.test${path}`, init);
}

describe("worker router", () => {
  it.each(["/", "/calendar", "/privacy", "/favicon.svg"])("serves %s from static assets", async (path) => {
    const { env, assets, statements } = createEnv();
    const response = await worker.fetch(apiRequest(path), env);

    expect(response.status).toBe(200);
    expect(assets).toHaveBeenCalledOnce();
    expect(statements).toHaveLength(0);
  });

  it("answers the session check without a cookie", async () => {
    const { env, statements } = createEnv();
    const response = await worker.fetch(apiRequest("/api/auth/session"), env);

    expect(await response.json()).toEqual({ user: null, googleClientId: "client-id" });
    expect(statements).toHaveLength(0);
  });

  it("returns the signed-in user from the session cookie", async () => {
    const { env } = createEnv();
    const response = await worker.fetch(apiRequest("/api/auth/session", { headers: signedIn }), env);

    expect(await response.json()).toEqual({
      user: { id: sessionUser.id, displayName: "Batu" },
      googleClientId: "client-id",
    });
  });

  it("requires a session for item routes", async () => {
    const { env, statements } = createEnv({ signedInUser: false });

    for (const request of [
      apiRequest("/api/items?status=active"),
      apiRequest("/api/items?status=active", { headers: signedIn }),
      apiRequest("/api/items", { method: "POST", headers: signedIn, body: "{}" }),
    ]) {
      const response = await worker.fetch(request, env);
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Sign in to continue." });
    }
    expect(statements.every(({ sql }) => sql.includes("FROM auth_sessions"))).toBe(true);
  });

  it("returns a JSON 404 for unknown API paths", async () => {
    const { env, assets } = createEnv();

    for (const path of ["/api/missing", "/api/profile", "/api/items/", "/api/items/a/b"]) {
      const response = await worker.fetch(apiRequest(path, { method: "POST" }), env);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Not found." });
    }
    expect(assets).not.toHaveBeenCalled();
  });

  it("returns 405 with an Allow header for wrong methods", async () => {
    const { env, statements } = createEnv();

    const items = await worker.fetch(apiRequest("/api/items", { method: "DELETE" }), env);
    expect(items.status).toBe(405);
    expect(items.headers.get("Allow")).toBe("GET, POST");

    const item = await worker.fetch(apiRequest(`/api/items/${otherUserId}`), env);
    expect(item.status).toBe(405);
    expect(item.headers.get("Allow")).toBe("PATCH");
    expect(statements).toHaveLength(0);
  });

  it("rejects cross-site writes before touching the database", async () => {
    const { env, statements } = createEnv();
    const response = await worker.fetch(
      apiRequest("/api/items", {
        method: "POST",
        headers: { ...signedIn, Origin: "https://evil.test" },
        body: JSON.stringify({ type: "task", title: "x" }),
      }),
      env,
    );

    expect(response.status).toBe(403);
    expect(statements).toHaveLength(0);
  });

  it("creates items as the session user even if the body names someone else", async () => {
    const { env, statements } = createEnv();
    const response = await worker.fetch(
      apiRequest("/api/items", {
        method: "POST",
        headers: { ...signedIn, Origin: "https://task.test" },
        body: JSON.stringify({ userId: otherUserId, type: "task", title: "Plan" }),
      }),
      env,
    );

    expect(response.status).toBe(201);
    const insert = statements.find(({ sql }) => sql.includes("INSERT INTO items"));
    expect(insert?.values[1]).toBe(sessionUser.id);
  });

  it("lists only the session user's items even if the query names someone else", async () => {
    const { env, statements } = createEnv();
    const response = await worker.fetch(
      apiRequest(`/api/items?userId=${otherUserId}&status=active`, { headers: signedIn }),
      env,
    );

    expect(response.status).toBe(200);
    const select = statements.find(({ sql }) => sql.includes("FROM items"));
    expect(select?.values).toEqual([sessionUser.id, "active"]);
  });

  it("clears the session cookie on logout", async () => {
    const { env, statements } = createEnv();
    const response = await worker.fetch(apiRequest("/api/auth/logout", { method: "POST", headers: signedIn }), env);

    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toBe("task_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure");
    expect(statements.some(({ sql }) => sql.startsWith("DELETE FROM auth_sessions"))).toBe(true);
  });

  it("turns handler errors into JSON responses", async () => {
    const { env } = createEnv();
    const response = await worker.fetch(apiRequest("/api/auth/google", { method: "POST", body: "not json" }), env);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "A valid JSON body is required." });
  });
});
