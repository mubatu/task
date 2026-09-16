import { useEffect, useMemo, useState } from "react";
import type { Item, UserProfile } from "../shared/contracts";
import { AppShell } from "./components/AppShell";
import { CalendarPage } from "./features/calendar/CalendarPage";
import { LoginPage } from "./features/auth/LoginPage";
import { clearProfile, loadProfile, saveProfile } from "./features/auth/profileStorage";
import { CompletedPage } from "./features/items/CompletedPage";
import { DashboardPage } from "./features/items/DashboardPage";
import { ItemFormDialog } from "./features/items/ItemFormDialog";
import { useItems } from "./features/items/useItems";
import { NotificationPrompt } from "./features/notifications/NotificationPrompt";
import { ReminderDialog } from "./features/notifications/ReminderDialog";
import { useReminderAlerts } from "./features/notifications/useReminderAlerts";
import { useNavigation } from "./lib/navigation";
import { useWebMcp } from "./lib/useWebMcp";

export function App() {
  const [profile, setProfile] = useState<UserProfile | null>(loadProfile);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [clockMs, setClockMs] = useState(Date.now());
  const { route, navigate } = useNavigation();
  const items = useItems(profile);
  useWebMcp(items.activeItems, items.addItem);
  const serverNowMs = useMemo(() => clockMs + items.serverOffsetMs, [clockMs, items.serverOffsetMs]);
  const alerts = useReminderAlerts(items.activeItems, items.serverOffsetMs);

  useEffect(() => {
    const interval = window.setInterval(() => setClockMs(Date.now()), 15_000);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  function handleLogin(nextProfile: UserProfile) {
    saveProfile(nextProfile);
    setProfile(nextProfile);
  }

  function handleLogout() {
    clearProfile();
    setProfile(null);
    navigate("/");
  }

  async function changeStatus(item: Item, status: "active" | "completed") {
    setPendingItemId(item.id);
    setMutationError(null);
    try {
      await items.setStatus(item, status);
      if (alerts.currentAlert?.id === item.id) alerts.dismissCurrent();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "Değişiklik kaydedilemedi.");
    } finally {
      setPendingItemId(null);
    }
  }

  if (!profile) return <LoginPage onLogin={handleLogin} />;

  return (
    <AppShell
      profile={profile}
      route={route}
      online={online}
      onNavigate={navigate}
      onAdd={() => setFormOpen(true)}
      onLogout={handleLogout}
    >
      <NotificationPrompt />
      {mutationError && (
        <div className="global-toast" role="alert">
          <span>{mutationError}</span>
          <button type="button" onClick={() => setMutationError(null)}>Kapat</button>
        </div>
      )}
      {route === "/" && (
        <DashboardPage
          items={items.activeItems}
          nowMs={serverNowMs}
          loading={items.loading}
          error={items.error}
          pendingItemId={pendingItemId}
          onAdd={() => setFormOpen(true)}
          onComplete={(item) => void changeStatus(item, "completed")}
          onRetry={() => void items.refresh()}
        />
      )}
      {route === "/calendar" && (
        <CalendarPage
          items={items.activeItems}
          nowMs={serverNowMs}
          pendingItemId={pendingItemId}
          onAdd={() => setFormOpen(true)}
          onComplete={(item) => void changeStatus(item, "completed")}
        />
      )}
      {route === "/completed" && (
        <CompletedPage
          items={items.completedItems}
          loading={items.loading}
          pendingItemId={pendingItemId}
          onRestore={(item) => void changeStatus(item, "active")}
        />
      )}

      {formOpen && <ItemFormDialog onClose={() => setFormOpen(false)} onCreate={items.addItem} />}
      {alerts.currentAlert && (
        <ReminderDialog
          item={alerts.currentAlert}
          remainingCount={alerts.alertCount}
          pending={pendingItemId === alerts.currentAlert.id}
          onComplete={(item) => void changeStatus(item, "completed")}
          onDismiss={alerts.dismissCurrent}
        />
      )}
    </AppShell>
  );
}
