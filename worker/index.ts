import { getSessionUser, type SessionUser } from "./lib/auth";
import type { Env } from "./lib/env";
import { handleError, HttpError, json } from "./lib/http";
import { getAuthSession, postGoogleSignIn, postLogout } from "./routes/auth";
import { patchItem } from "./routes/item";
import { getItems, postItem } from "./routes/items";

type PublicHandler = (request: Request, env: Env) => Promise<Response>;
type SignedInHandler = (request: Request, env: Env, user: SessionUser) => Promise<Response>;

// Segments of `path` starting with ":" match any single non-empty path segment.
type Route = { method: string; path: string } & (
  | { public: true; handler: PublicHandler }
  | { public?: false; handler: SignedInHandler }
);

const ROUTES: Route[] = [
  { method: "GET", path: "/api/auth/session", public: true, handler: getAuthSession },
  { method: "POST", path: "/api/auth/google", public: true, handler: postGoogleSignIn },
  { method: "POST", path: "/api/auth/logout", public: true, handler: postLogout },
  { method: "GET", path: "/api/items", handler: getItems },
  { method: "POST", path: "/api/items", handler: postItem },
  { method: "PATCH", path: "/api/items/:id", handler: patchItem },
];

function matchesPath(pattern: string, pathname: string): boolean {
  const patternParts = pattern.split("/");
  const pathParts = pathname.split("/");
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every((part, index) =>
    part.startsWith(":") ? pathParts[index] !== "" : part === pathParts[index],
  );
}

export async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const method = request.method;

    // The session cookie is SameSite=Lax; also reject cross-site writes outright.
    if (method !== "GET" && method !== "HEAD") {
      const origin = request.headers.get("Origin");
      if (origin && origin !== url.origin) {
        throw new HttpError(403, "Cross-site requests are not allowed.");
      }
    }

    const pathRoutes = ROUTES.filter((route) => matchesPath(route.path, url.pathname));
    if (pathRoutes.length === 0) throw new HttpError(404, "Not found.");

    const route = pathRoutes.find((candidate) => candidate.method === method);
    if (!route) {
      return json(
        { error: "Method not allowed." },
        {
          status: 405,
          headers: { Allow: pathRoutes.map((candidate) => candidate.method).join(", ") },
        },
      );
    }

    if (route.public) return await route.handler(request, env);

    const user = await getSessionUser(env, request);
    if (!user) throw new HttpError(401, "Sign in to continue.");
    return await route.handler(request, env, user);
  } catch (error) {
    return handleError(error);
  }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    // wrangler.toml routes /api/* here first; everything else is a static asset.
    const { pathname } = new URL(request.url);
    return pathname.startsWith("/api/")
      ? handleApiRequest(request, env)
      : env.ASSETS.fetch(request);
  },
};
