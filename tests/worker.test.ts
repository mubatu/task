/// <reference types="@cloudflare/workers-types" />

import { describe, expect, it, vi } from "vitest";
import worker from "../worker/index";
import type { Env } from "../worker/lib/env";

const userId = "123e4567-e89b-42d3-a456-426614174000";

function createEnv() {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const assets = vi.fn(async () => new Response("<!doctype html>", { headers: { "Content-Type": "text/html" } }));
  const env = {
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
          first: async () => (sql.includes("FROM users") ? { id: userId, display_name: "Batu" } : null),
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
  it.each(["/", "/calendar", "/favicon.svg"])("serves %s from static assets", async (path) => {
    const { env, assets, statements } = createEnv();
    const response = await worker.fetch(apiRequest(path), env);

    expect(response.status).toBe(200);
    expect(assets).toHaveBeenCalledOnce();
    expect(statements).toHaveLength(0);
  });

  it("routes API calls to their handlers", async () => {
    const { env, assets } = createEnv();
    const response = await worker.fetch(apiRequest(`/api/items?userId=${userId}&status=active`), env);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ items: [] });
    expect(assets).not.toHaveBeenCalled();
  });

  it("returns a JSON 404 for unknown API paths", async () => {
    const { env, assets } = createEnv();

    for (const path of ["/api/missing", "/api/items/", "/api/items/a/b"]) {
      const response = await worker.fetch(apiRequest(path), env);
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

    const item = await worker.fetch(apiRequest(`/api/items/${userId}`), env);
    expect(item.status).toBe(405);
    expect(item.headers.get("Allow")).toBe("PATCH");
    expect(statements).toHaveLength(0);
  });

  it("turns handler errors into JSON responses", async () => {
    const { env } = createEnv();
    const response = await worker.fetch(apiRequest("/api/profile", { method: "POST", body: "not json" }), env);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "A valid JSON body is required." });
  });
});
