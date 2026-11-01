export type ItemType = "task" | "reminder";
export type ItemStatus = "active" | "completed";

export interface UserProfile {
  id: string;
  displayName: string;
}

export interface AuthSessionResponse {
  user: UserProfile | null;
  googleClientId: string | null;
}

export type ProfileSetupMode = "create" | "claim";

export interface GoogleSignInRequest {
  credential: string;
  profile?: { mode: ProfileSetupMode; name: string };
}

export type GoogleSignInResponse =
  | { status: "signed_in"; user: UserProfile }
  | { status: "needs_profile"; suggestedName: string };

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
  type: ItemType;
  title: string;
  details?: string;
  taskDate?: string | null;
  remindAt?: number | null;
}

export interface UpdateItemStatusRequest {
  status: ItemStatus;
}

export type UpdateItemRequest = Omit<CreateItemRequest, "type">;

export interface ApiError {
  error: string;
}
