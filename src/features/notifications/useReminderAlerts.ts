import { useCallback, useEffect, useRef, useState } from "react";
import type { Item } from "../../../shared/contracts";

const SESSION_KEY = "task-dashboard.alerts.v1";

function loadAlertedKeys(): Set<string> {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    return new Set(value ? (JSON.parse(value) as string[]) : []);
  } catch {
    return new Set();
  }
}

function notificationKey(item: Item): string {
  return `${item.id}:${item.updatedAt}`;
}

async function showSystemNotification(item: Item): Promise<void> {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const options: NotificationOptions = {
    body: item.details || "Reminder zamanı geldi.",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: notificationKey(item),
  };
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(item.title, options);
    return;
  }
  new Notification(item.title, options);
}

export function useReminderAlerts(items: Item[], serverOffsetMs: number) {
  const [pendingAlerts, setPendingAlerts] = useState<Item[]>([]);
  const alertedKeys = useRef(loadAlertedKeys());

  const checkDueItems = useCallback(() => {
    const nowMs = Date.now() + serverOffsetMs;
    const dueItems = items
      .filter((item) => item.type === "reminder" && item.remindAt !== null && item.remindAt <= nowMs)
      .filter((item) => !alertedKeys.current.has(notificationKey(item)))
      .sort((first, second) => (first.remindAt ?? 0) - (second.remindAt ?? 0));
    if (dueItems.length === 0) return;

    for (const item of dueItems) {
      alertedKeys.current.add(notificationKey(item));
      void showSystemNotification(item).catch(() => undefined);
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...alertedKeys.current]));
    setPendingAlerts((current) => {
      const knownIds = new Set(current.map((item) => item.id));
      return [...current, ...dueItems.filter((item) => !knownIds.has(item.id))];
    });
  }, [items, serverOffsetMs]);

  useEffect(() => {
    checkDueItems();
    const interval = window.setInterval(checkDueItems, 30_000);
    const handleActivity = () => checkDueItems();
    window.addEventListener("focus", handleActivity);
    window.addEventListener("online", handleActivity);
    document.addEventListener("visibilitychange", handleActivity);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleActivity);
      window.removeEventListener("online", handleActivity);
      document.removeEventListener("visibilitychange", handleActivity);
    };
  }, [checkDueItems]);

  useEffect(() => {
    const activeIds = new Set(items.map((item) => item.id));
    setPendingAlerts((current) => current.filter((item) => activeIds.has(item.id)));
  }, [items]);

  const dismissCurrent = useCallback(() => {
    setPendingAlerts((current) => current.slice(1));
  }, []);

  return { currentAlert: pendingAlerts[0] ?? null, alertCount: pendingAlerts.length, dismissCurrent };
}
