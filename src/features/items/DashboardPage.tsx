import type { Item } from "../../../shared/contracts";
import { PlusIcon } from "../../components/Icons";
import { todayKey } from "../../lib/dateTime";
import { groupActiveItems } from "./itemGroups";
import { ItemCard } from "./ItemCard";

interface DashboardPageProps {
  items: Item[];
  nowMs: number;
  loading: boolean;
  error: string | null;
  pendingItemId: string | null;
  onAdd: () => void;
  onComplete: (item: Item) => void;
  onRetry: () => void;
}

export function DashboardPage({
  items,
  nowMs,
  loading,
  error,
  pendingItemId,
  onAdd,
  onComplete,
  onRetry,
}: DashboardPageProps) {
  const currentDateKey = todayKey(nowMs);
  const groups = groupActiveItems(items, nowMs, currentDateKey);
  const datedCount = groups.overdue.length + groups.today.length + groups.upcoming.length;

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <p className="eyebrow">GÜNÜNÜN KONTROLÜ SENDE</p>
          <h1>Task'larım</h1>
          <p>{items.length === 0 ? "Temiz bir sayfa." : `${items.length} aktif kayıt · ${datedCount} tarihli`}</p>
        </div>
        <button className="button button--primary desktop-add" type="button" onClick={onAdd}><PlusIcon /> Yeni ekle</button>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>Tekrar dene</button>
        </div>
      )}

      {loading ? (
        <div className="loading-grid" aria-label="Yükleniyor">
          <div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-mark">✓</span>
          <h2>Şimdilik her şey tamam</h2>
          <p>Yeni bir task veya reminder ekleyerek başlayın.</p>
          <button className="button button--primary" type="button" onClick={onAdd}><PlusIcon /> İlk kaydı ekle</button>
        </div>
      ) : (
        <div className="dashboard-sections">
          {groups.overdue.length > 0 && (
            <ItemSection title="Vakti gelenler" count={groups.overdue.length} tone="danger">
              {groups.overdue.map((item) => <ItemCard key={item.id} item={item} overdue pending={pendingItemId === item.id} onAction={onComplete} />)}
            </ItemSection>
          )}
          {groups.today.length > 0 && (
            <ItemSection title="Bugün" count={groups.today.length}>
              {groups.today.map((item) => <ItemCard key={item.id} item={item} pending={pendingItemId === item.id} onAction={onComplete} />)}
            </ItemSection>
          )}
          {groups.upcoming.length > 0 && (
            <ItemSection title="Yaklaşanlar" count={groups.upcoming.length}>
              {groups.upcoming.map((item) => <ItemCard key={item.id} item={item} pending={pendingItemId === item.id} onAction={onComplete} />)}
            </ItemSection>
          )}
          {groups.unscheduled.length > 0 && (
            <ItemSection title="Tarihsiz" count={groups.unscheduled.length}>
              {groups.unscheduled.map((item) => <ItemCard key={item.id} item={item} pending={pendingItemId === item.id} onAction={onComplete} />)}
            </ItemSection>
          )}
        </div>
      )}
    </div>
  );
}

function ItemSection({ title, count, tone, children }: { title: string; count: number; tone?: "danger"; children: React.ReactNode }) {
  return (
    <section className={tone === "danger" ? "item-section item-section--danger" : "item-section"}>
      <header><h2>{title}</h2><span>{count}</span></header>
      <div className="item-list">{children}</div>
    </section>
  );
}
