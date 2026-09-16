export type ItemType = "task" | "reminder";
export type ItemStatus = "active" | "completed";

export interface UserProfile {
  id: string;
  displayName: string;
}

export interface Item {
  id: string;
  userId: string;
  type: ItemType;
  title: string;
  details: string;
  taskDate: string | null;
  remindAt: number | null;
  status: ItemStatus;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export interface ItemsResponse {
  serverTime: string;
  items: Item[];
}

export interface CreateItemRequest {
  userId: string;
  type: ItemType;
  title: string;
  details?: string;
  taskDate?: string | null;
  remindAt?: number | null;
}

export interface UpdateItemStatusRequest {
  userId: string;
  status: ItemStatus;
}

export interface ApiError {
  error: string;
}
