import type {
  ApiError,
  AuthSessionResponse,
  CreateItemRequest,
  GoogleSignInRequest,
  GoogleSignInResponse,
  Item,
  ItemsResponse,
  ItemStatus,
  UpdateItemRequest,
} from "../../shared/contracts";

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 401;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = (await response.json()) as T | ApiError;
  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      typeof body === "object" && body !== null && "error" in body
        ? body.error
        : "İşlem tamamlanamadı.",
    );
  }
  return body as T;
}

export function getSession(): Promise<AuthSessionResponse> {
  return request<AuthSessionResponse>("/api/auth/session");
}

export function signInWithGoogle(input: GoogleSignInRequest): Promise<GoogleSignInResponse> {
  return request<GoogleSignInResponse>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function signOut(): Promise<{ ok: true }> {
  return request<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

export function getItems(status: ItemStatus): Promise<ItemsResponse> {
  const params = new URLSearchParams({ status });
  return request<ItemsResponse>(`/api/items?${params}`);
}

export function createItem(input: CreateItemRequest): Promise<Item> {
  return request<Item>("/api/items", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateItemStatus(itemId: string, status: ItemStatus): Promise<Item> {
  return request<Item>(`/api/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function updateItem(itemId: string, input: UpdateItemRequest): Promise<Item> {
  return request<Item>(`/api/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
