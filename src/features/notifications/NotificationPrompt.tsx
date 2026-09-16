import { useEffect, useState } from "react";
import { BellIcon } from "../../components/Icons";
import "../../styles/notifications.css";

export function NotificationPrompt() {
  const supported = "Notification" in window && "serviceWorker" in navigator;
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    supported ? Notification.permission : "denied",
  );
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/service-worker.js").catch(() => undefined);
    }
  }, []);

  if (!supported || permission === "granted") return null;

  async function requestPermission() {
    setPending(true);
    try {
      setPermission(await Notification.requestPermission());
    } finally {
      setPending(false);
    }
  }

  return (
    <aside className={permission === "denied" ? "notification-prompt notification-prompt--muted" : "notification-prompt"}>
      <span className="notification-icon"><BellIcon /></span>
      <div>
        <strong>{permission === "denied" ? "Bildirimler kapalı" : "Reminder'ları kaçırmayın"}</strong>
        <p>{permission === "denied" ? "İzin tarayıcı ayarlarından açılabilir. Uygulama içi uyarılar çalışmaya devam eder." : "Bu site açıkken zamanı gelen reminder'lar için cihaz bildirimi alın."}</p>
      </div>
      {permission !== "denied" && (
        <button type="button" disabled={pending} onClick={requestPermission}>{pending ? "Açılıyor…" : "Bildirimleri aç"}</button>
      )}
    </aside>
  );
}
