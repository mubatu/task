import { useCallback, useEffect, useMemo, useState } from "react";
import type { Item, UserProfile } from "../shared/contracts";
import { AppShell } from "./components/AppShell";
import { CalendarPage } from "./features/calendar/CalendarPage";
import { LoginPage } from "./features/auth/LoginPage";
import { CompletedPage } from "./features/items/CompletedPage";
import { DashboardPage } from "./features/items/DashboardPage";
import { ItemFormDialog } from "./features/items/ItemFormDialog";
import { useItems } from "./features/items/useItems";
import { NotificationPrompt } from "./features/notifications/NotificationPrompt";
import { ReminderDialog } from "./features/notifications/ReminderDialog";
import { useReminderAlerts } from "./features/notifications/useReminderAlerts";
import { getSession, isUnauthorized, signOut } from "./lib/api";
import { disableGoogleAutoSelect } from "./lib/googleIdentity";
import { useNavigation } from "./lib/navigation";
import { useWebMcp } from "./lib/useWebMcp";

export function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [form, setForm] = useState<{ item?: Item } | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [clockMs, setClockMs] = useState(Date.now());
  const { route, navigate } = useNavigation();
  const clearSignedInState = useCallback(() => {
    setProfile(null);
    setForm(null);
    navigate("/");
  }, [navigate]);
  const items = useItems(profile, clearSignedInState);
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

  const loadSession = useCallback(async () => {
    setSessionError(null);
    try {
      const session = await getSession();
      setGoogleClientId(session.googleClientId);
      setProfile(session.user);
      setSessionChecked(true);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Sunucuya ulaşılamadı.");
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  async function handleLogout() {
    try {
      await signOut();
    } catch {
      // The session cookie expires on its own; still leave the signed-in view.
    }
    disableGoogleAutoSelect();
    clearSignedInState();
  }

  async function changeStatus(item: Item, status: "active" | "completed") {
    setPendingItemId(item.id);
    setMutationError(null);
    try {
      await items.setStatus(item, status);
      if (alerts.currentAlert?.id === item.id) alerts.dismissCurrent();
    } catch (error) {
      // useItems already returned to the sign-in screen; a toast would only resurface after sign-in.
      if (isUnauthorized(error)) return;
      setMutationError(error instanceof Error ? error.message : "Değişiklik kaydedilemedi.");
    } finally {
      setPendingItemId(null);
    }
  }

  if (!sessionChecked) {
    return (
      <main className="session-check">
        {sessionError ? (
          <div role="alert">
            <p className="form-error">{sessionError}</p>
            <button type="button" onClick={() => void loadSession()}>Tekrar dene</button>
          </div>
        ) : (
          <p aria-live="polite">Yükleniyor…</p>
        )}
      </main>
    );
  }

  if (!profile) return <LoginPage googleClientId={googleClientId} onLogin={setProfile} />;

  return (
    <AppShell
      profile={profile}
      route={route}
      online={online}
      onNavigate={navigate}
      onAdd={() => setForm({})}
      onLogout={() => void handleLogout()}
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
          onAdd={() => setForm({})}
          onEdit={(item) => setForm({ item })}
          onComplete={(item) => void changeStatus(item, "completed")}
          onRetry={() => void items.refresh()}
        />
      )}
      {route === "/calendar" && (
        <CalendarPage
          items={items.activeItems}
          nowMs={serverNowMs}
          pendingItemId={pendingItemId}
          onAdd={() => setForm({})}
          onEdit={(item) => setForm({ item })}
          onComplete={(item) => void changeStatus(item, "completed")}
        />
      )}
      {route === "/completed" && (
        <CompletedPage
          items={items.completedItems}
          loading={items.loading}
          pendingItemId={pendingItemId}
          onEdit={(item) => setForm({ item })}
          onRestore={(item) => void changeStatus(item, "active")}
        />
      )}

      {form && (
        <ItemFormDialog
          key={form.item?.id ?? "new"}
          item={form.item}
          onClose={() => setForm(null)}
          onSave={({ type, ...input }) => form.item
            ? items.editItem(form.item, input)
            : items.addItem({ type, ...input })}
        />
      )}
      {!form && alerts.currentAlert && (
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
