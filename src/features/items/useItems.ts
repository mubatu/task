import { useCallback, useEffect, useState } from "react";
import type { CreateItemRequest, Item, ItemStatus, UserProfile } from "../../../shared/contracts";
import { createItem, getItems, updateItemStatus } from "../../lib/api";

export function useItems(profile: UserProfile | null) {
  const [activeItems, setActiveItems] = useState<Item[]>([]);
  const [completedItems, setCompletedItems] = useState<Item[]>([]);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (quiet = false) => {
    if (!profile) return;
    if (!quiet) setLoading(true);
    try {
      const requestStartedAt = Date.now();
      const [activeResponse, completedResponse] = await Promise.all([
        getItems(profile.id, "active"),
        getItems(profile.id, "completed"),
      ]);
      const requestFinishedAt = Date.now();
      const midpoint = requestStartedAt + (requestFinishedAt - requestStartedAt) / 2;
      setServerOffsetMs(new Date(activeResponse.serverTime).getTime() - midpoint);
      setActiveItems(activeResponse.items);
      setCompletedItems(completedResponse.items);
      setError(null);
    } catch (requestError) {
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

  const addItem = useCallback(async (input: Omit<CreateItemRequest, "userId">) => {
    if (!profile) throw new Error("Profil bulunamadı.");
    const item = await createItem({ ...input, userId: profile.id });
    setActiveItems((current) => [...current, item]);
    return item;
  }, [profile]);

  const setStatus = useCallback(async (item: Item, status: ItemStatus) => {
    if (!profile) throw new Error("Profil bulunamadı.");
    const updated = await updateItemStatus(profile.id, item.id, status);
    if (status === "completed") {
      setActiveItems((current) => current.filter((entry) => entry.id !== item.id));
      setCompletedItems((current) => [updated, ...current]);
    } else {
      setCompletedItems((current) => current.filter((entry) => entry.id !== item.id));
      setActiveItems((current) => [...current, updated]);
    }
    return updated;
  }, [profile]);

  return {
    activeItems,
    completedItems,
    serverOffsetMs,
    loading,
    error,
    refresh,
    addItem,
    setStatus,
  };
}
