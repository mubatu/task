import type { ReactNode } from "react";
import type { UserProfile } from "../../shared/contracts";
import type { AppRoute } from "../lib/navigation";
import { CalendarIcon, CheckIcon, HomeIcon, PlusIcon, UserIcon, WifiOffIcon } from "./Icons";
import "../styles/shell.css";

interface AppShellProps {
  profile: UserProfile;
  route: AppRoute;
  online: boolean;
  onNavigate: (route: AppRoute) => void;
  onAdd: () => void;
  onLogout: () => void;
  children: ReactNode;
}

const navItems: Array<{ route: AppRoute; label: string; icon: typeof HomeIcon }> = [
  { route: "/", label: "Task'larım", icon: HomeIcon },
  { route: "/calendar", label: "Takvim", icon: CalendarIcon },
  { route: "/completed", label: "Tamamlananlar", icon: CheckIcon },
];

export function AppShell({
  profile,
  route,
  online,
  onNavigate,
  onAdd,
  onLogout,
  children,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" type="button" onClick={() => onNavigate("/")} aria-label="Ana sayfa">
          <span className="brand-mark"><CheckIcon /></span>
          <span>Odak</span>
        </button>
        <nav className="desktop-nav" aria-label="Ana menü">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.route}
                className={route === item.route ? "nav-item nav-item--active" : "nav-item"}
                type="button"
                onClick={() => onNavigate(item.route)}
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-profile">
          <span className="profile-avatar"><UserIcon /></span>
          <div>
            <strong>{profile.displayName}</strong>
            <button type="button" onClick={onLogout}>Kullanıcı değiştir</button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {!online && (
          <div className="offline-banner" role="status">
            <WifiOffIcon /> Çevrimdışısınız. Değişiklikler bağlantı gelince yapılabilir.
          </div>
        )}
        <header className="mobile-header">
          <button className="brand" type="button" onClick={() => onNavigate("/")} aria-label="Ana sayfa">
            <span className="brand-mark"><CheckIcon /></span>
            <span>Odak</span>
          </button>
          <button className="mobile-profile" type="button" onClick={onLogout} aria-label="Kullanıcı değiştir">
            {profile.displayName.charAt(0).toLocaleUpperCase("tr-TR")}
          </button>
        </header>
        {children}
      </main>

      <button className="floating-add" type="button" onClick={onAdd} aria-label="Yeni ekle">
        <PlusIcon />
      </button>

      <nav className="mobile-nav" aria-label="Ana menü">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.route}
              className={route === item.route ? "mobile-nav-item mobile-nav-item--active" : "mobile-nav-item"}
              type="button"
              onClick={() => onNavigate(item.route)}
            >
              <Icon />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
