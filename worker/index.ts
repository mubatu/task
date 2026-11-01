import type { Env } from "./lib/env";
import { handleError, HttpError, json } from "./lib/http";
import { patchItem } from "./routes/item";
import { getItems, postItem } from "./routes/items";
import { postProfile } from "./routes/profile";

type PublicHandler = (request: Request, env: Env) => Promise<Response>;

interface Route {
  method: string;
  // Segments starting with ":" match any single non-empty path segment.
  path: string;
  public: true;
  handler: PublicHandler;
}

const ROUTES: Route[] = [
  { method: "POST", path: "/api/profile", public: true, handler: postProfile },
  { method: "GET", path: "/api/items", public: true, handler: getItems },
  { method: "POST", path: "/api/items", public: true, handler: postItem },
  { method: "PATCH", path: "/api/items/:id", public: true, handler: patchItem },
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

    return await route.handler(request, env);
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
