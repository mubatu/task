import type { UserProfile } from "../../../shared/contracts";

const STORAGE_KEY = "task-dashboard.profile.v1";

export function loadProfile(): UserProfile | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<UserProfile>;
    return typeof parsed.id === "string" && typeof parsed.displayName === "string"
      ? { id: parsed.id, displayName: parsed.displayName }
      : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  localStorage.removeItem(STORAGE_KEY);
}
