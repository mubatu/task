import type {
  ApiError,
  CreateItemRequest,
  Item,
  ItemsResponse,
  ItemStatus,
  UpdateItemRequest,
  UserProfile,
} from "../../shared/contracts";

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
    throw new Error(
      typeof body === "object" && body !== null && "error" in body
        ? body.error
        : "İşlem tamamlanamadı.",
    );
  }
  return body as T;
}

export function openProfile(name: string): Promise<UserProfile> {
  return request<UserProfile>("/api/profile", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function getItems(userId: string, status: ItemStatus): Promise<ItemsResponse> {
  const params = new URLSearchParams({ userId, status });
  return request<ItemsResponse>(`/api/items?${params}`);
}

export function createItem(input: CreateItemRequest): Promise<Item> {
  return request<Item>("/api/items", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateItemStatus(
  userId: string,
  itemId: string,
  status: ItemStatus,
): Promise<Item> {
  return request<Item>(`/api/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ userId, status }),
  });
}

export function updateItem(itemId: string, input: UpdateItemRequest): Promise<Item> {
  return request<Item>(`/api/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
