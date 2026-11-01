import { useCallback, useEffect, useRef, useState } from "react";
import type { CreateItemRequest, Item, ItemStatus, UpdateItemRequest, UserProfile } from "../../../shared/contracts";
import { createItem, getItems, isUnauthorized, updateItem, updateItemStatus } from "../../lib/api";

export function useItems(profile: UserProfile | null, onUnauthorized: () => void) {
  const [activeItems, setActiveItems] = useState<Item[]>([]);
  const [completedItems, setCompletedItems] = useState<Item[]>([]);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Kept in a ref so a new callback identity does not re-trigger the fetch effect.
  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  // Any data request that comes back 401 means the session ended; drop back to sign-in.
  const signOutOnUnauthorized = useCallback(<T,>(promise: Promise<T>): Promise<T> =>
    promise.catch((requestError: unknown) => {
      if (isUnauthorized(requestError)) onUnauthorizedRef.current();
      throw requestError;
    }), []);

  const refresh = useCallback(async (quiet = false) => {
    if (!profile) return;
    if (!quiet) setLoading(true);
    try {
      const requestStartedAt = Date.now();
      const [activeResponse, completedResponse] = await Promise.all([
        getItems("active"),
        getItems("completed"),
      ]);
      const requestFinishedAt = Date.now();
      const midpoint = requestStartedAt + (requestFinishedAt - requestStartedAt) / 2;
      setServerOffsetMs(new Date(activeResponse.serverTime).getTime() - midpoint);
      setActiveItems(activeResponse.items);
      setCompletedItems(completedResponse.items);
      setError(null);
    } catch (requestError) {
      if (isUnauthorized(requestError)) {
        onUnauthorizedRef.current();
        return;
      }
      setError(requestError instanceof Error ? requestError.message : "Veriler yüklenemedi.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) {
      setActiveItems([]);
      setCompletedItems([]);
      return;
    }
    void refresh();
  }, [profile, refresh]);

  useEffect(() => {
    if (!profile) return;
    const handleRefresh = () => void refresh(true);
    window.addEventListener("focus", handleRefresh);
    window.addEventListener("online", handleRefresh);
    document.addEventListener("visibilitychange", handleRefresh);
    return () => {
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("online", handleRefresh);
      document.removeEventListener("visibilitychange", handleRefresh);
    };
  }, [profile, refresh]);

  const addItem = useCallback(async (input: CreateItemRequest) => {
    if (!profile) throw new Error("Profil bulunamadı.");
    const item = await signOutOnUnauthorized(createItem(input));
    setActiveItems((current) => [...current, item]);
    return item;
  }, [profile, signOutOnUnauthorized]);

  const setStatus = useCallback(async (item: Item, status: ItemStatus) => {
    if (!profile) throw new Error("Profil bulunamadı.");
    const updated = await signOutOnUnauthorized(updateItemStatus(item.id, status));
    if (status === "completed") {
      setActiveItems((current) => current.filter((entry) => entry.id !== item.id));
      setCompletedItems((current) => [updated, ...current]);
    } else {
      setCompletedItems((current) => current.filter((entry) => entry.id !== item.id));
      setActiveItems((current) => [...current, updated]);
    }
    return updated;
  }, [profile, signOutOnUnauthorized]);

  const editItem = useCallback(async (item: Item, input: UpdateItemRequest) => {
    if (!profile) throw new Error("Profil bulunamadı.");
    const updated = await signOutOnUnauthorized(updateItem(item.id, input));
    setActiveItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
    setCompletedItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
    return updated;
  }, [profile, signOutOnUnauthorized]);

  return {
    activeItems,
    completedItems,
    serverOffsetMs,
    loading,
    error,
    refresh,
    addItem,
    editItem,
    setStatus,
  };
}
