import type { Item } from "../../../shared/contracts";
import { ItemCard } from "./ItemCard";

interface CompletedPageProps {
  items: Item[];
  loading: boolean;
  pendingItemId: string | null;
  onRestore: (item: Item) => void;
  onEdit: (item: Item) => void;
}

export function CompletedPage({ items, loading, pendingItemId, onRestore, onEdit }: CompletedPageProps) {
  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <p className="eyebrow">ARŞİV</p>
          <h1>Tamamlananlar</h1>
          <p>{items.length} tamamlanmış kayıt</p>
        </div>
      </header>
      {loading ? (
        <div className="loading-grid"><div className="skeleton" /><div className="skeleton" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state compact-empty">
          <span className="empty-mark">✓</span>
          <h2>Henüz tamamlanan yok</h2>
          <p>Tamamladığınız kayıtlar burada birikir.</p>
        </div>
      ) : (
        <div className="item-list completed-list">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              actionLabel="Geri al"
              pending={pendingItemId === item.id}
              onEdit={onEdit}
              onAction={onRestore}
            />
          ))}
        </div>
      )}
    </div>
  );
}
